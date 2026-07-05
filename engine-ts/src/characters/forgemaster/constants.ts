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

// --- bootstraps provisoires (à calibrer) ---
export const CP_TO_DMG_EQUIV = 1.5   // même convention que HH/BW en attendant la mesure
export const CARD_DRAW_VALUE = 2.0
export const MINE_VALUE = 1.5        // valeur d'un "Mine your deck" (Ore vers la Forge OU +1 CP)
export const ORE_TUTOR_VALUE = 2.0   // Final Touches!: tutor l'Ore de son choix sur la Forge
export const WHIFF_VALUE = 0.0
