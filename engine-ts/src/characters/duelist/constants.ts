// Duelist — valeurs EV (characters/Duelist/SPEC.md vérifiée, scans 2026-07-07).
// Dégâts/exigences = scans du board. Les valeurs de jetons/Steps sont des ESTIMATIONS
// initiales à calibrer (banc calibration/), comme les autres nouveaux persos.
export const GB_VALUE = 0.9 // même jeton que Thor (spend d6 4-5 -> indéfendable), même valeur de départ
export const DISARM_VALUE = 1.0 // l'adversaire perd 1 carte OU son Income Phase (~1 carte)
export const STEP_VALUE = 0.3 // valeur résiduelle d'un Step (position pour la défense/le tour suivant)
export const CP_TO_DMG_EQUIV = 1.0
export const CARD_DRAW_VALUE = 1.2

// Footwork Track (leaflet vérifié) : position -2..+2.
// Offensive Bonus (Attack Modifier, un Bonus/tour) : +1 dmg en +1, +3 dmg en +2.
export function offensiveBonusDmg(pos: number): number {
  return pos >= 2 ? 3 : pos >= 1 ? 1 : 0
}

export const BLADE_FLURRY_DMG = [4, 5, 6] // 3/4/5 Blades
export const BLADE_FLURRY_DMG_II = [5, 6, 7]
export const BALESTRA_DMG = 6
export const BALESTRA_DMG_II = 8
export const BALESTRA_STEPS = 2
export const FANCY_FEET_STEPS = 3 // alt Balestra II (BBB) : GB + up to 3 Steps
export const FEINT_ATTACK_DMG = 2 // indéfendable
export const FEINT_ATTACK_DMG_II = 3
export const EN_GARDE_DMG = 8
export const EN_GARDE_P_DISARM = 1 - Math.pow(5 / 6, 4) // P(>=1 Pierce sur 4d6) = 0.5177
export const STRIKE_SMALL_DMG = 7
export const STRIKE_LARGE_DMG = 10
export const BLADESTORM_DMG = 8
export const BLADESTORM_DMG_II = 9
export const BLADESTORM_STEPS = 2
export const BLADEWIND_COLLATERAL = 3 // alt Bladestorm II (CCC)
export const ULT_DMG = 11 // Master of the Blade! : + 2 GB + Disarm + up to 4 Steps
export const ULT_STEPS = 4

// Gain de Guard Break borné au cap 2 (marginal plat, à calibrer).
export function gbValueOfGaining(current: number, gained: number): number {
  return Math.max(0, Math.min(2, current + gained) - Math.min(2, current)) * GB_VALUE
}
