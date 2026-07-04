// Play-by-play game viewer: replays ONE full game and prints every action the engine actually
// took, phase by phase, so you can read a whole match unfold and eyeball it against the real
// Dice Throne rules (does it play legally? are the mechanics right?). This is the "watch it play,
// don't just trust a winrate" trust tool (see project memory: pivot_ml).
//
// The engine already records every action into GameState.log via turn.ts's log() calls — this
// script just plays a game the same way match.ts does and renders that log grouped by turn, with
// both players' HP after each turn. Lookahead replays inside the learned policy clone the state
// WITHOUT its log (cloneForLookahead strips it), so the log shown here contains only REAL moves,
// never speculative ones.
//
// New, self-contained file — imports only already-exported pieces, modifies nothing the live
// training run re-reads.
//
// Run:
//   npx tsx src/sim/rl/replay.ts [--policy learned|greedy] [--weights latest|best|<path>] [--seed N] [--matchup hh-bw]
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GameState, HeroId, TurnLogEntry, Phase } from '../types.js'
import type { Policy } from '../policy.js'
import { greedyHighestDamagePolicy } from '../policy.js'
import { fromJSON } from './network.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { mulberry32 } from '../rng.js'
import { playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS } from '../match.js'

const RL_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEIGHTS_DIR = path.join(RL_DIR, 'weights')

interface Args {
  policy: 'learned' | 'greedy'
  weights: string
  seed: number
  matchup: [HeroId, HeroId]
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const weightsArg = get('--weights') ?? 'latest'
  const weights = weightsArg === 'best' ? path.join(WEIGHTS_DIR, 'best.json')
    : weightsArg === 'latest' ? path.join(WEIGHTS_DIR, 'latest.json')
    : weightsArg
  const [a, b] = (get('--matchup') ?? 'hh-bw').split('-') as HeroId[]
  return {
    policy: (get('--policy') as 'learned' | 'greedy') ?? 'learned',
    weights,
    seed: Number(get('--seed') ?? 42),
    matchup: [a, b],
  }
}

// Loads the learned policy from --weights (best -> latest fallback), or the scripted greedy
// baseline (no weights needed). Greedy is useful as a simpler, deterministic reference to
// eyeball the rules against; learned shows what the trained AI actually does.
function buildPolicy(args: Args): { policy: Policy; label: string } {
  if (args.policy === 'greedy') {
    return { policy: greedyHighestDamagePolicy, label: 'greedy (scripted baseline)' }
  }
  const fallback = path.join(WEIGHTS_DIR, 'latest.json')
  const chosen = fs.existsSync(args.weights) ? args.weights : fs.existsSync(fallback) ? fallback : null
  if (!chosen) throw new Error(`No weights at ${args.weights} (or ${fallback}). Train first, or use --policy greedy.`)
  const net = fromJSON(fs.readFileSync(chosen, 'utf-8'))
  return { policy: createValueGreedyPolicy(net), label: `learned (${path.relative(process.cwd(), chosen)})` }
}

interface TurnRecord {
  turn: number
  activeIdx: 0 | 1
  heroId: HeroId
  entries: TurnLogEntry[]
  hp: [number, number]
}

const PHASE_LABEL: Record<Phase, string> = {
  upkeep: 'upkeep', income: 'income', main1: 'main-1', roll: 'roll',
  resolveAttack: 'attack', defense: 'defense', main2: 'main-2',
  discard: 'discard', endOfTurn: 'end',
}

function playAndRecord(policy: Policy, heroA: HeroId, heroB: HeroId, seed: number): { turns: TurnRecord[]; state: GameState } {
  const rng = mulberry32(seed)
  const state = createInitialGameState(heroA, heroB, rng)
  const policies: [Policy, Policy] = [policy, policy]
  const turns: TurnRecord[] = []

  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    const logStart = state.log.length
    playTurn(state, activeIdx, rng, policies)
    turns.push({
      turn: state.turnNumber,
      activeIdx,
      heroId: state.players[activeIdx].heroId,
      entries: state.log.slice(logStart),
      hp: [state.players[0].hp, state.players[1].hp],
    })
    if (state.gameOver) break
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }
  return { turns, state }
}

function render(turns: TurnRecord[], state: GameState, heroA: HeroId, heroB: HeroId, seed: number, policyLabel: string): void {
  console.log(`=== REPLAY: ${heroA}(p0) vs ${heroB}(p1) — seed ${seed}, policy=${policyLabel} ===`)
  for (const t of turns) {
    console.log('')
    console.log(`──────── Turn ${t.turn} — p${t.activeIdx} (${t.heroId}) ────────`)
    for (const e of t.entries) {
      // Most entries belong to the active player; defense entries belong to the DEFENDER (the
      // other player reacting to the attack) — tag those so whose action it is stays unambiguous.
      const tag = e.playerIdx === t.activeIdx ? '' : `[p${e.playerIdx} reacts] `
      console.log(`  ${PHASE_LABEL[e.phase].padEnd(8)} ${tag}${e.message}`)
    }
    console.log(`  ── HP after: p0(${heroA}) ${t.hp[0]}  |  p1(${heroB}) ${t.hp[1]}`)
  }

  console.log('')
  if (state.winner === 0 || state.winner === 1) {
    const w = state.winner
    console.log(`=== RESULT: player ${w} (${w === 0 ? heroA : heroB}) WINS on turn ${state.turnNumber} ===`)
  } else if (state.gameOver) {
    console.log(`=== RESULT: DRAW (mutual kill — both players reduced to <=0 HP simultaneously) on turn ${state.turnNumber} ===`)
  } else {
    console.log(`=== RESULT: timeout at ${MAX_TURNS} turns (stalemate — neither player finished the other) ===`)
  }
  console.log(`Total turns: ${turns.length}. Read the phases above against the real rules to sanity-check legality/mechanics.`)
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const { policy, label } = buildPolicy(args)
  const { turns, state } = playAndRecord(policy, args.matchup[0], args.matchup[1], args.seed)
  render(turns, state, args.matchup[0], args.matchup[1], args.seed, label)
}

main()
