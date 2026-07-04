// Stage 5 end-to-end validation. greedyHighestDamagePolicy never plays Action cards, so the Stage 5
// mechanics (Instants, cross-player token cards, So Wild!/Twice As Wild!, Grim Pursuit spend) are
// unit-tested in isolation but NEVER fire in a real self-play match. This script runs full games
// with an "exerciser" policy that AGGRESSIVELY plays every Stage 5 action it's offered, then checks
// (1) each mechanic actually fired end-to-end at least once, (2) no crash, (3) no invariant broken.
// It also dumps one full annotated game log per mechanic so the behaviour can be eyeballed.
//
// New, self-contained file — imports only already-exported pieces, modifies nothing.
// Run: npx tsx src/sim/validate-stage5.ts [gamesPerMatchup]
import type { GameState, HeroId, WindowAction, TurnLogEntry, Phase } from './types.js'
import type { Policy } from './policy.js'
import { greedyHighestDamagePolicy } from './policy.js'
import { mulberry32 } from './rng.js'
import { playTurn } from './turn.js'
import { createInitialGameState, MAX_TURNS } from './match.js'

// The Stage 5 WindowAction kinds we want to see exercised in real play.
const STAGE5_KINDS = new Set<WindowAction['kind']>([
  'playInstant', 'transferToken', 'removeToken', 'removeAllTokens', 'moveHead', 'setDie',
])

// Plays greedy's upgrades, but whenever a window offers a Stage 5 action, takes it (each play spends
// the card/CP/token, so the window still terminates). Always spends Grim Pursuit (mode b).
function makeExerciser(): Policy {
  return {
    ...greedyHighestDamagePolicy,
    chooseGrimPursuitSpend: () => true,
    decide(state, idx, request) {
      const s5 = request.options.find(o => STAGE5_KINDS.has(o.kind))
      if (s5) return s5
      return greedyHighestDamagePolicy.decide(state, idx, request)
    },
  }
}

// Each mechanic → a distinctive substring in the engine's log (the apply-fn log messages).
const COVERAGE: Record<string, string[]> = {
  'playInstant (Getting Paid!)': ['Getting Paid!'],
  'playInstant (Double/Triple Up!)': ['Double Up!', 'Triple Up!'],
  'playInstant (Dark Surprise! HH)': ['Dark Surprise!'],
  'playInstant (Assemble! BW)': ['Assemble!'],
  'playInstant (Dancing Pumpkin! HH)': ['Dancing Pumpkin!'],
  'playInstant (Vegas Baby!)': ['Vegas Baby!'],
  'transferToken (Transference!)': ['Transference!: moved'],
  'removeToken (Get That Outta Here!)': ['Get That Outta Here!: removed'],
  'removeAllTokens (What Status Effects?)': ['What Status Effects?: removed all'],
  'moveHead (Rolling Pumpkin!)': ['Rolling Pumpkin!: moved the Haunted Head'],
  'setDie (So Wild! / Twice As Wild!)': ['So Wild!: set dice', 'Twice As Wild!: set dice'],
  'Grim Pursuit spend (b)': ['Grim Pursuit spend (b): rolled'],
}

interface Invariant { seed: number; matchup: string; msg: string }

function checkInvariants(state: GameState, seed: number, matchup: string, out: Invariant[]): void {
  for (const p of state.players) {
    if (p.cp < 0) out.push({ seed, matchup, msg: `negative CP (${p.cp}) for ${p.heroId}` })
    if (p.hp > 10000 || p.hp < -10000) out.push({ seed, matchup, msg: `implausible HP (${p.hp})` })
    if (p.timeBombs.length > 2) out.push({ seed, matchup, msg: `Time Bomb cap exceeded (${p.timeBombs.length})` })
    if (p.tokens.dreadful > 5) out.push({ seed, matchup, msg: `Dreadful cap exceeded (${p.tokens.dreadful})` })
    if (p.tokens.grimPursuit > 3) out.push({ seed, matchup, msg: `Grim Pursuit cap exceeded (${p.tokens.grimPursuit})` })
    if (p.tokens.agility > 2) out.push({ seed, matchup, msg: `Agility cap exceeded (${p.tokens.agility})` })
  }
}

function playGame(heroA: HeroId, heroB: HeroId, seed: number): GameState {
  const rng = mulberry32(seed)
  const state = createInitialGameState(heroA, heroB, rng)
  const ex = makeExerciser()
  const policies: [Policy, Policy] = [ex, ex]
  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    playTurn(state, activeIdx, rng, policies)
    if (state.gameOver) break
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }
  return state
}

const PHASE_LABEL: Record<Phase, string> = {
  upkeep: 'upkeep', income: 'income', main1: 'main-1', roll: 'roll',
  resolveAttack: 'attack', defense: 'defense', main2: 'main-2', discard: 'discard', endOfTurn: 'end',
}

function dumpGame(state: GameState, heroA: HeroId, heroB: HeroId, seed: number, highlight: string[]): void {
  console.log(`\n──────── SAMPLE GAME: ${heroA}(p0) vs ${heroB}(p1), seed ${seed} ────────`)
  let lastTurn = -1
  for (const e of state.log as TurnLogEntry[]) {
    if (e.turn !== lastTurn) { console.log(`  ·· Turn ${e.turn} ··`); lastTurn = e.turn }
    const hot = highlight.some(h => e.message.includes(h)) ? ' ⭐' : ''
    console.log(`     ${PHASE_LABEL[e.phase].padEnd(8)} p${e.playerIdx} ${e.message}${hot}`)
  }
}

function main(): void {
  const perMatchup = Number(process.argv[2] ?? 40)
  const matchups: [HeroId, HeroId][] = [['hh', 'bw'], ['bw', 'hh'], ['hh', 'hh'], ['bw', 'bw']]

  const hits: Record<string, number> = Object.fromEntries(Object.keys(COVERAGE).map(k => [k, 0]))
  const invariants: Invariant[] = []
  const crashes: Invariant[] = []
  // Keep one sample game (its log) that fired the MOST distinct Stage 5 mechanics, for eyeballing.
  let best: { state: GameState; a: HeroId; b: HeroId; seed: number; distinct: number } | null = null
  let games = 0, draws = 0, timeouts = 0

  for (const [a, b] of matchups) {
    for (let seed = 0; seed < perMatchup; seed++) {
      games++
      let state: GameState
      try {
        state = playGame(a, b, seed)
      } catch (err) {
        crashes.push({ seed, matchup: `${a}-${b}`, msg: String(err) })
        continue
      }
      checkInvariants(state, seed, `${a}-${b}`, invariants)
      if (state.turnNumber >= MAX_TURNS && !state.gameOver) timeouts++
      else if (state.winner === null) draws++

      const msgs = (state.log as TurnLogEntry[]).map(e => e.message)
      let distinct = 0
      for (const [mech, subs] of Object.entries(COVERAGE)) {
        if (msgs.some(m => subs.some(s => m.includes(s)))) { hits[mech]++; distinct++ }
      }
      if (!best || distinct > best.distinct) best = { state, a, b, seed, distinct }
    }
  }

  console.log(`=== Stage 5 end-to-end validation — ${games} games (${perMatchup}/matchup × 4), exerciser policy ===`)
  console.log(`draws ${draws}, timeouts ${timeouts}, crashes ${crashes.length}, invariant violations ${invariants.length}\n`)
  console.log('Mechanic coverage (games in which it fired at least once):')
  let missing = 0
  for (const [mech, n] of Object.entries(hits)) {
    const ok = n > 0
    if (!ok) missing++
    console.log(`  ${ok ? '✓' : '✗ NEVER FIRED'}  ${mech.padEnd(38)} ${n}/${games}`)
  }
  for (const c of crashes.slice(0, 5)) console.log(`  CRASH ${c.matchup} seed ${c.seed}: ${c.msg}`)
  for (const v of invariants.slice(0, 5)) console.log(`  INVARIANT ${v.matchup} seed ${v.seed}: ${v.msg}`)

  if (best) dumpGame(best.state, best.a, best.b, best.seed, Object.values(COVERAGE).flat())

  console.log(`\n=== ${missing === 0 && crashes.length === 0 && invariants.length === 0 ? 'PASS' : 'ATTENTION'}: ${missing} mechanic(s) never fired, ${crashes.length} crash(es), ${invariants.length} invariant violation(s) ===`)
}

main()
