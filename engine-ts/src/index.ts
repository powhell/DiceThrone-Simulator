import * as core from './core/evaluator.js'
import { hhConfig, type HHState } from './characters/horseman/config.js'

export { clearCache } from './core/evaluator.js'
export type { KeepOption, SolverResult } from './core/evaluator.js'
export type { AbilityEntry } from './core/types.js'

export function evalState(
  kept: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): number {
  const state: HHState = { dreadful, hasHead }
  return core.evalState(hhConfig, kept, rollsRemaining, state)
}

export function calculateOptimalKeep(
  dice: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): core.SolverResult {
  const state: HHState = { dreadful, hasHead }
  return core.calculateOptimalKeep(hhConfig, dice, rollsRemaining, state)
}
