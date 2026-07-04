// Headless Horseman rules. Sourced from photos of the physical board/leaflet/cards in
// characters/headless_horseman/{board,leaflet,cards}/ (verified 2026-07-01) — see
// engine-ts/src/sim/data/characters/hh/hero.json for the transcribed source of truth this
// file implements against.
import { hhFaceToSymbol } from '../../characters/horseman/abilities.js'
import type { Tokens, PlayerState } from '../types.js'
import type { RNG } from '../rng.js'
import { rollDice, rollDie } from '../rng.js'
import { grantCp } from '../cp.js'
import { emptyBag } from '../tokens.js'

export const DREADFUL_CAP = 5
export const GRIM_PURSUIT_CAP = 3
export const TERRORIZE_DREADFUL_COST = 4
export const TERRORIZE_DAMAGE = 3
export const TERRORIZE_CP = 1
export const TERRORIZE_GRIM_PURSUIT = 1

export function createInitialHHTokens(hasHead: boolean): Tokens {
  return { ...emptyBag(), head: hasHead ? 1 : 0 }
}

// Cleave's "On N-of-a-kind (#'s), gain Dreadful" checks the raw FACE VALUE (e.g. four 2's),
// not the A/B/C symbol classification used for the ability's own dice-pattern match. Base
// Cleave requires 4-of-a-kind; Cleave II lowers the threshold to 3-of-a-kind.
export function hasNumberMatch(dice: number[], ofAKind: number): boolean {
  const counts = new Map<number, number>()
  for (const face of dice) counts.set(face, (counts.get(face) ?? 0) + 1)
  for (const n of counts.values()) if (n >= ofAKind) return true
  return false
}

export interface BonusRollResult {
  bonusDamage: number
  undefendable: boolean
  grimPursuitGained: number
}

/**
 * Spectral Assault's bonus roll (verified card text): "Gain Dreadful. Then deal 8 dmg and
 * roll 1 die per Dreadful (up to 5 total): Add 1 dmg per Axe. On 2 Horseshoe, this Attack
 * becomes undefendable. Gain 1 Grim Pursuit per Scare." Caller must grant the ability's own
 * Dreadful BEFORE calling this, since the dice count depends on the post-gain total.
 */
export function resolveSpectralAssaultBonusRoll(self: PlayerState, rng: RNG): BonusRollResult {
  const tokens = self.tokens
  const dice = rollDice(Math.min(DREADFUL_CAP, tokens.dreadful), rng)
  let a = 0, b = 0, c = 0
  for (const face of dice) {
    const s = hhFaceToSymbol(face)
    if (s === 'A') a += 1
    else if (s === 'B') b += 1
    else c += 1
  }
  return { bonusDamage: a, undefendable: b >= 2, grimPursuitGained: c }
}

export function grantDreadful(self: PlayerState, amount: number): void {
  const tokens = self.tokens
  tokens.dreadful = Math.min(DREADFUL_CAP, tokens.dreadful + Math.max(0, amount))
}

export function grantGrimPursuit(self: PlayerState, amount: number): void {
  const tokens = self.tokens
  tokens.grimPursuit = Math.min(GRIM_PURSUIT_CAP, tokens.grimPursuit + Math.max(0, amount))
}

// Unescapable! card: "Remove a Grim Pursuit to make this Attack undefendable."
export function spendGrimPursuit(self: PlayerState, amount: number): void {
  const tokens = self.tokens
  tokens.grimPursuit = Math.max(0, tokens.grimPursuit - amount)
}

// Grim Pursuit spend mode (b) (token text): "after attacking, roll 1 die and add that many dmg as
// an Attack Modifier." Spends 1 Grim Pursuit and returns the rolled value (1-6) to add to the
// attack's damage, or 0 if the player has no Grim Pursuit to spend. (Mode (a), an extra Offensive
// Roll Attempt, needs a resumable roll and is not wired yet.)
export function spendGrimPursuitForBonusDamage(self: PlayerState, rng: RNG): number {
  const tokens = self.tokens
  if (tokens.grimPursuit <= 0) return 0
  tokens.grimPursuit -= 1
  return rollDie(rng)
}

export function canTerrorize(self: PlayerState): boolean {
  return self.tokens.dreadful >= TERRORIZE_DREADFUL_COST
}

export interface TerrorizeResult {
  damageToOpponent: number
  cpGained: number
}

/**
 * Terrorize (leaflet, "Headless Mayhem" passive): a CHOICE available during your Upkeep
 * Phase whenever you hold >=4 Dreadful — NOT an automatic trigger on gaining the 4th token
 * (earlier version of this engine got this wrong). Costs 4 Dreadful: reclaims your own
 * Haunted Head, deals 3 undefendable dmg to a chosen opponent, grants 1 Grim Pursuit + 1 CP.
 */
export function resolveTerrorize(self: PlayerState): TerrorizeResult {
  const tokens = self.tokens
  tokens.dreadful -= TERRORIZE_DREADFUL_COST
  tokens.head = 1
  grantGrimPursuit(self, TERRORIZE_GRIM_PURSUIT)
  grantCp(self, TERRORIZE_CP)
  return { damageToOpponent: TERRORIZE_DAMAGE, cpGained: TERRORIZE_CP }
}

/**
 * Haunted Head (leaflet): "At the conclusion of your turn, if an opponent has the Haunted
 * Head, gain Dreadful." This fires at END OF TURN, not Upkeep (earlier version of this
 * engine had it in upkeep — corrected against the leaflet photo).
 */
export function endOfTurnHeadCheck(self: PlayerState): boolean {
  const tokens = self.tokens
  if (tokens.head > 0) return false
  grantDreadful(self, 1)
  return true
}

export interface HallowedReckoningResult {
  damagePrevented: number
  counterDamageToAttacker: number
  dreadfulGained: number
  grimPursuitGained: number
}

/**
 * Hallowed Reckoning (defense, verified from board photo): roll 1 + Dreadful dice (capped at
 * 5 total). 1 dmg per Axe rolled (counter-damage to the attacker), prevent 1 incoming dmg per
 * 2 Horseshoe, gain 1 Dreadful per Scare.
 * Hallowed Reckoning II (upgrade, verified from card photo): starts at 2 dice instead of 1
 * (same cap of 5), and additionally grants 1 Grim Pursuit on 2 Scare.
 */
// Split into roll and effects so the DRP3 alter window (turn.ts) can sit between them: roll the
// dice, let the window mutate them (opponent Tip It!/Helping Hand!, defender Better D!), then apply
// effects on the FINAL dice — crucially the Dreadful/Grim Pursuit grants must reflect the altered
// dice, so they live in hallowedEffects, not the roll. resolveHallowedReckoning keeps the old
// one-shot behaviour.
export function rollHallowedDice(self: PlayerState, rng: RNG, upgraded: boolean): number[] {
  const tokens = self.tokens
  const baseDice = upgraded ? 2 : 1
  return rollDice(Math.min(DREADFUL_CAP, baseDice + tokens.dreadful), rng)
}

export function hallowedEffects(self: PlayerState, dice: number[], upgraded: boolean): HallowedReckoningResult {
  let a = 0, b = 0, c = 0
  for (const face of dice) {
    const s = hhFaceToSymbol(face)
    if (s === 'A') a += 1
    else if (s === 'B') b += 1
    else c += 1
  }

  grantDreadful(self, c)
  let grimPursuitGained = 0
  if (upgraded && c >= 2) {
    grimPursuitGained = 1
    grantGrimPursuit(self, grimPursuitGained)
  }

  return {
    damagePrevented: Math.floor(b / 2),
    counterDamageToAttacker: a,
    dreadfulGained: c,
    grimPursuitGained,
  }
}

export function resolveHallowedReckoning(self: PlayerState, rng: RNG, upgraded: boolean): HallowedReckoningResult {
  return hallowedEffects(self, rollHallowedDice(self, rng, upgraded), upgraded)
}
