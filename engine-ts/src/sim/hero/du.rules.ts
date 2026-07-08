// Duelist — mécaniques propres (characters/Duelist/SPEC.md vérifiée + rulings user 2026-07-07).
// Footwork Track : position -2..+2 sur PlayerState.footwork (+2 = +3 Offensive, +1 = +1 Offensive,
// 0 = Neutral, -1 = Defensive pige-1-carte, -2 = Defensive prévient-3). UN seul Bonus résolu par
// tour (offensif OU défensif) — flag footworkBonusUsedThisTurn, remis à zéro pour les DEUX joueurs
// à chaque upkeep (le bonus défensif se consomme pendant le tour adverse).
// Guard Break : IDENTIQUE à Thor (tryGuardBreak de th.rules.ts, réutilisé tel quel).
// Disarm (stack 1) : à l'upkeep du porteur — défausser 1 carte OU sauter l'Income Phase.
// Reposition (passif, upkeep) : DOIT prendre 1 ou 2 Steps dans UNE direction choisie ;
// recul d'EXACTEMENT 1 step => gagne Guard Break (dos du leaflet : 2 steps back = PAS de GB).
import type { PlayerState, Tokens } from '../types.js'
import type { RNG } from '../rng.js'
import { emptyBag } from '../tokens.js'
import { gainGb } from './th.rules.js'

export const FOOTWORK_MIN = -2
export const FOOTWORK_MAX = 2

export function createInitialDUTokens(): Tokens {
  return emptyBag() // le jeton Footwork démarre en Neutral = PlayerState.footwork 0/undefined
}

export function footworkPos(p: PlayerState): number {
  return p.footwork ?? 0
}

// Bouge le jeton de `delta` cases (positif = forward/up, négatif = backward/down), borné aux
// extrémités (ruling : les Steps au-delà sont perdus). Retourne le déplacement effectif.
export function takeSteps(p: PlayerState, delta: number): number {
  const before = footworkPos(p)
  const after = Math.max(FOOTWORK_MIN, Math.min(FOOTWORK_MAX, before + delta))
  p.footwork = after
  return after - before
}

// Offensive Bonus (Attack Modifier) de la position FINALE : +1 / +3 dmg. 0 si déjà consommé.
export function offensiveBonusDmg(pos: number): number {
  return pos === 2 ? 3 : pos === 1 ? 1 : 0
}

// Defensive Bonus de la position FINALE (attaqué avec dégâts NORMAUX seulement) :
// -1 => pige 1 carte ; -2 => prévient 3 dmg (icônes leaflet + ruling user 2026-07-07).
export function defensiveBonus(pos: number): { prevent: number; draw: number } {
  return pos === -2 ? { prevent: 3, draw: 0 } : pos === -1 ? { prevent: 0, draw: 1 } : { prevent: 0, draw: 0 }
}

// Reposition (upkeep, OBLIGATOIRE) : 1 ou 2 Steps dans une direction. Une direction où aucun
// mouvement n'est possible (déjà au bout) n'est pas un choix légal — forcé de l'autre côté.
export function repositionLegalDirections(p: PlayerState): Array<'forward' | 'backward'> {
  const pos = footworkPos(p)
  const dirs: Array<'forward' | 'backward'> = []
  if (pos < FOOTWORK_MAX) dirs.push('forward')
  if (pos > FOOTWORK_MIN) dirs.push('backward')
  return dirs
}

export function applyReposition(p: PlayerState, direction: 'backward' | 'forward', steps: 1 | 2): { moved: number; gbGained: number } {
  const delta = direction === 'forward' ? steps : -steps
  const moved = takeSteps(p, delta)
  // Ruling CORRIGÉ (user 2026-07-08, à la table) : « If you move backwards with this Ability,
  // gain Guard Break » — TOUT recul (1 OU 2 steps) donne le jeton. (L'ancienne lecture
  // « exactement 1 » était fausse.)
  const gbGained = direction === 'backward' && moved < 0 ? gainGb(p, 1) : 0
  return { moved, gbGained }
}

// En Garde (CBBB) : 8 dmg et lance 4 dés — sur >=1 Pierce (6), inflige Disarm (stack 1).
export function enGardeRoll(rng: RNG): { dice: number[]; disarm: boolean } {
  const dice: number[] = []
  for (let i = 0; i < 4; i++) dice.push(Math.floor(rng() * 6) + 1)
  return { dice, disarm: dice.some(d => d === 6) }
}

// Retreat (défense, 4 dés) : 1 dmg par 2 Blades (II : par Blade) ; pour CHAQUE Boot/Pierce
// roulé, 1 Step backward OBLIGATOIRE (bouge le jeton même si le Bonus du tour est consommé —
// la position finale détermine le Defensive Bonus de l'attaque en cours).
export function retreatEffects(dice: number[], upgraded: boolean): { counterDamage: number; forcedBackSteps: number } {
  const blades = dice.filter(d => d <= 3).length
  const nonBlades = dice.length - blades
  return {
    counterDamage: upgraded ? blades : Math.floor(blades / 2),
    forcedBackSteps: nonBlades,
  }
}

// Disarm (stack 1) : l'infliction à cap échoue silencieusement.
export function inflictDisarm(target: PlayerState): number {
  const before = target.tokens.disarm ?? 0
  target.tokens.disarm = Math.min(1, before + 1)
  return target.tokens.disarm - before
}
