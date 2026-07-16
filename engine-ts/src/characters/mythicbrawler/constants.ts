// Mythic Brawler — valeurs EV (characters/Mythic_Brawler/SPEC.md vérifiée, scans + rulings
// 2026-07-16). Dégâts/exigences = scans. Valeurs de jetons = ESTIMATIONS à calibrer (banc).
// L'ordre Mountain > Sky > Ocean doit rester aligné sur l'heuristique de choix du moteur
// (mb.rules.ts chooseStrengthKind) — le solveur suppose le même choix.
export const MOUNTAIN_VALUE = 1.5 // +1 dmg par Attaque, persistant (cap 2)
export const SKY_VALUE = 1.2 // +1 dé de défense, persistant (cap 2) ; carburant Flying Punch!
export const OCEAN_VALUE = 1.1 // ~1 CP différé à l'Upkeep (cap 3) ; carburant Sea Song!
export const CONCUSSION_VALUE = 1.8 // l'adversaire saute son Income (1 CP + 1 pioche)
export const HEAL_VALUE = 1.0
export const CARD_VALUE = 1.0
export const CP_TO_DMG_EQUIV = 1.15

export const STRONG_ARM_DMG_WIN = 6 // + gain 1 Strength
export const STRONG_ARM_DMG_LOSE = 7
export const STRONG_ARM_WIN_P = 21 / 36 // « equal or greater » : l'attaquant gagne l'égalité

export const TIDAL_DMG = 6
// Dé bonus I : (3/6)·+2 dmg ; (2/6) pioche 1 ; (1/6) Concussion
export const TIDAL_BONUS_E_DMG = 1.0
export const TIDAL_BONUS_P_DRAW = 2 / 6
export const TIDAL_BONUS_P_CONC = 1 / 6
// II : 2 dés — +2 dmg PAR Fist (E = 2·(1/2)·2 = 2.0) ; « On Spirit » (une fois) p = 1-(4/6)² ;
// « On Peak » (une fois) p = 1-(5/6)²
export const TIDAL_II_E_DMG = 2.0
export const TIDAL_II_P_DRAW = 1 - (4 / 6) ** 2
export const TIDAL_II_P_CONC = 1 - (5 / 6) ** 2

export const CLOBBER_DMG = [5, 7] // [4A, 5A]
export const CLOBBER_DMG_II = [6, 7]

export const HEALING_WIND_HEAL = 3

export const ANCESTRAL_DMG = 7 // indéfendable
export const ANCESTRAL_DMG_II = 9

export const SPIRIT_STRIKE_DMG = 7
export const SPIRIT_STRIKE_DMG_II = 8

export const TECTONIC_DMG = 10
export const TECTONIC_DMG_II = 12
export const TECTONIC_SPEND_BONUS = 3 // I : retirer 1 Mountain -> +3 dmg

export const KNOCK_OUT_DMG = 3 // indéfendable (Tectonic Punch II)
export const ULT_DMG = 12 // indéfendable + 2 Strengths + Concussion

// Valeur de « Gain N Strengths » depuis l'état courant : remplit les slots dans l'ordre de
// l'heuristique moteur (Mountain -> Sky -> Ocean), somme la valeur marginale de chaque jeton.
export function strengthGainValue(n: number, ocean: number, mountain: number, sky: number): number {
  let v = 0
  let o = ocean, m = mountain, s = sky
  for (let i = 0; i < n; i++) {
    if (m < 2) { v += MOUNTAIN_VALUE; m++ }
    else if (s < 2) { v += SKY_VALUE; s++ }
    else if (o < 3) { v += OCEAN_VALUE; o++ }
  }
  return v
}
