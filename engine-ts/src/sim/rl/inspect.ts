// Move-inspection tool: shows WHAT the learned value network recommends in a concrete game
// situation and WHY — the ranking of every legal ability candidate with its V(resulting state)
// score, not just an aggregate winrate. This is the "understand/validate the strategy, not a
// black box that wins" deliverable (see project memory: pivot_ml).
//
// Deliberately a NEW, self-contained file that imports only ALREADY-EXPORTED pure pieces and
// does NOT modify valueGreedyPolicy.ts / lookahead.ts / turn.ts. Reason: a training run may be
// live, and each fresh `npx tsx trainWorker.ts` round re-reads those files — editing them risks
// crashing an in-flight run. The ability-ranking closure below is a faithful copy of
// valueGreedyPolicy.chooseAbility's lookahead (damage-only, dice-independent approximation —
// see that file's header); keep the two in sync if either changes.
//
// Run:
//   npx tsx src/sim/rl/inspect.ts [--weights best|latest|<path>] [--seed N] [--matchup hh-bw] [--turn T]
//
// It plays one self-play game with the learned policy on both sides (reproducible from --seed),
// captures every ability decision, and prints the candidate ranking for one of them (the turn
// nearest --turn, or the most interesting multi-candidate decision by default).
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GameState, AbilityCandidate, HeroId, PlayerState } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON, forward } from './network.js'
import type { Network } from './network.js'
import { encodeState } from './features.js'
import { cloneForLookahead } from './lookahead.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { mulberry32 } from '../rng.js'
import { resolveDefense, playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS } from '../match.js'

const RL_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEIGHTS_DIR = path.join(RL_DIR, 'weights')

interface Args {
  weights: string
  seed: number
  matchup: [HeroId, HeroId]
  turn: number | null
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const weightsArg = get('--weights') ?? 'best'
  let weights: string
  if (weightsArg === 'best') weights = path.join(WEIGHTS_DIR, 'best.json')
  else if (weightsArg === 'latest') weights = path.join(WEIGHTS_DIR, 'latest.json')
  else weights = weightsArg

  const matchupArg = get('--matchup') ?? 'hh-bw'
  const [a, b] = matchupArg.split('-') as HeroId[]

  return {
    weights,
    seed: Number(get('--seed') ?? 42),
    matchup: [a, b],
    turn: get('--turn') != null ? Number(get('--turn')) : null,
  }
}

// Loads --weights, falling back best -> latest so `--weights best` still works before the first
// eval milestone has written best.json.
function loadNetwork(preferredPath: string): { net: Network; usedPath: string } {
  const fallback = path.join(WEIGHTS_DIR, 'latest.json')
  const chosen = fs.existsSync(preferredPath) ? preferredPath
    : fs.existsSync(fallback) ? fallback
    : null
  if (!chosen) {
    throw new Error(`No weights found at ${preferredPath} (or fallback ${fallback}). Train a network first.`)
  }
  return { net: fromJSON(fs.readFileSync(chosen, 'utf-8')), usedPath: chosen }
}

interface AbilityDecision {
  turn: number
  playerIdx: 0 | 1
  state: GameState // snapshot cloned at the moment of decision
  candidates: AbilityCandidate[]
  chosen: string // what the real learned policy picked in-game (sanity cross-check)
}

// Wraps the learned policy so every chooseAbility call is recorded (state snapshot + candidates
// + the choice the real policy made), while the game proceeds exactly as it normally would.
function captureAbilityDecisions(network: Network, heroA: HeroId, heroB: HeroId, seed: number): AbilityDecision[] {
  const base = createValueGreedyPolicy(network)
  const decisions: AbilityDecision[] = []
  const spy: Policy = {
    ...base,
    chooseAbility(state, playerIdx, candidates) {
      const chosen = base.chooseAbility(state, playerIdx, candidates)
      decisions.push({
        turn: state.turnNumber,
        playerIdx,
        state: cloneForLookahead(state),
        candidates: candidates.map(c => ({ ...c })),
        chosen,
      })
      return chosen
    },
  }

  const rng = mulberry32(seed)
  const state = createInitialGameState(heroA, heroB, rng)
  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    playTurn(state, activeIdx, rng, [spy, spy])
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }
  return decisions
}

interface RankedRow {
  cand: AbilityCandidate
  v: number
  oppHpBefore: number
  oppHpAfter: number
  selfHpBefore: number
  selfHpAfter: number
}

// Faithful copy of valueGreedyPolicy.chooseAbility's lookahead: for each candidate, clone the
// state, apply ONLY the damage/defense (the documented dice-independent v1 approximation — token
// grants and dice-dependent bonuses are intentionally ignored for ability RANKING), score the
// result with V(). Same per-decision seed across candidates as the real policy (seedFor(state,1)
// == turnNumber*7919+1) so the comparison is RNG-fair, matching in-game behavior exactly.
function rankAbilities(network: Network, playerIdx: 0 | 1, state: GameState, candidates: AbilityCandidate[]): RankedRow[] {
  const oppIdx = (1 - playerIdx) as 0 | 1
  const seed = (state.turnNumber * 7919 + 1) >>> 0
  const lookaheadPolicy = createValueGreedyPolicy(network) // only used for resolveDefense's nested policies
  const rows = candidates.map<RankedRow>(cand => {
    const clone = cloneForLookahead(state)
    const rng = mulberry32(seed)
    const oppHpBefore = clone.players[oppIdx].hp
    const selfHpBefore = clone.players[playerIdx].hp
    const dmg = cand.baseDamage ?? 0
    if (cand.defendable) {
      resolveDefense(clone, playerIdx, dmg, rng, [lookaheadPolicy, lookaheadPolicy])
    } else {
      clone.players[oppIdx].hp -= dmg
    }
    const v = forward(network, [encodeState(clone, playerIdx)])[0]
    return {
      cand, v,
      oppHpBefore, oppHpAfter: clone.players[oppIdx].hp,
      selfHpBefore, selfHpAfter: clone.players[playerIdx].hp,
    }
  })
  rows.sort((x, y) => y.v - x.v)
  return rows
}

function tokenSummary(p: PlayerState): string {
  const t = p.tokens
  if (p.heroId === 'hh') {
    return `dreadful ${t.dreadful}, grimPursuit ${t.grimPursuit}, head:${t.head > 0 ? 'yes' : 'no'}`
  }
  const tb = p.timeBombs.length > 0 ? `, TB@opp ${p.timeBombs.length}` : ''
  return `agility ${t.agility}, covertOps ${t.covertOps}${tb}`
}

function fmt(v: string | number, w: number): string {
  return String(v).padEnd(w)
}

function printDecision(d: AbilityDecision, rows: RankedRow[]): void {
  const self = d.state.players[d.playerIdx]
  const opp = d.state.players[(1 - d.playerIdx) as 0 | 1]
  console.log('')
  console.log(`=== Decision: turn ${d.turn}, player ${d.playerIdx} (${self.heroId}) attacking player ${1 - d.playerIdx} (${opp.heroId}) ===`)
  console.log(`  attacker: HP ${self.hp}, CP ${self.cp} | ${tokenSummary(self)}`)
  console.log(`  defender: HP ${opp.hp}, CP ${opp.cp} | ${tokenSummary(opp)}`)
  console.log(`  abilities this roll enabled: ${d.candidates.length} candidate(s)`)
  console.log('')
  console.log('  V = learned P(attacker wins) proxy in [-1,+1], from a damage-only lookahead (token/dice bonuses ignored for ranking).')
  console.log('')
  console.log(`  ${fmt('#', 4)}${fmt('ability', 30)}${fmt('dmg', 5)}${fmt('def', 5)}${fmt('V(after)', 11)}why (lookahead result)`)
  rows.forEach((r, i) => {
    const chosenMark = r.cand.name === d.chosen ? ' *' : '  '
    const dmg = r.cand.baseDamage ?? 0
    const oppDelta = `def HP ${r.oppHpBefore}→${r.oppHpAfter}`
    const selfDelta = r.selfHpAfter !== r.selfHpBefore ? `; atk HP ${r.selfHpBefore}→${r.selfHpAfter}` : ''
    console.log(
      `  ${fmt(`${i + 1}${chosenMark}`, 4)}${fmt(r.cand.name, 30)}${fmt(dmg, 5)}${fmt(r.cand.defendable ? 'Y' : 'N', 5)}${fmt(r.v.toFixed(4), 11)}${oppDelta}${selfDelta}`,
    )
  })
  console.log('')
  const top = rows[0]
  const agrees = top.cand.name === d.chosen
  console.log(`  policy chose in-game: ${d.chosen}`)
  console.log(`  ranking argmax:       ${top.cand.name} (V=${top.v.toFixed(4)}) ${agrees ? '✓ matches' : '✗ MISMATCH — reproduction drift, investigate'}`)
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const { net, usedPath } = loadNetwork(args.weights)
  console.log(`Weights: ${path.relative(process.cwd(), usedPath)}`)
  console.log(`Scenario: seed ${args.seed}, matchup ${args.matchup[0]}(p0) vs ${args.matchup[1]}(p1)`)

  const decisions = captureAbilityDecisions(net, args.matchup[0], args.matchup[1], args.seed)
  if (decisions.length === 0) {
    console.log('\nNo ability decisions were reached this game (every roll whiffed or the game ended early). Try another --seed.')
    return
  }

  // Index of every captured decision, so the user can re-run targeting a specific --turn.
  console.log(`\nCaptured ${decisions.length} ability decision(s) this game:`)
  decisions.forEach(d => {
    console.log(`  turn ${fmt(d.turn, 4)} p${d.playerIdx} (${d.state.players[d.playerIdx].heroId})  ${d.candidates.length} candidate(s)  chose: ${d.chosen}`)
  })

  // Pick which decision to detail: nearest to --turn if given, else the one with the most
  // candidates (the most interesting / non-forced choice), tie-broken toward the latest turn.
  let target: AbilityDecision
  if (args.turn != null) {
    target = decisions.reduce((best, d) =>
      Math.abs(d.turn - args.turn!) < Math.abs(best.turn - args.turn!) ? d : best)
  } else {
    target = decisions.reduce((best, d) =>
      d.candidates.length > best.candidates.length
        || (d.candidates.length === best.candidates.length && d.turn > best.turn) ? d : best)
  }

  const rows = rankAbilities(net, target.playerIdx, target.state, target.candidates)
  printDecision(target, rows)
  console.log('\n(Re-run with --turn <n> to inspect a different decision above, or --weights latest / --seed <n>.)')
}

main()
