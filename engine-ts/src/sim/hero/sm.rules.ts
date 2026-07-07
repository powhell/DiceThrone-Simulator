// Spider-Man (Miles Morales) — mécaniques propres (SPEC.md vérifiée + rulings user 2026-07-06).
// Combo : Offensive Roll Phase additionnelle (dépense à la fin de la Defensive Roll Phase
// adverse, 1x/tour). Webbed : 2 dmg isolés indéfendables à l'infliction + la prochaine attaque
// normale subie devient indéfendable (jeton retiré). Invisibility : quand attaqué en
// indéfendable, peut se dépenser pour activer une Defensive Ability. Tous stack 1.
import type { PlayerState, Tokens } from '../types.js'
import { emptyBag } from '../tokens.js'

export const COMBO_CAP = 1
export const WEBBED_CAP = 1
export const INVIS_CAP = 1

export function createInitialSMTokens(): Tokens {
  return emptyBag()
}

// Jetons Unique (stack 1) : le gain à cap est perdu. Retourne combien ont vraiment été gagnés.
export function gainCombo(p: PlayerState): number {
  const before = p.tokens.combo ?? 0
  p.tokens.combo = Math.min(COMBO_CAP, before + 1)
  return p.tokens.combo - before
}

export function gainInvisibility(p: PlayerState): number {
  const before = p.tokens.invisibility ?? 0
  p.tokens.invisibility = Math.min(INVIS_CAP, before + 1)
  return p.tokens.invisibility - before
}

// Webbed (texte vérifié) : « When this token is inflicted deal 2 as an isolated source of
// undefendable dmg. » Stack 1 : si la cible est déjà Webbed, le jeton ne peut pas être infligé
// — pas de jeton ET pas les 2 dégâts (le "when inflicted" ne se déclenche pas).
export function inflictWebbed(target: PlayerState): { gained: boolean; isoDamage: number } {
  if ((target.tokens.webbed ?? 0) >= WEBBED_CAP) return { gained: false, isoDamage: 0 }
  target.tokens.webbed = 1
  return { gained: true, isoDamage: 2 }
}

// Spider-Sense (Defense Roll 2, board vérifié) : « On Spider, prevent 1/2 dmg (rounded up) »
// — UNE fois si >=1 Spider (ruling user « on » = une fois). Swing Escape! : réussit sur Web
// (4-5) au lieu de Spider (6).
export function spiderSenseSuccess(dice: number[], swingEscape: boolean): boolean {
  return swingEscape ? dice.some(d => d >= 4 && d <= 5) : dice.some(d => d === 6)
}

export function spiderSensePrevention(incomingDamage: number): number {
  return Math.ceil(incomingDamage / 2)
}

// Counterpunch (Defense Roll 3, board vérifié) : 1 dmg à l'attaquant par Thwip (1-3).
export function counterpunchDamage(dice: number[]): number {
  return dice.filter(d => d <= 3).length
}

// Choix IA entre les deux défenses. EV : Counterpunch = 3 dés x P(Thwip)=1/2 = 1,5 contre-dmg.
// Spider-Sense = P(succès) x ceil(dmg/2) prévenu ; P = 1-(5/6)^2 ~ 0,31 (2 dés), ~0,52 avec le
// Roll Attempt additionnel d'Invisibility (4 dés effectifs). La prévention protège les PV
// directement — on la choisit dès qu'elle vaut le contre-dmg attendu.
export function chooseDefenseHeuristic(incomingDamage: number, hasInvisibility: boolean): 'sense' | 'counter' {
  const pSense = hasInvisibility ? 1 - Math.pow(5 / 6, 4) : 1 - Math.pow(5 / 6, 2)
  return pSense * spiderSensePrevention(incomingDamage) >= 1.5 ? 'sense' : 'counter'
}
