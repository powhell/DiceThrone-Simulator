// Thor — valeurs EV (SPEC.md vérifiée). Les valeurs de jetons sont des ESTIMATIONS
// initiales à calibrer (banc calibration/), comme rv/dr.
export const EK_VALUE = 0.6 // REVERT aux originales — duel 240 parties : originales 26.7% > convexes 22.5%
// calibré v5 : cumuls mesurés 0.46 (1) / 0.91 (2) / 3.43 (4) — CONVEXE : le 4e jeton porte la
// pioche. Un 0.85 à plat gonflait Mighty Summon/les navettes et Thor se buffait au lieu
// d'attaquer (36% -> 29% mesuré). Gains multiples : ekValueOfGaining.
// DOSSIER OUVERT (2026-07-07) : ni les valeurs calibrées v5 (flat 0.85 : 28.9%) ni l'échelle
// convexe mesurée (22.5%) ne battent les originales (36.3% en matrice complète). Le problème
// de Thor n'est PAS ses jetons : structurel vs fm/sm (kit défendable vs défenses punitives).
// Prochaine piste : A/B au niveau des habiletés + croiser avec karnyx (stats humaines).
export const EK_MARGINAL = [0.6, 0.6, 0.6, 0.6]
export function ekValueOfGaining(current: number, gained: number): number {
  let total = 0
  for (let i = 0; i < gained; i++) {
    const idx = current + i
    if (idx >= EK_MARGINAL.length) break
    total += EK_MARGINAL[idx]
  }
  return total
}
export const GB_VALUE = 0.9 // REVERT aux originales (voir dossier ouvert ci-dessus)
export const HEAL_VALUE = 1.0
export const CP_TO_DMG_EQUIV = 1.3 // REVERT aux originales (voir dossier ouvert ci-dessus)
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
