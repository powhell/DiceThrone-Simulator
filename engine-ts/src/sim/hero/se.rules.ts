// Sun Elf — mécaniques propres (characters/Sun_Elf/SPEC.md vérifiée + rulings user 2026-07-08).
// Sun Dial : cadran 0-5 à deux faces sur PlayerState.sunDial / sunDialDawn (setup : 0, DUSK).
//   - « Increase Sun Dial » au-delà de 5 => Heal 1 par point d'excès à la place.
//   - DUSK : upkeep +1 ; dès que le cadran AFFICHE 5 -> flip immédiat DAWN.
//   - DAWN : l'attaque PEUT ajouter la valeur du cadran en dmg (Attack Modifier, aussi sur
//     l'Ultimate — ruling) ; si oui, cadran -4 à la fin de la Roll Phase ; à 0 -> flip DUSK.
// Charged Gem (stack 1) : Main Phase, 1d6 — 1-2 : +1 CP ; 3-4 : 2 dmg isolés indéfendables ;
// 5-6 : les deux. Sun Marked (stack 1, PERSISTANT) : l'attaquant du porteur Heal 2 sur toute
// attaque qui inflige des dégâts (indéfendable incluse — ruling).
import type { PlayerState, Tokens } from '../types.js'
import type { RNG } from '../rng.js'
import { emptyBag } from '../tokens.js'

export const SUN_DIAL_MAX = 5
export const SUN_MARKED_HEAL = 2
export const DAWN_SPEND_COST = 4
export const HEAL_CAP = 60

export function createInitialSETokens(): Tokens {
  return emptyBag() // le cadran vit sur PlayerState.sunDial (0) / sunDialDawn (false = DUSK)
}

export function dialOf(p: PlayerState): number {
  return p.sunDial ?? 0
}
export function isDawn(p: PlayerState): boolean {
  return p.sunDialDawn === true
}

// Flips « immédiats » (leaflet) : DUSK à 5 -> DAWN ; DAWN à 0 -> DUSK. Appelé après chaque
// changement du cadran. Retourne le flip effectué pour le log.
function checkFlip(p: PlayerState): 'dawn' | 'dusk' | null {
  if (!isDawn(p) && dialOf(p) >= SUN_DIAL_MAX) { p.sunDialDawn = true; return 'dawn' }
  if (isDawn(p) && dialOf(p) <= 0) { p.sunDialDawn = false; return 'dusk' }
  return null
}

// « Increase Sun Dial by n » : borné à 5, l'excès soigne 1/point. Retourne gain réel/soin/flip.
export function increaseDial(p: PlayerState, n: number): { gained: number; healed: number; flipped: 'dawn' | 'dusk' | null } {
  const before = dialOf(p)
  const after = Math.min(SUN_DIAL_MAX, before + n)
  const excess = Math.max(0, before + n - SUN_DIAL_MAX)
  p.sunDial = after
  const healed = excess > 0 ? Math.min(excess, HEAL_CAP - p.hp) : 0
  if (excess > 0) p.hp = Math.min(HEAL_CAP, p.hp + excess)
  return { gained: after - before, healed: Math.max(0, healed), flipped: checkFlip(p) }
}

// Réduction (It Gives Life!/Radiant Exchange!/dépense DAWN). Retourne la réduction réelle + flip.
export function reduceDial(p: PlayerState, n: number): { reduced: number; flipped: 'dawn' | 'dusk' | null } {
  const before = dialOf(p)
  p.sunDial = Math.max(0, before - n)
  return { reduced: before - p.sunDial, flipped: checkFlip(p) }
}

// « Set Sun Dial to 5 » (The Sun's Blessing!) — passe par la même règle de flip.
export function setDialTo5(p: PlayerState): { flipped: 'dawn' | 'dusk' | null } {
  p.sunDial = SUN_DIAL_MAX
  return { flipped: checkFlip(p) }
}

// The Glorious Sun! : flip manuel (même valeur, autre face).
export function flipDial(p: PlayerState): void {
  p.sunDialDawn = !isDawn(p)
  checkFlip(p) // ex. flip vers DAWN à 0 -> re-flip immédiat DUSK ; vers DUSK à 5 -> re-flip DAWN
}

// Jetons stack 1 : l'infliction/le gain à cap échoue silencieusement.
export function gainChargedGem(p: PlayerState): number {
  const before = p.tokens.chargedGem ?? 0
  p.tokens.chargedGem = Math.min(1, before + 1)
  return p.tokens.chargedGem - before
}
export function inflictSunMarked(target: PlayerState): number {
  const before = target.tokens.sunMarked ?? 0
  target.tokens.sunMarked = Math.min(1, before + 1)
  return target.tokens.sunMarked - before
}

// Charged Gem (Main Phase) : 1d6 -> 1-2 : +1 CP ; 3-4 : 2 dmg isolés indéfendables ; 5-6 : les deux.
export function spendChargedGem(p: PlayerState, rng: RNG): { face: number; cp: number; damage: number } {
  p.tokens.chargedGem = 0
  const face = Math.floor(rng() * 6) + 1
  return { face, cp: face <= 2 || face >= 5 ? 1 : 0, damage: face >= 3 ? 2 : 0 }
}

// Scorching Staff : dé(s) bonus — A : +2 dmg ; B : Dial +2 (I) ou +1 PAR B (II) ; C : gem + Dial +2.
export function scorchingBonus(rng: RNG, upgraded: boolean): { dice: number[]; addDmg: number; dialFromB: number; gemOnC: boolean } {
  const n = upgraded ? 2 : 1
  const dice: number[] = []
  for (let i = 0; i < n; i++) dice.push(Math.floor(rng() * 6) + 1)
  const a = dice.filter(d => d <= 3).length
  const b = dice.filter(d => d === 4 || d === 5).length
  const c = dice.filter(d => d === 6).length
  return {
    dice,
    addDmg: 2 * a,
    // I : « On B » = une fois, +2 ; II : « for each B » = +1 par B (textes vérifiés)
    dialFromB: upgraded ? b : (b >= 1 ? 2 : 0),
    gemOnC: c >= 1, // « On C » = une fois (gem stack 1 de toute façon) — Dial +2 avec
  }
}

// Harness the Light (défense, 3 dés). I : Heal 1/A ; On BB (une fois) Dial +1 ; On C (une fois)
// Dial +1. II : Heal 1/A ; On B (une fois) Dial +1 ; Dial +1 PAR C ; On A+B+C -> Charged Gem.
export function harnessEffects(dice: number[], upgraded: boolean): { heal: number; dialGain: number; gem: boolean } {
  const a = dice.filter(d => d <= 3).length
  const b = dice.filter(d => d === 4 || d === 5).length
  const c = dice.filter(d => d === 6).length
  if (!upgraded) {
    return { heal: a, dialGain: (b >= 2 ? 1 : 0) + (c >= 1 ? 1 : 0), gem: false }
  }
  return { heal: a, dialGain: (b >= 1 ? 1 : 0) + c, gem: a >= 1 && b >= 1 && c >= 1 }
}
