// Sun Elf — valeurs EV (characters/Sun_Elf/SPEC.md vérifiée, scans + rulings 2026-07-08).
// Dégâts/exigences = scans. Valeurs de jetons/cadran = ESTIMATIONS à calibrer (banc).
export const DIAL_VALUE = 0.8 // +1 au cadran (côté DUSK : progresse vers la fenêtre DAWN)
export const DIAL_RESIDUAL_DAWN = 0.3 // valeur résiduelle d'un point de cadran APRÈS dépense DAWN
export const GEM_VALUE = 2.0 // Charged Gem : E[d6] = (2×1.15 + 2×2 + 2×3.15)/6 ≈ 2.1, cap 1
export const SUN_MARKED_VALUE = 2.5 // l'attaquant du porteur (= moi) Heal 2 PAR attaque, persistant
export const HEAL_VALUE = 1.0
export const CP_TO_DMG_EQUIV = 1.15

export const LIGHT_STAFF_DMG = [4, 5, 7]
export const LIGHT_STAFF_DMG_II = [5, 6, 7]
export const RAY_ABSORPTION_DIAL = 3
export const RAY_ABSORPTION_HEAL = 2
export const RADIANT_ENERGY_DMG = 6
export const PRAISE_THE_SUN_DMG = 5
export const SCORCHING_DMG = 5
// Dé bonus Scorching I : (3/6)·2 dmg = 1.0 dmg + (2/6)·2 dial + (1/6)·(gem + 2 dial)
export const SCORCHING_BONUS_E_DMG = 1.0
export const SCORCHING_BONUS_E_DIAL = 2 * (2 / 6) + 2 * (1 / 6)
export const SCORCHING_BONUS_P_GEM = 1 / 6
// Scorching II : 2 dés — dmg 2·E[A]=2·(2·1/2)=2.0 ; dial E[B]·1 = 2/3 ; C ≥1 : p=11/36 (gem + 2 dial)
export const SCORCHING_II_E_DMG = 2.0
export const SCORCHING_II_E_DIAL = 2 / 3 + 2 * (11 / 36)
export const SCORCHING_II_P_GEM = 11 / 36
export const RAY_OF_LIGHT_DMG = 7
export const RAY_OF_LIGHT_DIAL = 1
export const SUNBEAM_DMG = 9
export const SUNBEAM_DIAL = 2
export const SUNBEAM_DIAL_II = 3
export const SOAKING_DMG = 9
export const SOLAR_BURST_DMG = 8
export const SOLAR_BURST_DMG_II = 7 // II : INDÉFENDABLES
export const SOLAR_BURST_DIAL = 2
export const BESTOW_DIAL = 4
export const ULT_DMG = 10
export const ULT_DIAL = 3

// Gain marginal du cadran borné à 5 ; l'excès soigne 1/point.
export function dialValueOfGaining(current: number, gained: number): number {
  const toDial = Math.max(0, Math.min(5, current + gained) - Math.min(5, current))
  const excess = Math.max(0, gained - toDial)
  return toDial * DIAL_VALUE + excess * HEAL_VALUE
}
