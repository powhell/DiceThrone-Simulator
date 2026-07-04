import {
  BATON_STRIKE_3B, BATON_STRIKE_4B, BATON_STRIKE_5B,
  BATON_STRIKE_3B_UPGRADED, BATON_STRIKE_4B_UPGRADED, BATON_STRIKE_5B_UPGRADED,
  INFILTRATE_BASE_DMG, INFILTRATE_TB_INFLICTED, INFILTRATE_AGILITY_GAIN,
  GAUNTLETS_BASE_DMG, GAUNTLETS_BASE_DMG_UPGRADED, GAUNTLETS_CP_GAIN,
  HACKED_BASE_DMG, HACKED_BASE_DMG_UPGRADED, HACKED_THRESHOLD_UPGRADES, HACKED_THRESHOLD_BONUS, HACKED_TB_INFLICTED,
  GRAPPLE_BASE_DMG, GRAPPLE_BASE_DMG_UPGRADED, GRAPPLE_AGILITY_GAIN, GRAPPLE_CP_THRESHOLD_UPGRADES, GRAPPLE_CP_GAIN,
  VENGEANCE_BASE_DMG, VENGEANCE_AGILITY_GAIN, VENGEANCE_RIDER_DICE,
  WIDOWS_BITE_BASE_DMG, WIDOWS_BITE_TB_INFLICTED,
  RRT_THRESHOLD_UPGRADES, RRT_ALL_ATTACK_BONUS,
  AGILITY_VALUE, CP_TO_DMG_EQUIV, COVERT_OPS_VALUE, WHIFF_VALUE,
  COVERT_MISSION_DMG, RECON_DMG, RECON_UPGRADE_SEARCH_VALUE, SPY_GAME_DMG, SUBVERT_DMG,
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

// Vengeance rider (verified against board+card photos 2026-07-01): roll N attack dice
// (4 base, 5 with Vengeance II). Each Batons (B, faces 3-5, p=1/2) → +1 dmg. Any Espionage
// (A, faces 1-2, p=1/3 per die) rolled at least once → inflict 1 TB (boolean, not scaled).
// A Widow-pair (C, face 6, >=2 of them) → gain 1 Covert Ops (boolean). Was previously coded
// as "each face==1 inflicts TB, everything else deals dmg" — wrong on both counts.
function vengeanceRiderEV(upgrades: number, tbOnOpp: number, n = VENGEANCE_RIDER_DICE): number {
  const riderDmg = n * 0.5 // P(Batons) = 3/6
  const pNoA = Math.pow(2 / 3, n) // P(no Espionage face among n dice)
  const tbEV = (1 - pNoA) * tbGainValue(upgrades, tbOnOpp, Math.min(1, 2 - tbOnOpp))
  const pC = 1 / 6
  const pFewerThanTwoC = Math.pow(1 - pC, n) + n * pC * Math.pow(1 - pC, n - 1) // P(0 or 1 six)
  const covertOpsEV = (1 - pFewerThanTwoC) * COVERT_OPS_VALUE
  return riderDmg + tbEV + covertOpsEV
}

// Returns [name, value, baseDamage] for every ability whose dice requirement is met.
export function getCandidates(
  dice: number[],
  upgrades: number,
  tbOnOpp: number,
  upgradeIds: string[] = [],
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const out: Array<[string, number, number]> = []
  const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0
  const has = (id: string) => upgradeIds.includes(id)

  if (has('widows-gauntlets-ii') && a >= 2 && b >= 2) {
    const tb = tbGainValue(upgrades, tbOnOpp, 1)
    out.push(['Covert Mission', COVERT_MISSION_DMG + tb + rrt, COVERT_MISSION_DMG])
  }
  if (has('grapple-ii') && c >= 3) {
    const val = RECON_DMG + AGILITY_VALUE + RECON_UPGRADE_SEARCH_VALUE + rrt
    out.push(['Recon', val, RECON_DMG])
  }
  if (has('infiltrate-ii') && a >= 2 && b >= 1 && c >= 2) {
    const val = SPY_GAME_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt
    out.push(['Spy Game', val, SPY_GAME_DMG])
  }
  if (has('vengeance-ii') && a >= 1 && b >= 3) {
    const val = SUBVERT_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt
    out.push(['Subvert', val, SUBVERT_DMG])
  }

  const batonStrikeUpgraded = has('baton-strike-ii')
  if (b >= 5) {
    const dmg = batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B
    out.push(['Baton Strike 5B', dmg + rrt, dmg])
  } else if (b === 4) {
    const dmg = batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B
    out.push(['Baton Strike 4B', dmg + rrt, dmg])
  } else if (b === 3) {
    const dmg = batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B
    out.push(['Baton Strike 3B', dmg + rrt, dmg])
  }

  if (a >= 2 && b >= 1 && c >= 1) {
    const tb = tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED)
    const agility = INFILTRATE_AGILITY_GAIN * AGILITY_VALUE
    out.push(['Infiltrate', INFILTRATE_BASE_DMG + tb + agility + rrt, INFILTRATE_BASE_DMG])
  }

  if (b >= 3 && a >= 2) {
    const gauntletsDmg = has('widows-gauntlets-ii') ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG
    const val = gauntletsDmg + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt
    out.push(["Widow's Gauntlets", val, gauntletsDmg])
  }

  if (hasStraight(dice, 4)) {
    const hackedDmg = has('hacked-ii') ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG
    const thresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0
    const tb = tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED)
    out.push(['Hacked', hackedDmg + thresh + tb + rrt, hackedDmg])
  }

  if (c >= 4) {
    const grappleUpgraded = has('grapple-ii')
    const grappleDmg = grappleUpgraded ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG
    // Grapple II makes the CP gain unconditional instead of requiring >=2 upgrades in play.
    const cpGain = (grappleUpgraded || upgrades >= GRAPPLE_CP_THRESHOLD_UPGRADES) ? GRAPPLE_CP_GAIN * CP_TO_DMG_EQUIV : 0
    const val = grappleDmg + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + cpGain + rrt
    out.push(['Grapple', val, grappleDmg])
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

export function bestAbilityValue(dice: number[], upgrades: number, tbOnOpp: number, upgradeIds: string[] = []): number {
  return Math.max(...getCandidates(dice, upgrades, tbOnOpp, upgradeIds).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], upgrades: number, tbOnOpp: number, upgradeIds: string[] = []): string {
  const cands = getCandidates(dice, upgrades, tbOnOpp, upgradeIds)
  return cands.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

// Direct HP damage per ability this turn, excluding TB / Agility / CP gain EV.
// Keys match short names returned by getCandidates / bestAbilityName (what probDist uses).
// Vengeance rider: dmg-only contribution is N × 1/2 (only Batons faces deal dmg; Espionage
// inflicts TB and Widow contributes to the Covert-Ops-on-pair trigger instead).
export function directDamageByName(upgrades: number, _tbOnOpp: number, upgradeIds: string[] = []): Record<string, number> {
  const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0
  const has = (id: string) => upgradeIds.includes(id)
  const batonStrikeUpgraded = has('baton-strike-ii')
  const gauntletsDmg = has('widows-gauntlets-ii') ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG
  const hackedDmg = has('hacked-ii') ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG
  const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0
  const grappleDmg = has('grapple-ii') ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG
  const vengeanceRiderDmg = VENGEANCE_RIDER_DICE * 0.5
  return {
    'Baton Strike 3B':    (batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B) + rrt,
    'Baton Strike 4B':    (batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B) + rrt,
    'Baton Strike 5B':    (batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B) + rrt,
    'Infiltrate':         INFILTRATE_BASE_DMG + rrt,
    "Widow's Gauntlets":  gauntletsDmg + upgrades + rrt,
    'Hacked':             hackedDmg + hackedThresh + rrt,
    'Grapple':            grappleDmg + upgrades + rrt,
    'Vengeance':          VENGEANCE_BASE_DMG + vengeanceRiderDmg + rrt,
    "Widow's Bite":       WIDOWS_BITE_BASE_DMG + rrt,
    'Whiff':              0,
    'Covert Mission':     COVERT_MISSION_DMG + rrt,
    'Recon':              RECON_DMG + rrt,
    'Spy Game':           SPY_GAME_DMG + rrt,
    'Subvert':            SUBVERT_DMG + rrt,
  }
}

export function buildAbilityBoard(dice: number[], upgrades: number, tbOnOpp: number, upgradeIds: string[] = []): AbilityEntry[] {
  const matched = new Set(getCandidates(dice, upgrades, tbOnOpp, upgradeIds).map(([n]) => n))
  const rrt = upgrades >= RRT_THRESHOLD_UPGRADES ? RRT_ALL_ATTACK_BONUS : 0
  const has = (id: string) => upgradeIds.includes(id)

  const batonStrikeUpgraded = has('baton-strike-ii')
  const batonStrike5Dmg = batonStrikeUpgraded ? BATON_STRIKE_5B_UPGRADED : BATON_STRIKE_5B
  const batonStrike4Dmg = batonStrikeUpgraded ? BATON_STRIKE_4B_UPGRADED : BATON_STRIKE_4B
  const batonStrike3Dmg = batonStrikeUpgraded ? BATON_STRIKE_3B_UPGRADED : BATON_STRIKE_3B
  const gauntletsDmg = has('widows-gauntlets-ii') ? GAUNTLETS_BASE_DMG_UPGRADED : GAUNTLETS_BASE_DMG
  const hackedDmg = has('hacked-ii') ? HACKED_BASE_DMG_UPGRADED : HACKED_BASE_DMG
  const grappleDmg = has('grapple-ii') ? GRAPPLE_BASE_DMG_UPGRADED : GRAPPLE_BASE_DMG

  const infiltrateVal = INFILTRATE_BASE_DMG
    + tbGainValue(upgrades, tbOnOpp, INFILTRATE_TB_INFLICTED)
    + INFILTRATE_AGILITY_GAIN * AGILITY_VALUE
    + rrt
  const gauntletsVal = gauntletsDmg + upgrades + GAUNTLETS_CP_GAIN * CP_TO_DMG_EQUIV + rrt
  const hackedThresh = upgrades >= HACKED_THRESHOLD_UPGRADES ? HACKED_THRESHOLD_BONUS : 0
  const hackedVal = hackedDmg + hackedThresh
    + tbGainValue(upgrades, tbOnOpp, HACKED_TB_INFLICTED)
    + rrt
  const grappleCpGain = (has('grapple-ii') || upgrades >= GRAPPLE_CP_THRESHOLD_UPGRADES) ? GRAPPLE_CP_GAIN * CP_TO_DMG_EQUIV : 0
  const grappleVal = grappleDmg + upgrades + GRAPPLE_AGILITY_GAIN * AGILITY_VALUE + grappleCpGain + rrt
  const vengeanceVal = VENGEANCE_BASE_DMG
    + vengeanceRiderEV(upgrades, tbOnOpp)
    + VENGEANCE_AGILITY_GAIN * AGILITY_VALUE
    + rrt
  const biteVal = WIDOWS_BITE_BASE_DMG
    + tbGainValue(upgrades, tbOnOpp, WIDOWS_BITE_TB_INFLICTED)
    + rrt

  const covertMissionVal = COVERT_MISSION_DMG + tbGainValue(upgrades, tbOnOpp, 1) + rrt
  const reconVal = RECON_DMG + AGILITY_VALUE + RECON_UPGRADE_SEARCH_VALUE + rrt
  const spyGameVal = SPY_GAME_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt
  const subvertVal = SUBVERT_DMG + COVERT_OPS_VALUE + AGILITY_VALUE + rrt

  const entries: AbilityEntry[] = [
    { name: "Widow's Bite (CCCCC)",      value: biteVal,                  baseDamage: WIDOWS_BITE_BASE_DMG,   matched: matched.has("Widow's Bite") },
    { name: 'Grapple (CCCC)',            value: grappleVal,               baseDamage: grappleDmg,             matched: matched.has('Grapple') },
    { name: "Widow's Gauntlets (BBBAA)", value: gauntletsVal,             baseDamage: gauntletsDmg,           matched: matched.has("Widow's Gauntlets") },
    { name: 'Vengeance (5-straight)',    value: vengeanceVal,             baseDamage: VENGEANCE_BASE_DMG,     matched: matched.has('Vengeance') },
    { name: 'Hacked (4-straight)',       value: hackedVal,                baseDamage: hackedDmg,              matched: matched.has('Hacked') },
    { name: 'Infiltrate (AABC)',         value: infiltrateVal,            baseDamage: INFILTRATE_BASE_DMG,    matched: matched.has('Infiltrate') },
    { name: 'Baton Strike 5B (BBBBB)',   value: batonStrike5Dmg + rrt,    baseDamage: batonStrike5Dmg,        matched: matched.has('Baton Strike 5B') },
    { name: 'Baton Strike 4B (BBBB)',    value: batonStrike4Dmg + rrt,    baseDamage: batonStrike4Dmg,        matched: matched.has('Baton Strike 4B') },
    { name: 'Baton Strike 3B (BBB)',     value: batonStrike3Dmg + rrt,    baseDamage: batonStrike3Dmg,        matched: matched.has('Baton Strike 3B') },
    { name: 'Whiff',                     value: WHIFF_VALUE,              baseDamage: WHIFF_VALUE,            matched: matched.has('Whiff') },
  ]

  if (has('widows-gauntlets-ii')) {
    entries.push({ name: 'Covert Mission', value: covertMissionVal, baseDamage: COVERT_MISSION_DMG, matched: matched.has('Covert Mission') })
  }
  if (has('grapple-ii')) {
    entries.push({ name: 'Recon', value: reconVal, baseDamage: RECON_DMG, matched: matched.has('Recon') })
  }
  if (has('infiltrate-ii')) {
    entries.push({ name: 'Spy Game', value: spyGameVal, baseDamage: SPY_GAME_DMG, matched: matched.has('Spy Game') })
  }
  if (has('vengeance-ii')) {
    entries.push({ name: 'Subvert', value: subvertVal, baseDamage: SUBVERT_DMG, matched: matched.has('Subvert') })
  }

  return entries
}
