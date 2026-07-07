// Spider-Man — valeurs EV (SPEC.md vérifiée). Les valeurs de jetons sont des ESTIMATIONS
// initiales à calibrer (banc calibration/), comme rv/dr/th.
export const COMBO_VALUE = 4.7 // calibré v5 : 4.68±1.98 — le Combo vaut vraiment une attaque
export const WEBBED_VALUE = 1.5 // calibré v5 : 1.49±1.57 (j'avais surévalué la conversion indéf)
export const INVIS_VALUE = 0.3 // calibré v5 : -1.42±1.65 (à peu près nul — plancher conservateur)
export const HEAL_VALUE = 1.0
export const CP_TO_DMG_EQUIV = 0.8 // calibré v5 : bruité (-1.08±1.28), aligné sur th/py ~0.8
export const CARD_DRAW_VALUE = 1.2

export const PUNCH_DMG = [4, 5, 6] // 3/4/5 Thwip
export const PUNCH_DMG_II = [5, 6, 7]
export const CCC_COMBO_DMG = 5
export const CCC_COMBO_DMG_II = 6
export const SPIDER_REFLEXES_EV = 7 // 2d6, dégâts = somme
export const SPIDER_REFLEXES_P_COMBO = 10 / 36 // P(total <= 5)
export const WALL_CRAWLER_DMG = 7
export const ENSNARE_SMALL_DMG = 5
export const ENSNARE_SMALL_DMG_II = 6
export const ENSNARE_LARGE_DMG = 8
export const ENSNARE_LARGE_DMG_II = 9
export const VENOM_PUNCH_DMG = 7
export const VENOM_PUNCH_DMG_II = 8
export const VENOM_SHOCKWAVE_DMG = 13
export const COMBO_UP_DMG = 2
