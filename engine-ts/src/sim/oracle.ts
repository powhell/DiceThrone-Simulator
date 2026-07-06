// Thin adapter over the existing exact dice-keep DP (engine-ts/src/core/evaluator.ts).
// The dice-keep decision is already mathematically optimal — this module reuses it
// verbatim instead of re-deriving or learning it.
import * as core from '../core/evaluator.js'
import { hhConfig, type HHState } from '../characters/horseman/config.js'
import { bwConfig, type BWState } from '../characters/black_widow/config.js'
import { fmConfig, type FMState } from '../characters/forgemaster/config.js'
import { rvConfig, type RVState } from '../characters/raveness/config.js'
import type { HeroId } from './types.js'
import type { RNG } from './rng.js'
import { rollDice } from './rng.js'

export type OracleState = HHState | BWState | FMState | RVState

function cfgFor(heroId: HeroId): any {
  return heroId === 'hh' ? hhConfig : heroId === 'fm' ? fmConfig : heroId === 'rv' ? rvConfig : bwConfig
}

export interface RollStep {
  rollsRemaining: number
  dice: number[]
}

// Returned by `beforeReroll` each iteration: the (possibly card-modified) oracle state/dice
// to use for this iteration's keep/reroll decision, plus any extra Roll Attempts granted this
// iteration (One More Time!: "+1 additional Roll Attempt of up to five dice").
export interface RollStepUpdate {
  oracleState: OracleState
  dice: number[]
  extraRollsGranted?: number
}

/**
 * Runs one full Offensive Roll Phase (initial roll of 5 + up to 2 DP-optimal rerolls, plus any
 * extra Roll Attempts granted mid-roll). `beforeReroll` fires after each roll, before deciding
 * whether to reroll — this is the hook turn.ts uses to let a player play Roll Phase Action
 * cards (Black Widow's mid-roll upgrades via Red Room Training, and dice-manipulation cards
 * like Six-It!/Try Try Again!/One More Time! for either hero) before the next keep/reroll
 * decision is computed against the updated oracle state/dice.
 */
export function runOffensiveRoll(
  heroId: HeroId,
  initialOracleState: OracleState,
  rng: RNG,
  beforeReroll?: (step: RollStep) => RollStepUpdate,
): number[] {
  const dice = rollDice(5, rng).sort((a, b) => a - b)
  return completeOffensiveRoll(heroId, initialOracleState, dice, 2, rng, beforeReroll)
}

/**
 * Resumable tail of the Offensive Roll: finishes a roll already in progress (given the current
 * dice and how many Roll Attempts remain) with the same DP-optimal keep/reroll loop. Extracted
 * from runOffensiveRoll (which is now "roll 5 fresh dice, then complete from 2 rolls left") so
 * the RL policy can SCORE mid-roll card plays by rolling a candidate's modified dice forward to
 * their final state — the exact re-entry point the v1 "chooseRollManipulationCards is a no-op"
 * gap was blocked on.
 */
export function completeOffensiveRoll(
  heroId: HeroId,
  initialOracleState: OracleState,
  initialDice: number[],
  initialRollsRemaining: number,
  rng: RNG,
  beforeReroll?: (step: RollStep) => RollStepUpdate,
): number[] {
  const cfg = cfgFor(heroId)
  let oracleState = initialOracleState
  let dice = initialDice.slice().sort((a, b) => a - b)
  let rollsRemaining = initialRollsRemaining

  // The hook also fires one FINAL time at rollsRemaining === 0 (the "final dice" window):
  // Roll Phase Action cards are legal until the Roll Phase ends, and this is where the
  // resurrect-the-roll effects live (One More Time!, Grim Pursuit mode (a) — an
  // extraRollsGranted here re-enters the keep/reroll loop). Value-setters played here are
  // deterministic: no reroll follows unless the player grants one.
  while (true) {
    if (beforeReroll) {
      const update = beforeReroll({ rollsRemaining, dice })
      oracleState = update.oracleState
      dice = update.dice.slice().sort((a, b) => a - b)
      rollsRemaining += update.extraRollsGranted ?? 0
    }
    if (rollsRemaining <= 0) break

    const result = core.calculateOptimalKeep(cfg, dice, rollsRemaining, oracleState)
    const kept = result.topOptions[0].kept
    if (kept.length === 5) {
      // DP says keep everything — skip the remaining attempts, but still open the final window.
      rollsRemaining = 0
      continue
    }

    const nReroll = 5 - kept.length
    const rerolled = rollDice(nReroll, rng)
    dice = [...kept, ...rerolled].sort((a, b) => a - b)
    rollsRemaining -= 1
  }

  return dice
}
