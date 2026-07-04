// Baton Strike (basic) — b = number of Batons kept
export const BATON_STRIKE_3B = 5.0
export const BATON_STRIKE_4B = 6.0
export const BATON_STRIKE_5B = 7.0
// Baton Strike II replaces these printed numbers (verified sim/data/characters/bw/hero.json).
export const BATON_STRIKE_3B_UPGRADED = 6.0
export const BATON_STRIKE_4B_UPGRADED = 7.0
export const BATON_STRIKE_5B_UPGRADED = 8.0

// Infiltrate (2A 1B 1C) — pure utility: 1 Agility gained + 1 TB inflicted
export const INFILTRATE_BASE_DMG = 0.0
export const INFILTRATE_TB_INFLICTED = 1
export const INFILTRATE_AGILITY_GAIN = 1

// Widow's Gauntlets (3B 2A — verified against board+card photos 2026-07-01, was
// misencoded as 3A 2B/"AAABB" before) — base 6 + 1 CP + (upgrades × 1)
export const GAUNTLETS_BASE_DMG = 6.0
export const GAUNTLETS_BASE_DMG_UPGRADED = 7.0 // Widow's Gauntlets II
export const GAUNTLETS_CP_GAIN = 1

// Hacked (small straight) — 5 base, +2 at upgrades≥3, inflicts 1 TB
export const HACKED_BASE_DMG = 5.0
export const HACKED_BASE_DMG_UPGRADED = 6.0 // Hacked II (threshold bonus still applies on top: 6+2=8)
export const HACKED_THRESHOLD_UPGRADES = 3
export const HACKED_THRESHOLD_BONUS = 2.0
export const HACKED_TB_INFLICTED = 1

// Grapple (4C) — 6 undefendable base (verified against board photo 2026-07-01, was
// wrongly 5.0) + 1 Agility + (upgrades × 1). Also grants 1 CP if >=2 Ability Upgrades in
// play (new conditional effect, not previously modeled — see GRAPPLE_CP_*).
export const GRAPPLE_BASE_DMG = 6.0
export const GRAPPLE_BASE_DMG_UPGRADED = 7.0 // Grapple II
export const GRAPPLE_AGILITY_GAIN = 1
export const GRAPPLE_CP_THRESHOLD_UPGRADES = 2
export const GRAPPLE_CP_GAIN = 1

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

// Value conversions (heuristic EV weights for the reroll-decision oracle only — NOT real
// game numbers. Real Vengeance/Grapple/Gauntlets numbers live in sim/data/characters/bw/hero.json.)
export const AGILITY_VALUE = 2.0          // avg dmg mitigated per Agility (per BGG guide)
export const CP_TO_DMG_EQUIV = 1.5        // same valuation as HH engine
export const COVERT_OPS_VALUE = 1.5       // rough EV parity with CP_TO_DMG_EQUIV

export const WHIFF_VALUE = 0.0

// Alt-abilities unlocked by Hero Upgrade cards (verified sim/data/characters/bw/hero.json
// altAbility entries — only selectable by the DP oracle when the parent upgrade's id is in
// BWState.upgradeIds, see abilities.ts getCandidates()).
export const COVERT_MISSION_DMG = 0.0 // Widow's Gauntlets II -> AABB, inflicts 1 TB
export const RECON_DMG = 0.0          // Grapple II -> CCC, +1 Agility, tutors an Ability Upgrade
export const RECON_UPGRADE_SEARCH_VALUE = 4.0 // heuristic EV of tutoring a free Ability Upgrade into play
export const SPY_GAME_DMG = 6.0       // Infiltrate II -> AABCC, undefendable, +1 Covert Ops, +1 Agility
export const SUBVERT_DMG = 0.0        // Vengeance II -> ABBB, +1 Covert Ops, +1 Agility
