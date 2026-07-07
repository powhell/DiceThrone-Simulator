// Druid — constantes d'EV (ESTIMATIONS INITIALES, à calibrer). Chiffres de jeu : SPEC.md
// (scans user 2026-07-06).
export const SHAPE_SHIFT_VALUE = 1.45  // calibré v5 : 1.46±1.01
export const REGEN2_VALUE = 2.9        // calibré v5 : 2.92±0.95
export const WOUND_VALUE = 1.4         // calibré v5 : 1.38±0.99
export const CARD_DRAW_VALUE = 1.3
export const CP_TO_DMG_EQUIV = 0.55 // calibré v5 : 0.52±0.84
export const HEAL_VALUE = 0.9          // 1 PV soigné ≈ un peu moins d'1 dégât

export const FEROCITY_DMG = [4, 5, 6]
export const FEROCITY_DMG_UPGRADED = [5, 6, 7]
export const MAUL_EV = 7               // 2d6
export const MAUL_EV_BEAR = 8.17       // reroll du min si <=3
export const NATURES_CURE_DMG = 5
export const FORESTS_CALL_DMG = 6
export const FORESTS_ANSWER_DMG = 7
export const PROTECT_DMG = 6
export const PROTECT_DMG_UPGRADED = 8
export const WRATH_DMG = 12
// Formes : valeur d'état par tour (approx pour le solveur)
export const CAT_ATTACK_BONUS = 2      // +2 dmg si l'attaque conclut (et +Wound)
