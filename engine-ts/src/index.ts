import * as core from './core/evaluator.js'
import { hhConfig, type HHState } from './characters/horseman/config.js'
import { bwConfig, type BWState } from './characters/black_widow/config.js'

export { clearCache } from './core/evaluator.js'
export type { KeepOption, SolverResult } from './core/evaluator.js'
export type { AbilityEntry } from './core/types.js'
export type { HHState } from './characters/horseman/config.js'
export type { BWState } from './characters/black_widow/config.js'

// ─── HH public API (backward-compatible — used by HH tests + legacy callers) ──

export function evalState(
  kept: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): number {
  return core.evalState(hhConfig, kept, rollsRemaining, { dreadful, hasHead })
}

export function calculateOptimalKeep(
  dice: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): core.SolverResult {
  return core.calculateOptimalKeep(hhConfig, dice, rollsRemaining, { dreadful, hasHead })
}

// ─── Namespaced per-character engines ────────────────────────────────────────

export const HHEngine = {
  calculateOptimalKeep,
  evalState,
  clearCache: core.clearCache,
}

export const BWEngine = {
  calculateOptimalKeep(dice: number[], rollsRemaining: number, state: BWState): core.SolverResult {
    return core.calculateOptimalKeep(bwConfig, dice, rollsRemaining, state)
  },
  evalState(kept: number[], rollsRemaining: number, state: BWState): number {
    return core.evalState(bwConfig, kept, rollsRemaining, state)
  },
  clearCache: core.clearCache,
}
