// Verified against the official Dice Throne rulebook screenshots in characters/rules/
// (Game Setup, Income Phase, Combat Points, Discard Phase — 2026-07-01). All 1v1 numbers.
export const STARTING_HP = 50
export const STARTING_CP = 2
export const CP_CAP = 15
export const CP_INCOME_PER_TURN = 1 // Income Phase; Start Player skips their first Income Phase
export const STARTING_HAND_SIZE = 4 // draw top 4 of shuffled deck during setup
export const MAX_HAND_SIZE = 6 // Discard Phase: sell down to this many, +1 CP per card sold
export const HEAL_CAP_ABOVE_STARTING = 10 // max HP = starting HP + 10

// Real, guide-confirmed starting resource (Black_Widow_Guide.md, Red Room Training):
// "Commence avec 3 Covert Ops."
export const BW_STARTING_COVERT_OPS = 3
