// Thor — valeurs EV (SPEC.md vérifiée). Les valeurs de jetons sont des ESTIMATIONS
// initiales à calibrer (banc calibration/), comme rv/dr.
export const EK_VALUE = 0.5 // valeur d'un gain UNITAIRE (marginal bas mesuré ~0.45) — l'échelle complète est EK_MARGINAL
// calibré v5 : cumuls mesurés 0.46 (1) / 0.91 (2) / 3.43 (4) — CONVEXE : le 4e jeton porte la
// pioche. Un 0.85 à plat gonflait Mighty Summon/les navettes et Thor se buffait au lieu
// d'attaquer (36% -> 29% mesuré). Gains multiples : ekValueOfGaining.
export const EK_MARGINAL = [0.45, 0.45, 0.55, 2.0]
export function ekValueOfGaining(current: number, gained: number): number {
  let total = 0
  for (let i = 0; i < gained; i++) {
    const idx = current + i
    if (idx >= EK_MARGINAL.length) break
    total += EK_MARGINAL[idx]
  }
  return total
}
export const GB_VALUE = 1.2 // calibré v5 : 1er jeton 1.37, cumul 2 = 2.40 -> moyenne 1.2 (le flat 1.35 sur-payait les gains x2)
export const HEAL_VALUE = 1.0
export const CP_TO_DMG_EQUIV = 0.85 // calibré v5 : 0.86±1.26
export const CARD_DRAW_VALUE = 1.2

export const HAMMERED_DMG = [4, 5, 7] // 3/4/5 marteaux
export const HAMMERED_DMG_II = [5, 6, 7]
export const HAMMERED_DMG_III = [5, 6, 8]
export const MIGHTY_SUMMON_HEAL = 2
export const MIGHTY_SUMMON_HEAL_II = 3
export const MIGHTY_SUMMON_COLLATERAL = 3
export const MIGHTY_SUMMON_COLLATERAL_II = 4
export const CHAIN_LIGHTNING_EV = 8.458 // top-2 de 3d6 (exact)
export const CHAIN_LIGHTNING_EV_II = 9.344 // top-2 de 4d6 (exact)
export const CHAIN_LIGHTNING_COLLATERAL = 2
export const CHAIN_LIGHTNING_COLLATERAL_II = 3
export const ODINFORCE_DMG = 5
export const ODINFORCE_DMG_II = 6
export const ODINFORCE_P_SHUTTLE = 0.812 // P(>=2 marteaux sur 5d6)
export const ODINFORCE_P_CP = 0.539 // P(>=2 dignes sur 5d6)
export const ODINFORCE_E_THUNDER = 5 / 6
export const BOTTLED_DMG = 7
export const BOTTLED_DMG_II = 8
export const LIGHTNING_ROD_DMG = 7
export const LIGHTNING_ROD_DMG_MJOLNIR = 9
export const LIGHTNING_ROD_DMG_II = 9
export const THUNDER_BOLT_DMG = 10
export const THUNDER_BOLT_DMG_II = 12
export const FOR_ASGARD_DMG = 14
export const BOOM_BOOM_DMG = 6
export const ASGARDIAN_BRAWN_HEAL = 4
export const RICOCHET_STEPS = 6
