// Druid — mécaniques propres (board + leaflet vérifiés, scans user 2026-07-06 ; rulings :
// Thick Hide contre par Claw TOUJOURS / prévention Bear SEULEMENT ; Wound = 1 dmg upkeep
// + d6 4-6 retire ; Nature's Cure = AACC). Spec : characters/Druid/SPEC.md
import type { PlayerState, Tokens } from '../types.js'
import type { RNG } from '../rng.js'
import { emptyBag } from '../tokens.js'
import { rollDie } from '../rng.js'

export type DruidForm = 'druid' | 'cat' | 'bear'
export const SHAPE_SHIFT_CAP = 2
export const REGEN_CAP = 2 // total jetons Regenerate (faces 2 + 1 confondues)

export function createInitialDRTokens(): Tokens {
  return emptyBag() // commence sans jeton ; la forme de départ (druid) est sur PlayerState.form
}

export function drFaceToSymbol(face: number): 'A' | 'B' | 'C' {
  return face <= 3 ? 'A' : face <= 5 ? 'B' : 'C'
}

export function formOf(p: PlayerState): DruidForm {
  return (p.form as DruidForm) ?? 'druid'
}

export function grantShapeShift(self: PlayerState, n: number): number {
  const before = self.tokens.shapeShift ?? 0
  self.tokens.shapeShift = Math.min(SHAPE_SHIFT_CAP, before + n)
  return self.tokens.shapeShift - before
}

// Gain d'un Regenerate face ② (règle vérifiée) : au cap total, peut flipper un ① en ②.
export function grantRegen2(self: PlayerState, n = 1): void {
  for (let i = 0; i < n; i++) {
    const total = (self.tokens.regen2 ?? 0) + (self.tokens.regen1 ?? 0)
    if (total < REGEN_CAP) self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1
    else if ((self.tokens.regen1 ?? 0) > 0) { self.tokens.regen1 -= 1; self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1 }
    // sinon : déjà 2 faces ② — perdu
  }
}

// Dépense d'un Shape Shift -> transformation. Retourne la nouvelle forme ou null si refus.
export function spendShapeShift(self: PlayerState, to: DruidForm): DruidForm | null {
  if ((self.tokens.shapeShift ?? 0) < 1) return null
  if (formOf(self) === to) return null
  self.tokens.shapeShift -= 1
  self.form = to
  return to
}

// Upkeep : Regenerate (soigne puis flip/retire) + Wound (1 dmg + d6 4-6 retire, PAR jeton).
export function upkeepRegenAndWound(self: PlayerState, rng: RNG): {
  healed: number; woundDamage: number; woundsRemoved: number; woundRolls: number[]
} {
  let healed = 0
  const r2 = self.tokens.regen2 ?? 0
  const r1 = self.tokens.regen1 ?? 0
  if (r2 > 0) { healed += 2 * r2; self.tokens.regen2 = 0; self.tokens.regen1 = Math.min(REGEN_CAP, r1 + r2) }
  const r1b = self.tokens.regen1 ?? 0
  if (r1 > 0) { healed += 1 * r1; self.tokens.regen1 = r1b - r1 } // seuls les ① présents AVANT le flip soignent 1 et partent
  self.hp = Math.min(self.hp + healed, 60)

  let woundDamage = 0, woundsRemoved = 0
  const woundRolls: number[] = []
  const wounds = self.tokens.wound ?? 0
  for (let i = 0; i < wounds; i++) {
    woundDamage += 1
    const roll = rollDie(rng)
    woundRolls.push(roll)
    if (roll >= 4) woundsRemoved += 1
  }
  self.hp -= woundDamage
  self.tokens.wound = wounds - woundsRemoved
  return { healed, woundDamage, woundsRemoved, woundRolls }
}

// Défense Thick Hide (rulings user) : 2 dés (4 en Bear). Contre 1/Claw toujours ;
// prévention 1/Paw + 1/Nature en Bear SEULEMENT.
export function thickHideDiceCount(p: PlayerState): number {
  return formOf(p) === 'bear' ? 4 : 2
}
export function thickHideEffects(dice: number[], bear: boolean): { counterDamage: number; prevented: number } {
  let a = 0, b = 0, c = 0
  for (const d of dice) {
    const s = drFaceToSymbol(d)
    if (s === 'A') a += 1
    else if (s === 'B') b += 1
    else c += 1
  }
  return { counterDamage: a, prevented: bear ? b + c : 0 }
}

// Maul : 2d6 somme ; en Bear, peut relancer UN des deux (heuristique : relance le plus petit
// s'il est <= 3 — E passe de 7 à ~8.17).
export function maulRoll(rng: RNG, bear: boolean): { dice: number[]; total: number; rerolled: boolean } {
  const d = [rollDie(rng), rollDie(rng)]
  let rerolled = false
  if (bear) {
    const iMin = d[0] <= d[1] ? 0 : 1
    if (d[iMin] <= 3) { d[iMin] = rollDie(rng); rerolled = true }
  }
  return { dice: d, total: d[0] + d[1], rerolled }
}
