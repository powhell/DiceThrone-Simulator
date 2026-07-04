// Shared "clone the real state, replay a candidate action through the real engine, score the
// result" primitive used by every valueGreedyPolicy decision. Deliberately decision-agnostic —
// it knows nothing about Policy/turn.ts; callers supply `applyCandidate` closures that call
// whichever real turn.ts function is the right re-entry point for that decision (see the RL
// plan, section on lookahead.ts, for why each decision's re-entry point was chosen).
//
// Two correctness rules live here, both silent-corruption risks if skipped (see plan):
//  1. Every candidate gets a FRESH RNG (`mulberry32(lookaheadSeed)`), never the real game's live
//     RNG — reusing it would advance the real game as a side effect of merely evaluating options.
//  2. All candidates at the SAME decision point reuse the SAME `lookaheadSeed`, so any dice
//     already rolled before reaching the decision (e.g. Sabotage's roll inside resolveDefense)
//     land identically across candidates — isolating the decision itself as the only source of
//     difference, instead of "which candidate got luckier" polluting the comparison.
import type { GameState } from '../types.js'
import type { RNG } from '../rng.js'
import { mulberry32 } from '../rng.js'
import type { Network } from './network.js'
import { forward } from './network.js'
import { encodeState } from './features.js'

export function cloneForLookahead(state: GameState): GameState {
  return structuredClone({ ...state, log: [] }) as GameState
}

export function scoreCandidatesByReplay<T>(
  network: Network,
  scoringPlayerIdx: 0 | 1,
  baseState: GameState,
  lookaheadSeed: number,
  candidates: T[],
  applyCandidate: (clone: GameState, candidate: T, rng: RNG) => void,
): T {
  if (candidates.length === 0) throw new Error('scoreCandidatesByReplay: candidates must be non-empty')
  if (candidates.length === 1) return candidates[0]

  const featureBatch = candidates.map(candidate => {
    const clone = cloneForLookahead(baseState)
    const rng = mulberry32(lookaheadSeed)
    applyCandidate(clone, candidate, rng)
    return encodeState(clone, scoringPlayerIdx)
  })

  const scores = forward(network, featureBatch)
  let bestIdx = 0
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[bestIdx]) bestIdx = i
  }
  return candidates[bestIdx]
}
