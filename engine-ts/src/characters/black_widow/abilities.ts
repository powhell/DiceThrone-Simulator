import {
  BATON_STRIKE_3B, BATON_STRIKE_4B, BATON_STRIKE_5B,
  INFILTRATE_BASE_DMG, INFILTRATE_TB_INFLICTED, INFILTRATE_AGILITY_GAIN,
  GAUNTLETS_BASE_DMG, GAUNTLETS_CP_GAIN,
  HACKED_BASE_DMG, HACKED_THRESHOLD_UPGRADES, HACKED_THRESHOLD_BONUS, HACKED_TB_INFLICTED,
  GRAPPLE_BASE_DMG, GRAPPLE_AGILITY_GAIN,
  VENGEANCE_BASE_DMG, VENGEANCE_AGILITY_GAIN, VENGEANCE_RIDER_DICE,
  WIDOWS_BITE_BASE_DMG, WIDOWS_BITE_TB_INFLICTED,
  RRT_THRESHOLD_UPGRADES, RRT_ALL_ATTACK_BONUS,
  AGILITY_VALUE, CP_TO_DMG_EQUIV, WHIFF_VALUE,
} from './constants.js'
import { tbGainValue } from './timebomb.js'
import type { AbilityEntry } from '../../core/types.js'

export type BWSymbol = 'A' | 'B' | 'C'

export function bwFaceToSymbol(face: number): BWSymbol {
  if (face <= 2) return 'A'
  if (face <= 5) return 'B'
  return 'C'
}

function classify(dice: number[]): { A: number; B: number; C: number } {
  const counts = { A: 0, B: 0, C: 0 }
  for (const face of dice) counts[bwFaceToSymbol(face)]++
  return counts
}

function hasStraight(dice: number[], length: number): boolean {
  const unique = new Set(dice)
  for (let start = 1; start <= 7 - length; start++) {
    let ok = true
    for (let i = 0; i < length; i++) {
      if (!unique.has(start + i)) { ok = false; break }
    }
    if (ok) return true
  }
  return false
}

function binom(n: number, k: number): number {
  let r = 1
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1)
  return r
}

// Vengeance rider: roll 4 attack dice.
// Each non-1 face → +1 dmg. Each 1 → inflict 1 TB (no dmg from that die).
// Expected bonus = (4 × 5/6) dmg + Σ P(k ones) × tbGainValue(min(k, cap)).
function vengeanceRiderEV(upgrades: number, tbOnOpp: number): number {
  const n = VENGEANCE_RIDER_DICE
  const riderDmg = n * (5 / 6)
  const p1 = 1 / 6, p0 = 5 / 6
  let tbEV = 0
  for (let k = 0; k <= n; k++) {
    const p = binom(n, k) * Math.pow(p1, k) * Math.pow(p0, n - k)
    const gained = Math.min(k, 2 - tbOnOpp)
    tbEV += p * tbGainValue(upgrades, tbOnOpp, gained)
  }
  return riderDmg + tbEV
}

// Returns [name, value, baseDamage] for every ability whose dice requirement is met.
export function getCandidates(
  dice: number[],
  upgrades: number,
  tbOnOpp: number,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const out: Array<[string, number, number]> = []
  const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0

  if (b >= 5) {
    out.push(['Baton Strike 5B', BATON_STRIKE_5B + rrt, BATON_STRIKE_5B])
  } else if (b === 4) {
    out.push(['Baton Strike 4B', BATON_STRIKE_4B + rrt, BATON_STRIKE_4B])
  } else if (b === 3) {
    out.push(['Baton Strike 3B', BATON_STRIKE_3B + rrt, BATON_STRIKE_3B])
  }

  if (a >= 2 && b >= 1 && c >= 1) {
    const tb = tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED)
    const agility = INFILTRATE_AGILITY_GAIN * AGILITY_VALUE
    out.push(['Infiltrate', INFILTRATE_BASE_DMG + tb + agility + rrt, INFILTRATE_BASE_DMG])
  }

  if (a >= 3 && b >= 2) {
    const val = GAUNTLETS_BASE_DMG + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt
    out.push(["Widow's Gauntlets", val, GAUNTLETS_BASE_DMG])
  }

  if (hasStraight(dice, 4)) {
    const thresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0
    const tb = tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED)
    out.push(['Hacked', HACKED_BASE_DMG + thresh + tb + rrt, HACKED_BASE_DMG])
  }

  if (c >= 4) {
    const val = GRAPPLE_BASE_DMG + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + rrt
    out.push(['Grapple', val, GRAPPLE_BASE_DMG])
  }

  if (hasStraight(dice, 5)) {
    const rider = vengeanceRiderEV(upgrades, tbOnOpp)
    const agility = VENGEANCE_AGILITY_GAIN * AGILITY_VALUE
    out.push(['Vengeance', VENGEANCE_BASE_DMG + rider + agility + rrt, VENGEANCE_BASE_DMG])
  }

  if (c >= 5) {
    const tb = tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED)
    out.push(["Widow's Bite", WIDOWS_BITE_BASE_DMG + tb + rrt, WIDOWS_BITE_BASE_DMG])
  }

  out.push(['Whiff', WHIFF_VALUE, WHIFF_VALUE])
  return out
}

export function bestAbilityValue(dice: number[], upgrades: number, tbOnOpp: number): number {
  return Math.max(...getCandidates(dice, upgrades, tbOnOpp).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], upgrades: number, tbOnOpp: number): string {
  const cands = getCandidates(dice, upgrades, tbOnOpp)
  return cands.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

export function buildAbilityBoard(dice: number[], upgrades: number, tbOnOpp: number): AbilityEntry[] {
  const matched = new Set(getCandidates(dice, upgrades, tbOnOpp).map(([n]) => n))
  const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0

  const infiltrateVal = INFILTRATE_BASE_DMG
    + tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED)
    + INFILTRATE_AGILITY_GAIN * AGILITY_VALUE
    + rrt
  const gauntletsVal = GAUNTLETS_BASE_DMG + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt
  const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0
  const hackedVal = HACKED_BASE_DMG + hackedThresh
    + tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED)
    + rrt
  const grappleVal = GRAPPLE_BASE_DMG + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + rrt
  const vengeanceVal = VENGEANCE_BASE_DMG
    + vengeanceRiderEV(upgrades, tbOnOpp)
    + VENGEANCE_AGILITY_GAIN * AGILITY_VALUE
    + rrt
  const biteVal = WIDOWS_BITE_BASE_DMG
    + tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED)
    + rrt

  return [
    { name: "Widow's Bite (CCCCC)",      value: biteVal,                  baseDamage: WIDOWS_BITE_BASE_DMG,   matched: matched.has("Widow's Bite") },
    { name: 'Grapple (CCCC)',            value: grappleVal,               baseDamage: GRAPPLE_BASE_DMG,       matched: matched.has('Grapple') },
    { name: "Widow's Gauntlets (AAABB)", value: gauntletsVal,             baseDamage: GAUNTLETS_BASE_DMG,     matched: matched.has("Widow's Gauntlets") },
    { name: 'Vengeance (5-straight)',    value: vengeanceVal,             baseDamage: VENGEANCE_BASE_DMG,     matched: matched.has('Vengeance') },
    { name: 'Hacked (4-straight)',       value: hackedVal,                baseDamage: HACKED_BASE_DMG,        matched: matched.has('Hacked') },
    { name: 'Infiltrate (AABC)',         value: infiltrateVal,            baseDamage: INFILTRATE_BASE_DMG,    matched: matched.has('Infiltrate') },
    { name: 'Baton Strike 5B (BBBBB)',   value: BATON_STRIKE_5B + rrt,    baseDamage: BATON_STRIKE_5B,        matched: matched.has('Baton Strike 5B') },
    { name: 'Baton Strike 4B (BBBB)',    value: BATON_STRIKE_4B + rrt,    baseDamage: BATON_STRIKE_4B,        matched: matched.has('Baton Strike 4B') },
    { name: 'Baton Strike 3B (BBB)',     value: BATON_STRIKE_3B + rrt,    baseDamage: BATON_STRIKE_3B,        matched: matched.has('Baton Strike 3B') },
    { name: 'Whiff',                     value: WHIFF_VALUE,              baseDamage: WHIFF_VALUE,            matched: matched.has('Whiff') },
  ]
}
