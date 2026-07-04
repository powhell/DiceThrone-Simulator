// Black Widow rules. Sourced from photos of the physical board/leaflet/cards in
// characters/Black_Widow/{board,leaflet,cards}/ (verified 2026-07-01) — see
// engine-ts/src/sim/data/characters/bw/hero.json for the transcribed source of truth this
// file implements against.
import { bwFaceToSymbol } from '../../characters/black_widow/abilities.js'
import type { RNG } from '../rng.js'
import { rollDice, rollDie } from '../rng.js'
import type { Tokens, GameState, PlayerState, TimeBombPosition } from '../types.js'
import { BW_STARTING_COVERT_OPS } from '../data/config.js'
import { emptyBag } from '../tokens.js'
import type { Policy } from '../policy.js'

export const TIME_BOMB_STACK_CAP = 2
export const TIME_BOMB_DETONATE_DAMAGE = 4
export const SABOTAGE_REROLL_UPGRADE_THRESHOLD = 4
export const AGILITY_CAP = 2
export const COVERT_OPS_CAP = 3

export function createInitialBWTokens(): Tokens {
  return { ...emptyBag(), covertOps: BW_STARTING_COVERT_OPS }
}

/**
 * Inflicts Time Bombs on `target` (any hero — this is BW's status effect landing on
 * whichever opponent she hits), respecting the stack cap (2). Starting position depends on
 * the INFLICTOR's upgrade count (guide: ">=6 Ability Upgrades en jeu -> pose sur 0:01,
 * sinon 0:02").
 */
export function inflictTimeBomb(target: PlayerState, inflictorUpgrades: number, amount: number): number {
  const startPos: TimeBombPosition = inflictorUpgrades >= 6 ? '0:01' : '0:02'
  let inflicted = 0
  for (let i = 0; i < amount; i++) {
    if (target.timeBombs.length >= TIME_BOMB_STACK_CAP) break
    target.timeBombs.push(startPos)
    inflicted += 1
  }
  return inflicted
}

/**
 * Unconditional TB advance (leaflet: "When a Time Bomb is advanced: if on 0:02, flip to
 * 0:01; if on 0:01, remove and deal 4 undefendable dmg"), used by Infiltrate's "advance all
 * Time Bomb tokens" — unlike the Upkeep Phase tick, there is no die roll here (Infiltrate's
 * card text never mentions a roll, and the leaflet's "advance" definition is roll-agnostic).
 */
export function advanceAllTimeBombs(target: PlayerState): number {
  let detonations = 0
  const survivors: TimeBombPosition[] = []
  for (const pos of target.timeBombs) {
    if (pos === '0:02') survivors.push('0:01')
    else { detonations += 1; target.hp -= TIME_BOMB_DETONATE_DAMAGE }
  }
  target.timeBombs = survivors
  return detonations
}

export interface TimeBombUpkeepResult {
  selfDamage: number
  defused: number
}

/**
 * Upkeep Phase (leaflet): each Time Bomb in play rolls 1 die independently.
 * 1-5 -> advance (0:02 -> 0:01, or 0:01 -> detonate: remove + 4 undefendable dmg).
 * 6 -> defused, token removed. Applies to any player carrying Time Bombs, not just BW.
 */
export function tickTimeBombsUpkeep(self: PlayerState, rng: RNG): TimeBombUpkeepResult {
  let selfDamage = 0
  let defused = 0
  const survivors: TimeBombPosition[] = []

  for (const pos of self.timeBombs) {
    const roll = rollDie(rng)
    if (roll === 6) {
      defused += 1
      continue
    }
    if (pos === '0:02') {
      survivors.push('0:01')
    } else {
      selfDamage += TIME_BOMB_DETONATE_DAMAGE
    }
  }

  self.timeBombs = survivors
  self.hp -= selfDamage
  return { selfDamage, defused }
}

export interface AgilitySpendResult {
  remainingDamage: number
  roll: number
  succeeded: boolean
}

/**
 * Agility (leaflet, verified): "Spend & roll 1-3 to avoid 1/2 damage: When a player with
 * this token receives damage, they may spend it and roll 1 die. If the outcome is 1-3,
 * prevent 1/2 incoming dmg (rounded up)." A roll of 4-6 wastes the token with no effect
 * (earlier version of this engine halved damage unconditionally — wrong, only ~50% odds).
 */
export function spendAgilityToHalveDamage(self: PlayerState, incomingDamage: number, rng: RNG): AgilitySpendResult {
  const tokens = self.tokens
  if (tokens.agility <= 0) return { remainingDamage: incomingDamage, roll: 0, succeeded: false }
  tokens.agility -= 1
  const roll = rollDie(rng)
  if (roll >= 4) return { remainingDamage: incomingDamage, roll, succeeded: false }
  return { remainingDamage: incomingDamage - Math.ceil(incomingDamage / 2), roll, succeeded: true }
}

export interface RecoilResult {
  cpGained: number
  damagePrevented: number
}

/**
 * Recoil! card (verified card text): "Play only after being Attacked. Roll 2 dice: On
 * Espionage, gain 1 CP. On Widow, prevent 1/2 incoming dmg (rounded up)." Both conditions use
 * the "On [symbol]" boolean-trigger convention already established for Vengeance's rider
 * (not scaled by how many of the 2 dice show the symbol) — so at most 1 CP and one halving,
 * even if both dice land on the same symbol.
 */
export function resolveRecoil(incomingDamage: number, rng: RNG): RecoilResult {
  const dice = [rollDie(rng), rollDie(rng)]
  const hasEspionage = dice.some(f => bwFaceToSymbol(f) === 'A')
  const hasWidow = dice.some(f => bwFaceToSymbol(f) === 'C')
  return {
    cpGained: hasEspionage ? 1 : 0,
    damagePrevented: hasWidow ? Math.ceil(incomingDamage / 2) : 0,
  }
}

export function grantAgility(self: PlayerState, amount: number, cap = AGILITY_CAP): void {
  const tokens = self.tokens
  tokens.agility = Math.min(cap, tokens.agility + amount)
}

export function grantCovertOps(self: PlayerState, amount: number, cap = COVERT_OPS_CAP): void {
  const tokens = self.tokens
  tokens.covertOps = Math.min(cap, tokens.covertOps + amount)
}

export interface VengeanceRiderResult {
  bonusDamage: number
  tbInflictedOnOpponent: number
  covertOpsGained: number
}

/**
 * Vengeance rider (verified against board+card photos 2026-07-01): roll `diceCount` attack
 * dice (4 base, 5 with Vengeance II). Add 1 dmg per Batons (B) rolled. On any Espionage (A)
 * rolled, inflict 1 Time Bomb (boolean trigger, not scaled by count — matches the "On [icon]"
 * vs "1x[icon]" convention used elsewhere on BW's cards). On a Widow-pair (>=2 C), gain 1
 * Covert Ops. Earlier version of this engine checked raw face===1 for TB and awarded dmg for
 * every other face — wrong on both the TB trigger and the dmg source, and didn't model the
 * Covert Ops gain at all.
 */
export function resolveVengeanceRider(
  self: PlayerState,
  opponent: PlayerState,
  rng: RNG,
  diceCount = 4,
): VengeanceRiderResult {
  const dice = rollDice(diceCount, rng)
  let a = 0, bonusDamage = 0, c = 0
  for (const face of dice) {
    const s = bwFaceToSymbol(face)
    if (s === 'A') a += 1
    else if (s === 'B') bonusDamage += 1
    else c += 1
  }
  const tbInflictedOnOpponent = a > 0 ? inflictTimeBomb(opponent, self.upgradesInPlay.length, 1) : 0
  const covertOpsGained = c >= 2 ? 1 : 0
  if (covertOpsGained > 0) grantCovertOps(self, covertOpsGained)
  return { bonusDamage, tbInflictedOnOpponent, covertOpsGained }
}

export interface SabotageResult {
  damageToAttacker: number
  damagePrevented: number
  tbInflictedOnAttacker: number
}

/**
 * Sabotage (BW's defense ability, verified against board+card photos 2026-07-01): roll 3 of
 * BW's own dice (4 with Sabotage II — same formula, one more die). 1 dmg per B rolled
 * (counter-damage), prevent 1 dmg per A rolled, "CC" (>=2 sixes) inflicts 1 TB on the
 * attacker. >=4 upgrades in play unlocks a full reroll (same threshold on both versions).
 */
// Split into roll and count so the DRP3 alter window (turn.ts) can sit between them: roll the
// dice, let the window mutate them (opponent Tip It!/Helping Hand!, defender Better D!), then count
// on the FINAL dice. resolveSabotage keeps the old one-shot behaviour for direct callers (the RL's
// chooseSabotageReroll scoring).
export function rollSabotageDice(
  defender: PlayerState,
  rng: RNG,
  policy: Policy,
  gameState: GameState,
  defenderIdx: 0 | 1,
  upgraded = false,
): number[] {
  const diceCount = upgraded ? 4 : 3
  let dice = rollDice(diceCount, rng)
  if (defender.upgradesInPlay.length >= SABOTAGE_REROLL_UPGRADE_THRESHOLD) {
    if (policy.chooseSabotageReroll(gameState, defenderIdx, dice)) dice = rollDice(diceCount, rng)
  }
  return dice
}

export function countSabotage(dice: number[]): SabotageResult {
  let a = 0, b = 0, c = 0
  for (const face of dice) {
    const s = bwFaceToSymbol(face)
    if (s === 'A') a += 1
    else if (s === 'B') b += 1
    else c += 1
  }
  return { damageToAttacker: b, damagePrevented: a, tbInflictedOnAttacker: c >= 2 ? 1 : 0 }
}

export function resolveSabotage(
  defender: PlayerState,
  _attackerUpgrades: number,
  rng: RNG,
  policy: Policy,
  gameState: GameState,
  defenderIdx: 0 | 1,
  upgraded = false,
): SabotageResult {
  return countSabotage(rollSabotageDice(defender, rng, policy, gameState, defenderIdx, upgraded))
}

export function rrtAttackBonus(upgradesInPlay: string[]): number {
  return upgradesInPlay.length >= 5 ? 1.0 : 0.0
}
