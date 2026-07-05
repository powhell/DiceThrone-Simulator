// CALIBRÉ 2026-07-05 (voir calibration/resultats_v2_complets_20260705.txt) :
// GP mesuré 1.80±0.37 (le 1.66 du guide = mode (b) seul ; le surplus = valeur d'option du
// mode (a)) ; pioche 1.61±0.38 ; CP 0.75±0.24 (probablement borné par la politique — à
// re-mesurer après le ré-entraînement RL, ne pas descendre plus bas sans nouvelle mesure).
export const GRIM_PURSUIT_AVG_DMG = 1.8
export const CARD_DRAW_VALUE = 1.6
export const CP_TO_DMG_EQUIV = 0.75

export const SPECTRAL_ASSAULT_BASE = 8.0
export const SPECTRAL_ASSAULT_BASE_UPGRADED = 9.0 // Spectral Assault II
export const SPECTRAL_ASSAULT_PER_DREADFUL = 1.5

export const DREADFUL_CHARGE_VALUE = 15.0
export const DREADFUL_CHARGE_DREADFUL_GIVEN = 4

export const CLEAVE_3A = 4.0
export const CLEAVE_4A = 5.0
export const CLEAVE_5A = 7.0
// Cleave II replaces these printed numbers (verified sim/data/characters/hh/hero.json).
export const CLEAVE_3A_UPGRADED = 5.0
export const CLEAVE_4A_UPGRADED = 6.0
export const CLEAVE_5A_UPGRADED = 8.0

export const REAP_UNDEFENDABLE = 3.0
export const REAP_UNDEFENDABLE_UPGRADED = 4.0 // Reap II
export const REAP_DREADFUL_GIVEN = 2

export const RIDE_DOWN_BASE = 6.0
export const RIDE_DOWN_GRIM_PURSUIT = 2
export const RIDE_DOWN_GRIM_PURSUIT_UPGRADED = 3 // Ride Down II

export const SOW_SMALL_DMG = 7.0
export const SOW_SMALL_DREADFUL = 1
export const SOW_SMALL_DREADFUL_UPGRADED = 2 // Sow Despair II
export const SOW_LARGE_DMG = 9.0
export const SOW_LARGE_DMG_UPGRADED = 10.0 // Sow Despair II
export const SOW_LARGE_DREADFUL = 2
export const SOW_LARGE_DREADFUL_UPGRADED = 3 // Sow Despair II

export const HORRIFY_BASE_UNDEFENDABLE = 6.0
export const HORRIFY_DREADFUL_GIVEN = 3
export const HORRIFY_GRIM_PURSUIT_UPGRADED = 2 // Horrify II — unconditional (drops the Head XOR)

export const WHIFF_PURSUIT_TOKENS = 1

// Alt-abilities unlocked by Hero Upgrade cards (verified sim/data/characters/hh/hero.json
// altAbility entries — only selectable by the DP oracle when the parent upgrade's id is in
// HHState.upgradeIds, see abilities.ts getCandidates()).
export const GHOSTLY_CHARGE_DMG = 2.0 // Cleave II -> AABC, "pure" dmg
export const GHOSTLY_CHARGE_GRIM_PURSUIT = 2

export const CURSED_GALLOP_DMG = 1.0 // Ride Down II -> BBB
export const CURSED_GALLOP_GRIM_PURSUIT = 1

export const THE_REAPER_DMG = 4.0 // Reap II -> BBBCC, undefendable
export const THE_REAPER_DREADFUL_GIVEN = 3

export const HAUNTED_STRIKE_DMG = 4.0 // Spectral Assault II -> AACC, undefendable, no tokens

export const SPOOKY_DMG = 7.0 // Horrify II -> CCC
export const SPOOKY_GRIM_PURSUIT = 2
