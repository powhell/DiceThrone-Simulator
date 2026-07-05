// Shared self-play/eval/checkpoint logic used by both the single-process driver (train.ts) and
// the multi-process parallel driver (trainWorker.ts/trainParallel.ts) — kept in one place so the
// two entry points can't silently drift apart on how a game/update/checkpoint actually works.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { createNetwork, forward, trainStep, toJSON, fromJSON } from './network.js'
import type { Network } from './network.js'
import { encodeState, FEATURE_COUNT } from './features.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { createInitialGameState, MAX_TURNS } from '../match.js'
import { playTurn, playNaraxusTurn } from '../turn.js'
import { greedyHighestDamagePolicy } from '../policy.js'
import type { Policy } from '../policy.js'
import { mulberry32 } from '../rng.js'
import type { HeroId, GameState } from '../types.js'

// Lowered from 0.01 after observing a real training run collapse from ~50-75% winrate vs
// greedy down to ~5-16% over 1000 games — classic vanilla-TD(0) self-play instability (no
// target network, no gradient clipping, constant learning rate). A smaller step size alone
// isn't a guaranteed fix, which is why trainParallel.ts also now keeps a separate best.json
// checkpoint that's never overwritten by a regression.
export const LEARNING_RATE = 0.005
export const HIDDEN_SIZES = [24, 12]
export const EVAL_GAMES_PER_MATCHUP = 20
export const MATCHUPS: Array<[HeroId, HeroId]> = [['hh', 'bw'], ['bw', 'hh'], ['fm', 'bw'], ['bw', 'fm'], ['fm', 'hh'], ['hh', 'fm'], ['hh', 'nx'], ['bw', 'nx'], ['fm', 'nx']] // vs Naraxus : heros seat 0, boss seat 1 (normal/hard alterne) // miroirs retirés (user 2026-07-05)

// Timeout (MAX_TURNS reached, state.winner still null) is treated as a draw (target 0) —
// a deliberate v1 default, not an overlooked edge case (see the RL plan's open question).
function outcomeFor(state: GameState, idx: 0 | 1): number {
  if (state.winner === null) return 0
  return state.winner === idx ? 1 : -1
}

export function playSelfPlayGame(network: Network, heroA: HeroId, heroB: HeroId, seed: number): { winner: 0 | 1 | null; turns: number } {
  const rng = mulberry32(seed)
  const state = createInitialGameState(heroA, heroB, rng)
  const bossGame = heroB === 'nx'
  if (bossGame) state.bossHard = (seed % 2 === 1)
  const policy = createValueGreedyPolicy(network)
  const lastFeatures: [number[] | null, number[] | null] = [null, null]

  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = bossGame ? 0 : state.activePlayerIdx
    if (bossGame) {
      playNaraxusTurn(state, 1, rng, [policy, policy])
      if (!state.gameOver) playTurn(state, 0, rng, [policy, policy])
      state.activePlayerIdx = 0
    } else
    playTurn(state, activeIdx, rng, [policy, policy])

    const features = encodeState(state, activeIdx)
    const isTerminal = state.gameOver || state.turnNumber >= MAX_TURNS
    const prev = lastFeatures[activeIdx]
    if (prev) {
      const target = isTerminal ? outcomeFor(state, activeIdx) : forward(network, [features])[0]
      trainStep(network, [prev], [target], LEARNING_RATE)
    }
    lastFeatures[activeIdx] = features

    if (isTerminal) {
      // The other player doesn't get another turn to naturally trigger their own TD update —
      // bootstrap their last transition toward the terminal outcome now.
      const otherIdx = (1 - activeIdx) as 0 | 1
      const otherPrev = lastFeatures[otherIdx]
      if (otherPrev) trainStep(network, [otherPrev], [outcomeFor(state, otherIdx)], LEARNING_RATE)
      break
    }
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }

  return { winner: state.winner, turns: state.turnNumber }
}

export interface EvalResult {
  winsLearned: number
  winsGreedy: number
  // A mutual kill (both players lethal in the same simultaneous-damage step — Golden Rule #4) ends
  // the game with gameOver=true but winner=null. That's a DRAW, not a timeout, and is common (BW's
  // counter-damage, Time Bomb self-damage). Kept separate from `timeouts` so the eval line doesn't
  // read a normal ~13-turn draw as a 200-turn stall.
  draws: number
  // A TRUE timeout: MAX_TURNS reached with the game still not over. Should be ~0 in a healthy engine.
  timeouts: number
}

export function evaluateVsGreedy(network: Network, heroA: HeroId, heroB: HeroId, n: number, seedOffset: number): EvalResult {
  const learned = createValueGreedyPolicy(network)
  const policies: [Policy, Policy] = [learned, greedyHighestDamagePolicy]
  let winsLearned = 0
  let winsGreedy = 0
  let draws = 0
  let timeouts = 0

  for (let i = 0; i < n; i++) {
    const rng = mulberry32(seedOffset + i)
    const state = createInitialGameState(heroA, heroB, rng)
    while (!state.gameOver && state.turnNumber < MAX_TURNS) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      playTurn(state, activeIdx, rng, policies)
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    }
    if (state.winner === 0) winsLearned += 1
    else if (state.winner === 1) winsGreedy += 1
    else if (state.gameOver) draws += 1 // mutual kill (winner null but game over)
    else timeouts += 1 // reached MAX_TURNS without a decision
  }

  return { winsLearned, winsGreedy, draws, timeouts }
}

// Returns the aggregate learned-winrate (0-1, decisive games only, pooled across all 4
// matchups) so callers can act on it programmatically (see trainParallel.ts's best-checkpoint
// tracking) — not just for display.
export function runEvalReport(network: Network, seed: number): number {
  let totalLearned = 0
  let totalDecisive = 0
  for (const [heroA, heroB] of MATCHUPS) {
    const r = evaluateVsGreedy(network, heroA, heroB, EVAL_GAMES_PER_MATCHUP, seed)
    const decisive = r.winsLearned + r.winsGreedy
    const rate = decisive > 0 ? ((100 * r.winsLearned) / decisive).toFixed(1) : 'n/a'
    console.log(`  eval ${heroA}(learned) vs ${heroB}(greedy): learned ${r.winsLearned}, greedy ${r.winsGreedy}, draws ${r.draws}, timeouts ${r.timeouts}, learned winrate=${rate}%`)
    totalLearned += r.winsLearned
    totalDecisive += decisive
  }
  return totalDecisive > 0 ? totalLearned / totalDecisive : 0
}

export function loadNetworkFrom(checkpointPath: string): Network | null {
  if (!fs.existsSync(checkpointPath)) return null
  return fromJSON(fs.readFileSync(checkpointPath, 'utf-8'))
}

export function createFreshNetwork(seed: number): Network {
  return createNetwork([FEATURE_COUNT, ...HIDDEN_SIZES, 1], mulberry32(seed))
}

export function saveNetworkTo(checkpointPath: string, network: Network): void {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true })
  fs.writeFileSync(checkpointPath, toJSON(network))
}
