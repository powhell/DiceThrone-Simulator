import * as core from './core/evaluator.js'
import { hhConfig, type HHState } from './characters/horseman/config.js'
import { bwConfig, type BWState } from './characters/black_widow/config.js'
import { fmConfig, type FMState } from './characters/forgemaster/config.js'

export { clearCache } from './core/evaluator.js'
export type { KeepOption, SolverResult } from './core/evaluator.js'
export type { AbilityEntry } from './core/types.js'
export type { HHState } from './characters/horseman/config.js'
export type { BWState } from './characters/black_widow/config.js'
export type { FMState } from './characters/forgemaster/config.js'

// ─── HH public API (backward-compatible — used by HH tests + legacy callers) ──

export function evalState(
  kept: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
  upgradeIdsOrGp?: string[] | number,
  grimPursuit = 0,
): number {
  // rétro-compat : 5e arg = upgradeIds (tableau) ou stock GP (nombre, tests)
  const upgradeIds = Array.isArray(upgradeIdsOrGp) ? upgradeIdsOrGp : undefined
  const gp = typeof upgradeIdsOrGp === 'number' ? upgradeIdsOrGp : grimPursuit
  return core.evalState(hhConfig, kept, rollsRemaining, { dreadful, hasHead, upgradeIds, grimPursuit: gp })
}

export function calculateOptimalKeep(
  dice: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
  upgradeIds?: string[],
): core.SolverResult {
  return core.calculateOptimalKeep(hhConfig, dice, rollsRemaining, { dreadful, hasHead, upgradeIds })
}

// ─── Namespaced per-character engines ────────────────────────────────────────

export const HHEngine = {
  calculateOptimalKeep,
  evalState,
  clearCache: core.clearCache,
}

export const FMEngine = {
  calculateOptimalKeep(dice: number[], rollsRemaining: number, state: FMState): core.SolverResult {
    return core.calculateOptimalKeep(fmConfig, dice, rollsRemaining, state)
  },
  evalState(kept: number[], rollsRemaining: number, state: FMState): number {
    return core.evalState(fmConfig, kept, rollsRemaining, state)
  },
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
