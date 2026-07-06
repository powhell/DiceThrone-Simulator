// Raveness — mécaniques propres (board + leaflet vérifiés, scans user 2026-07-06).
// Rulings user : défense = seuils UNE fois ; Nevermore Die Roll face 6 = PAS de soin ;
// Fowl Friend II = BBB.
import type { PlayerState, Tokens } from '../types.js'
import { emptyBag } from '../tokens.js'

export const FEATHER_CAP_BASE = 5
export const NEVERMORE_DIAL_CAP = 3

export function createInitialRVTokens(): Tokens {
  // Nevermore démarre sur le board de la Raveness (cadran 0 — champ nevermoreDial du joueur).
  return { ...emptyBag(), nevermore: 1 }
}

export function rvFaceToSymbol(face: number): 'A' | 'B' | 'C' {
  return face <= 3 ? 'A' : face <= 5 ? 'B' : 'C'
}

export function featherCap(self: PlayerState): number {
  return FEATHER_CAP_BASE + (self.featherCapBonus ?? 0)
}

export function grantFeathers(self: PlayerState, n: number): number {
  const cap = featherCap(self)
  const before = self.tokens.feather ?? 0
  const after = Math.min(cap, before + n)
  self.tokens.feather = after
  return after - before
}

// Une activation de Nevermore : le choix (move/absorb) vient de la Policy ou du joueur.
// Retourne un résumé pour le log. rvIdx = la Raveness ; holderIdx = où est Nevermore.
export interface NevermoreActivation {
  choice: 'moveToSelf' | 'moveToOpponent' | 'absorb'
  healed?: number
  absorbDamage?: number
  dialAfter?: number
}

export function nevermoreHolder(state: { players: PlayerState[] }): 0 | 1 {
  return (state.players[0].tokens.nevermore ?? 0) > 0 ? 0 : 1
}

export function applyNevermoreActivation(
  rv: PlayerState, opp: PlayerState, rvIsHolder: boolean,
  choice: 'move' | 'absorb',
): NevermoreActivation {
  if (choice === 'absorb') {
    // Absorb Vitality : seulement si Nevermore est SUR un adversaire.
    // Cadran +1 (max 3), l'adversaire prend 1 indéfendable isolé (appliqué par l'appelant).
    rv.nevermoreDial = Math.min(NEVERMORE_DIAL_CAP, (rv.nevermoreDial ?? 0) + 1)
    return { choice: 'absorb', absorbDamage: 1, dialAfter: rv.nevermoreDial }
  }
  if (rvIsHolder) {
    // move : Raveness -> adversaire
    rv.tokens.nevermore = 0
    opp.tokens.nevermore = 1
    return { choice: 'moveToOpponent' }
  }
  // move : adversaire -> Raveness : SOIGNE le cadran puis remet à 0 (règle vérifiée)
  opp.tokens.nevermore = 0
  rv.tokens.nevermore = 1
  const healed = rv.nevermoreDial ?? 0
  rv.hp = Math.min(rv.hp + healed, 60) // 50 + cap soin 10 (norme)
  rv.nevermoreDial = 0
  return { choice: 'moveToSelf', healed }
}

// Nevermore Die Roll (upkeep de l'adversaire détenteur). Applique les faces 1/4/5/6 ici ;
// les faces 2/3 (activations de la Raveness) sont retournées à l'appelant qui les résout
// avec la Policy. Face 6 : cadran à 0 PUIS retour — PAS de soin (ruling user).
export interface NevermoreDieRollResult {
  face: number
  hexInflicted?: boolean
  discards?: number
  cpStolen?: number
  activations?: number
  returned?: boolean
}

export function applyNevermoreDieFace(rv: PlayerState, holder: PlayerState, face: number): NevermoreDieRollResult {
  switch (face) {
    case 1:
      holder.tokens.hex = 1
      return { face, hexInflicted: true }
    case 2: return { face, activations: 2 }
    case 3: return { face, activations: 1 }
    case 4: return { face, discards: 1 } // défausse au choix du détenteur (Policy/joueur)
    case 5: {
      const stolen = Math.min(1, holder.cp)
      holder.cp -= stolen
      rv.cp = Math.min(15, rv.cp + stolen)
      return { face, cpStolen: stolen }
    }
    default: {
      rv.nevermoreDial = 0
      holder.tokens.nevermore = 0
      rv.tokens.nevermore = 1
      return { face, returned: true } // pas de soin (ruling user)
    }
  }
}

// Défense « Nothing More » : 5 dés — seuils UNE fois (ruling user).
// Base : ≥2 Talons -> 2 contre-dégâts ; ≥2 Wings -> prévient 2 ; ≥2 Eyes -> 1 activation.
// II : 1 contre-dégât PAR Talon ; les seuils Wings/Eyes inchangés.
export function nothingMoreEffects(dice: number[], upgraded: boolean): {
  counterDamage: number; prevented: number; activations: number
} {
  let a = 0, b = 0, c = 0
  for (const d of dice) {
    const s = rvFaceToSymbol(d)
    if (s === 'A') a += 1
    else if (s === 'B') b += 1
    else c += 1
  }
  return {
    counterDamage: upgraded ? a : (a >= 2 ? 2 : 0),
    prevented: b >= 2 ? 2 : 0,
    activations: c >= 2 ? 1 : 0,
  }
}
