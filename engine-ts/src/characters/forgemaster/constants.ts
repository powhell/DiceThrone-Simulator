// Forgemaster (fm) — dégâts imprimés vérifiés (sim/data/characters/fm/hero.json, scans user).
// Les poids "équivalent-dégâts" (valeur d'un CP, d'une pioche, d'un Mine...) sont des
// BOOTSTRAPS PROVISOIRES : ce perso n'a AUCUN guide — ces valeurs seront remplacées par la
// mesure contrefactuelle (calibration/) dès que le perso roule en self-play. Ne pas les
// affiner à la main.
export const PICK_AXE_3A = 5.0
export const PICK_AXE_4A = 6.0
export const PICK_AXE_5A = 7.0

export const FURNACE_BASE = 5.0
export const FURNACE_BONUS_ROLL_EV = 3.5 // "roll 1 die: add dmg equal to the value" — E[1d6] exact

export const SMELTING_TIME_UNDEFENDABLE = 9.0

export const A_GOOD_HAUL_DMG = 8.0

export const ARMORED_UP_SMALL = 7.0
export const ARMORED_UP_LARGE = 10.0
export const ARMORED_UP_2ARMOR_BONUS = 2.0

export const FINAL_TOUCHES_VALUE = 14.0

// --- CALIBRÉ 2026-07-05 (calibration v2, fm vs bw greedy — première mesure, à raffiner
// après ré-entraînement RL). Un Gold Ore posé sur la Forge = 2.2 dmg-equiv (mesuré 4.33/2) ;
// armures tier 1 ≈ 5.6-6.3. ---
export const CP_TO_DMG_EQUIV = 0.75  // aligné HH mesuré (le greedy fm ne dépense pas : 0 mesuré)
export const CARD_DRAW_VALUE = 1.3   // mesuré 1.27±0.22
export const MINE_VALUE = 2.0        // P(Ore dans le top 3)≈0.87 x 2.2 + 0.13 x 0.75 CP
export const ORE_TUTOR_VALUE = 2.2   // Final Touches! choisit son Ore (≥ valeur d'un Gold posé)
export const WHIFF_VALUE = 0.0
