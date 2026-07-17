// Mythic Brawler — valeurs EV (characters/Mythic_Brawler/SPEC.md vérifiée, scans + rulings
// 2026-07-16). Dégâts/exigences = scans. Valeurs de jetons = CALIBRÉES (banc calibration/
// CALIB_SET=mb, 39,6k parties vs bw greedy 2 côtés, 2026-07-17 ; étalon 1 PV = 2,45 % win).
// Marginaux PAR JETON (index = nombre déjà détenu) ; le choix « Gain 1 Strength » du moteur
// (mb.rules.ts chooseStrengthKind) prend le meilleur marginal courant — ordre effectif
// Sky1 > Mountain1 > Sky2 > Mountain2 > Ocean, aligné sur strengthGainValue ci-dessous.
export const MOUNTAIN_MARGINAL = [2.9, 1.9] // +1 dmg par Attaque, persistant (cap 2) ; ±0.4
export const SKY_MARGINAL = [4.2, 2.4] // +1 dé de défense, persistant (cap 2) ; ±0.4
export const OCEAN_MARGINAL = [0.0, 0.7, 0.65] // CP/Heal à l'Upkeep (cap 3) ; 1er jeton mesuré ≈ 0
export const CONCUSSION_VALUE = 0.6 // l'adversaire saute son Income ; mesuré 0.62 ±0.35 (ex-1.8)

export function mountainMarginal(m: number): number { return MOUNTAIN_MARGINAL[m] ?? 0 }
export function skyMarginal(s: number): number { return SKY_MARGINAL[s] ?? 0 }
export function oceanMarginal(o: number): number { return OCEAN_MARGINAL[o] ?? 0 }
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

// Valeur de « Gain N Strengths » depuis l'état courant : remplit glouton par meilleur marginal
// courant (même arbitrage que mb.rules.ts chooseStrengthKind), somme les marginaux pris.
export function strengthGainValue(n: number, ocean: number, mountain: number, sky: number): number {
  let v = 0
  let o = ocean, m = mountain, s = sky
  for (let i = 0; i < n; i++) {
    const vs = s < SKY_MARGINAL.length ? SKY_MARGINAL[s] : -1
    const vm = m < MOUNTAIN_MARGINAL.length ? MOUNTAIN_MARGINAL[m] : -1
    const vo = o < OCEAN_MARGINAL.length ? OCEAN_MARGINAL[o] : -1
    const best = Math.max(vs, vm, vo)
    if (best < 0) break
    if (best === vs) s++
    else if (best === vm) m++
    else o++
    v += best
  }
  return v
}
