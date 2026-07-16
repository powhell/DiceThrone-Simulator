// Mythic Brawler — mécaniques propres (characters/Mythic_Brawler/SPEC.md vérifiée + rulings
// user 2026-07-16). Dé : 1-3 Fist (A), 4-5 Spirit (B), 6 Peak (C).
// « Gain 1 Strength » = CHOIX parmi 3 jetons non transférables :
//   - Ocean (cap 3)   : à l'Upkeep, 1×/tour — 1 jeton -> +1 CP ; 2 jetons -> +1 CP et Heal 2.
//   - Mountain (cap 2): +1 dmg d'Attaque par jeton. Persistent.
//   - Sky (cap 2)     : +1 dé par jeton en activant la Defensive Ability. Persistent.
// Concussion (négatif, cap 1) : le porteur SAUTE sa prochaine Income Phase puis retire le jeton.
// IA : choix de Strength par heuristique Mountain -> Sky -> Ocean (ordre aligné sur les valeurs
// EV du solveur, characters/mythicbrawler/constants.ts). TODO : prompt humain si demandé.
import type { PlayerState, Tokens } from '../types.js'
import { emptyBag } from '../tokens.js'

export const OCEAN_CAP = 3
export const MOUNTAIN_CAP = 2
export const SKY_CAP = 2
export const CONCUSSION_CAP = 1
export const HEAL_CAP = 60
export const KAPU_PREVENT = 4

export function createInitialMBTokens(): Tokens {
  return emptyBag() // aucun jeton de départ (ruling user 2026-07-16)
}

export type StrengthKind = 'strengthMountain' | 'strengthSky' | 'strengthOcean'

// Un gain précis (cartes Enjoy the View/Explosive Flex/Tidal Blow…). Retourne le gain réel (cap).
export function gainStrengthOf(p: PlayerState, kind: StrengthKind): number {
  const cap = kind === 'strengthOcean' ? OCEAN_CAP : kind === 'strengthMountain' ? MOUNTAIN_CAP : SKY_CAP
  const before = p.tokens[kind] ?? 0
  p.tokens[kind] = Math.min(cap, before + 1)
  return p.tokens[kind] - before
}

// « Gain 1 Strength » générique : heuristique Mountain -> Sky -> Ocean (premier slot non plein).
// Retourne le jeton choisi, ou null si les trois sont au cap (le gain échoue silencieusement).
export function chooseStrengthKind(p: PlayerState): StrengthKind | null {
  if ((p.tokens.strengthMountain ?? 0) < MOUNTAIN_CAP) return 'strengthMountain'
  if ((p.tokens.strengthSky ?? 0) < SKY_CAP) return 'strengthSky'
  if ((p.tokens.strengthOcean ?? 0) < OCEAN_CAP) return 'strengthOcean'
  return null
}

export function gainStrength(p: PlayerState): StrengthKind | null {
  const kind = chooseStrengthKind(p)
  if (kind) gainStrengthOf(p, kind)
  return kind
}

export function totalStrengths(p: PlayerState): number {
  return (p.tokens.strengthOcean ?? 0) + (p.tokens.strengthMountain ?? 0) + (p.tokens.strengthSky ?? 0)
}

export function inflictConcussion(target: PlayerState): number {
  const before = target.tokens.concussion ?? 0
  target.tokens.concussion = Math.min(CONCUSSION_CAP, before + 1)
  return target.tokens.concussion - before
}

// Dépense d'Ocean à l'Upkeep (1×/tour). Heuristique IA : 2 jetons (CP + Heal 2) si blessé,
// sinon 1 jeton (+1 CP) — un jeton banké reste dépensable plus tard ou via Sea Song! (2 CP).
export function oceanUpkeepChoice(p: PlayerState): 0 | 1 | 2 {
  const held = p.tokens.strengthOcean ?? 0
  if (held >= 2 && p.hp <= HEAL_CAP - 16) return 2 // blessé : le heal 2 vaut plus que le 2e CP différé
  return held >= 1 ? 1 : 0
}

export function spendOcean(p: PlayerState, count: 1 | 2): { cp: number; heal: number } {
  p.tokens.strengthOcean = Math.max(0, (p.tokens.strengthOcean ?? 0) - count)
  return count === 2 ? { cp: 1, heal: 2 } : { cp: 1, heal: 0 }
}

// Wrassle (défense, 2 dés ; II : 3 ; +1 dé par Sky) : 1 dmg × Fist, Heal 1 × Spirit,
// On Peak (une fois) gain 1 Strength. Aucune prévention.
export function wrassleEffects(dice: number[]): { counterDamage: number; heal: number; strengthOnPeak: boolean } {
  const fists = dice.filter(d => d <= 3).length
  const spirits = dice.filter(d => d === 4 || d === 5).length
  const peaks = dice.filter(d => d === 6).length
  return { counterDamage: fists, heal: spirits, strengthOnPeak: peaks >= 1 }
}

// Spirit Strike II : « If you use a 6 in this straight, Heal 1 » — la seule suite de 4 qui
// contient un 6 est 3-4-5-6 (une grande suite 2-6 la contient aussi).
export function straightUsesSix(dice: number[]): boolean {
  const set = new Set(dice)
  return set.has(3) && set.has(4) && set.has(5) && set.has(6)
}
