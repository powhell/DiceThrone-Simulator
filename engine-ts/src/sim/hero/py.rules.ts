// Pyromancer — mécaniques propres (SPEC.md vérifiée + rulings user 2026-07-06).
// Fire Mastery : stack 5 (+fmCapBonus permanent), -1 obligatoire à SON upkeep (« cool off »).
// Burn : 2 dmg à l'upkeep du porteur, persistant. Knockdown : payer 2 CP avant son Offensive
// Roll Phase sinon la sauter (choix du porteur — ruling). Stun : le porteur ne peut rien faire
// pendant l'Attaque ; après, l'infligeur retire le jeton et refait une Offensive Roll Phase.
import type { PlayerState, Tokens } from '../types.js'
import { emptyBag } from '../tokens.js'

export const FM_BASE_CAP = 5
export const BURN_UPKEEP_DMG = 2
export const KNOCKDOWN_COST = 2

export function createInitialPYTokens(): Tokens {
  return emptyBag()
}

export function fmCap(p: PlayerState): number {
  return FM_BASE_CAP + (p.fmCapBonus ?? 0)
}

export function gainFm(p: PlayerState, n: number): number {
  const before = p.tokens.fireMastery ?? 0
  p.tokens.fireMastery = Math.min(fmCap(p), before + n)
  return p.tokens.fireMastery - before
}

// « cool off » (leaflet vérifié) : à SON upkeep, retirer 1 FM (obligatoire).
export function coolOff(p: PlayerState): boolean {
  if ((p.tokens.fireMastery ?? 0) <= 0) return false
  p.tokens.fireMastery -= 1
  return true
}

// Jetons négatifs stack 1 : l'infliction à cap échoue silencieusement (retourne 0/1 gagné).
export function inflictNegative(target: PlayerState, kind: 'burn' | 'knockdown' | 'stun'): number {
  const before = target.tokens[kind] ?? 0
  target.tokens[kind] = Math.min(1, before + 1)
  return target.tokens[kind] - before
}

// Molten Armor (Defense Roll 5, board vérifié). Faces : 1-3 Flame, 4 Blaze, 5 Fiery Soul, 6 Meteor.
// I : +1 FM par Fiery Soul, 1 dmg par Flame. II : + Burn si >=1 Flame ET >=1 Blaze (ruling user).
// III : FM aussi par Meteor, dmg aussi par Meteor.
export function moltenArmorEffects(dice: number[], tier: 1 | 2 | 3): { fmGain: number; counterDamage: number; inflictBurn: boolean } {
  const flames = dice.filter(d => d <= 3).length
  const blazes = dice.filter(d => d === 4).length
  const souls = dice.filter(d => d === 5).length
  const meteors = dice.filter(d => d === 6).length
  return {
    fmGain: souls + (tier >= 3 ? meteors : 0),
    counterDamage: flames + (tier >= 3 ? meteors : 0),
    inflictBurn: tier >= 2 && flames >= 1 && blazes >= 1,
  }
}

// Pyroblast / Huzzah! : effets d'un dé bonus (1-3 F: +3 dmg ; 4 B: Burn ; 5 S: +2 FM ; 6 M: Knockdown).
export function pyroBonusDieEffects(face: number): { addDmg: number; burn: boolean; fm: number; knockdown: boolean } {
  return {
    addDmg: face <= 3 ? 3 : 0,
    burn: face === 4,
    fm: face === 5 ? 2 : 0,
    knockdown: face === 6,
  }
}
