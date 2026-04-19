// Baton Strike (basic) — b = number of Batons kept
export const BATON_STRIKE_3B = 5.0
export const BATON_STRIKE_4B = 6.0
export const BATON_STRIKE_5B = 7.0

// Infiltrate (2A 1B 1C) — pure utility: 1 Agility gained + 1 TB inflicted
export const INFILTRATE_BASE_DMG = 0.0
export const INFILTRATE_TB_INFLICTED = 1
export const INFILTRATE_AGILITY_GAIN = 1

// Widow's Gauntlets (3A 2B) — base 6 + 1 CP + (upgrades × 1)
export const GAUNTLETS_BASE_DMG = 6.0
export const GAUNTLETS_CP_GAIN = 1

// Hacked (small straight) — 5 base, +2 at upgrades≥3, inflicts 1 TB
export const HACKED_BASE_DMG = 5.0
export const HACKED_THRESHOLD_UPGRADES = 3
export const HACKED_THRESHOLD_BONUS = 2.0
export const HACKED_TB_INFLICTED = 1

// Grapple (4C) — 5 undefendable base + 1 Agility + (upgrades × 1)
export const GRAPPLE_BASE_DMG = 5.0
export const GRAPPLE_AGILITY_GAIN = 1

// Vengeance (large straight) — 7 + 1 Agility + 4 rider dice
export const VENGEANCE_BASE_DMG = 7.0
export const VENGEANCE_AGILITY_GAIN = 1
export const VENGEANCE_RIDER_DICE = 4

// Widow's Bite Ultimate (5C) — 10 + inflict 1 TB + search 2 upgrades (not modeled)
export const WIDOWS_BITE_BASE_DMG = 10.0
export const WIDOWS_BITE_TB_INFLICTED = 1

// Red Room Training passive: +1 dmg on all attacks once upgrades ≥ 5
export const RRT_THRESHOLD_UPGRADES = 5
export const RRT_ALL_ATTACK_BONUS = 1.0

// Value conversions
export const AGILITY_VALUE = 2.0          // avg dmg mitigated per Agility (per BGG guide)
export const CP_TO_DMG_EQUIV = 1.5        // same valuation as HH engine

export const WHIFF_VALUE = 0.0
