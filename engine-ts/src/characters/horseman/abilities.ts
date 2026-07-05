import {
  GRIM_PURSUIT_AVG_DMG, CARD_DRAW_VALUE,
  SPECTRAL_ASSAULT_BASE, SPECTRAL_ASSAULT_BASE_UPGRADED, SPECTRAL_ASSAULT_PER_DREADFUL,
  DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN,
  CLEAVE_3A, CLEAVE_4A, CLEAVE_5A,
  CLEAVE_3A_UPGRADED, CLEAVE_4A_UPGRADED, CLEAVE_5A_UPGRADED,
  REAP_UNDEFENDABLE, REAP_UNDEFENDABLE_UPGRADED, REAP_DREADFUL_GIVEN,
  RIDE_DOWN_BASE, RIDE_DOWN_GRIM_PURSUIT, RIDE_DOWN_GRIM_PURSUIT_UPGRADED,
  SOW_SMALL_DMG, SOW_SMALL_DREADFUL, SOW_SMALL_DREADFUL_UPGRADED,
  SOW_LARGE_DMG, SOW_LARGE_DMG_UPGRADED, SOW_LARGE_DREADFUL, SOW_LARGE_DREADFUL_UPGRADED,
  HORRIFY_BASE_UNDEFENDABLE, HORRIFY_DREADFUL_GIVEN, HORRIFY_GRIM_PURSUIT_UPGRADED,
  WHIFF_PURSUIT_TOKENS,
  GHOSTLY_CHARGE_DMG, GHOSTLY_CHARGE_GRIM_PURSUIT,
  CURSED_GALLOP_DMG, CURSED_GALLOP_GRIM_PURSUIT,
  THE_REAPER_DMG, THE_REAPER_DREADFUL_GIVEN,
  HAUNTED_STRIKE_DMG,
  SPOOKY_DMG, SPOOKY_GRIM_PURSUIT,
} from './constants.js'
import { dreadfulValueOfGaining } from './dreadful.js'
import type { AbilityEntry } from '../../core/types.js'

export type HHSymbol = 'A' | 'B' | 'C'

export function hhFaceToSymbol(face: number): HHSymbol {
  if (face <= 3) return 'A'
  if (face <= 5) return 'B'
  return 'C'
}

function classify(dice: number[]): { A: number; B: number; C: number } {
  const counts = { A: 0, B: 0, C: 0 }
  for (const face of dice) counts[hhFaceToSymbol(face)]++
  return counts
}

function hasStraight(dice: number[], length: number): boolean {
  const unique = new Set(dice)
  for (let start = 1; start <= 7 - length; start++) {
    let found = true
    for (let i = 0; i < length; i++) {
      if (!unique.has(start + i)) { found = false; break }
    }
    if (found) return true
  }
  return false
}

export function getCandidates(
  dice: number[],
  dreadful: number,
  hasHead: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const out: Array<[string, number, number]> = []
  const has = (id: string) => upgradeIds.includes(id)
  // Prime "indéfendable" (user-caught) : une attaque DÉFENDABLE paie la défense adverse
  // (prévention attendue + contre-dégâts attendus = defenseTax, calculée sur l'état RÉEL de
  // l'adversaire par oracleStateFor). Les indéfendables (Reap, Horrify, ults...) y échappent.
  const tax = defenseTax

  if (has('cleave-ii') && a >= 2 && b >= 1 && c >= 1) {
    const val = GHOSTLY_CHARGE_DMG + GHOSTLY_CHARGE_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG
    out.push(['Ghostly Charge', val, GHOSTLY_CHARGE_DMG])
  }
  if (has('ride-down-ii') && b >= 3) {
    const val = CURSED_GALLOP_DMG + CURSED_GALLOP_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG
    out.push(['Cursed Gallop', val, CURSED_GALLOP_DMG])
  }
  if (has('reap-ii') && b >= 3 && c >= 2) {
    const val = THE_REAPER_DMG + dreadfulValueOfGaining(dreadful, THE_REAPER_DREADFUL_GIVEN) + CARD_DRAW_VALUE
    out.push(['The Reaper', val, THE_REAPER_DMG])
  }
  if (has('spectral-assault-ii') && a >= 2 && c >= 2) {
    out.push(['Haunted Strike', HAUNTED_STRIKE_DMG, HAUNTED_STRIKE_DMG])
  }
  if (has('horrify-ii') && c >= 3) {
    const val = SPOOKY_DMG + SPOOKY_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG
    out.push(['Spooky', val - tax, SPOOKY_DMG])
  }

  if (c >= 5) {
    const base = DREADFUL_CHARGE_VALUE
    out.push(['Dreadful Charge', base + dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN), base])
  }
  if (c >= 4) {
    const base = HORRIFY_BASE_UNDEFENDABLE
    const horrifyUpgraded = has('horrify-ii')
    let val = base + dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN)
    if (horrifyUpgraded) val += HORRIFY_GRIM_PURSUIT_UPGRADED * GRIM_PURSUIT_AVG_DMG
    else if (hasHead) val += GRIM_PURSUIT_AVG_DMG
    out.push(['Horrify', val, base])
  }
  if (a >= 3 && c >= 2) {
    const base = has('spectral-assault-ii') ? SPECTRAL_ASSAULT_BASE_UPGRADED : SPECTRAL_ASSAULT_BASE
    const val = base + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL
    out.push(['Spectral Assault', val - tax, base])
  }
  const cleaveUpgraded = has('cleave-ii')
  if (a >= 5) {
    const dmg = cleaveUpgraded ? CLEAVE_5A_UPGRADED : CLEAVE_5A
    out.push(['Cleave 5A', dmg - tax, dmg])
  } else if (a === 4) {
    const dmg = cleaveUpgraded ? CLEAVE_4A_UPGRADED : CLEAVE_4A
    out.push(['Cleave 4A', dmg - tax, dmg])
  } else if (a === 3) {
    const dmg = cleaveUpgraded ? CLEAVE_3A_UPGRADED : CLEAVE_3A
    out.push(['Cleave 3A', dmg - tax, dmg])
  }
  // Verified board pattern: AAABB = 3 Axes + 2 Horseshoes. The old `a >= 2 && b >= 2` was a
  // pre-verification leftover that let AABBB (2 Axes + 3 Horseshoes) activate Ride Down —
  // user-caught in the play UI 2026-07-04, and the same class of bug as the old inverted
  // Widow's Gauntlets pattern. On 5 dice, a>=3 && b>=2 is exact (uses all five).
  if (a >= 3 && b >= 2) {
    const grimPursuit = has('ride-down-ii') ? RIDE_DOWN_GRIM_PURSUIT_UPGRADED : RIDE_DOWN_GRIM_PURSUIT
    const val = RIDE_DOWN_BASE + grimPursuit * GRIM_PURSUIT_AVG_DMG
    out.push(['Ride Down', val - tax, RIDE_DOWN_BASE])
  }
  if (b >= 3 && c >= 1) {
    const dmg = has('reap-ii') ? REAP_UNDEFENDABLE_UPGRADED : REAP_UNDEFENDABLE
    let val = dmg + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN)
    if (hasHead) val += CARD_DRAW_VALUE
    out.push(['Reap', val, dmg])
  }
  const sowUpgraded = has('sow-despair-ii')
  if (hasStraight(dice, 5)) {
    const dmg = sowUpgraded ? SOW_LARGE_DMG_UPGRADED : SOW_LARGE_DMG
    const dreadfulGiven = sowUpgraded ? SOW_LARGE_DREADFUL_UPGRADED : SOW_LARGE_DREADFUL
    const val = dmg + dreadfulValueOfGaining(dreadful, dreadfulGiven)
    out.push(['Sow Despair L', val - tax, dmg])
  }
  if (hasStraight(dice, 4)) {
    const dreadfulGiven = sowUpgraded ? SOW_SMALL_DREADFUL_UPGRADED : SOW_SMALL_DREADFUL
    const val = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, dreadfulGiven)
    out.push(['Sow Despair S', val - tax, SOW_SMALL_DMG])
  }

  const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG
  out.push(['Whiff', whiffVal, whiffVal])
  return out
}

export function bestAbilityValue(dice: number[], dreadful: number, hasHead: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], dreadful: number, hasHead: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax)
  return cands.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

export function buildAbilityBoard(dice: number[], dreadful: number, hasHead: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matchedSet = new Set(getCandidates(dice, dreadful, hasHead, upgradeIds, defenseTax).map(([name]) => name))
  const tax = defenseTax
  const has = (id: string) => upgradeIds.includes(id)

  const cleaveUpgraded = has('cleave-ii')
  const sowUpgraded = has('sow-despair-ii')
  const horrifyUpgraded = has('horrify-ii')
  const cleave5Dmg = cleaveUpgraded ? CLEAVE_5A_UPGRADED : CLEAVE_5A
  const cleave4Dmg = cleaveUpgraded ? CLEAVE_4A_UPGRADED : CLEAVE_4A
  const cleave3Dmg = cleaveUpgraded ? CLEAVE_3A_UPGRADED : CLEAVE_3A
  const reapDmg = has('reap-ii') ? REAP_UNDEFENDABLE_UPGRADED : REAP_UNDEFENDABLE
  const rideDownGrimPursuit = has('ride-down-ii') ? RIDE_DOWN_GRIM_PURSUIT_UPGRADED : RIDE_DOWN_GRIM_PURSUIT
  const sowLDmg = sowUpgraded ? SOW_LARGE_DMG_UPGRADED : SOW_LARGE_DMG
  const sowLDreadful = sowUpgraded ? SOW_LARGE_DREADFUL_UPGRADED : SOW_LARGE_DREADFUL
  const sowSDreadful = sowUpgraded ? SOW_SMALL_DREADFUL_UPGRADED : SOW_SMALL_DREADFUL
  const spectralAssaultBase = has('spectral-assault-ii') ? SPECTRAL_ASSAULT_BASE_UPGRADED : SPECTRAL_ASSAULT_BASE

  const dc = dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN)
  const horrifyGain = dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN)
  let horrifyVal = HORRIFY_BASE_UNDEFENDABLE + horrifyGain
  if (horrifyUpgraded) horrifyVal += HORRIFY_GRIM_PURSUIT_UPGRADED * GRIM_PURSUIT_AVG_DMG
  else if (hasHead) horrifyVal += GRIM_PURSUIT_AVG_DMG
  let reapVal = reapDmg + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN)
  if (hasHead) reapVal += CARD_DRAW_VALUE
  const sowLVal = sowLDmg + dreadfulValueOfGaining(dreadful, sowLDreadful)
  const sowSVal = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, sowSDreadful)
  const rdVal = RIDE_DOWN_BASE + rideDownGrimPursuit * GRIM_PURSUIT_AVG_DMG
  const saVal = spectralAssaultBase + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL
  const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG

  const ghostlyChargeVal = GHOSTLY_CHARGE_DMG + GHOSTLY_CHARGE_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG
  const cursedGallopVal = CURSED_GALLOP_DMG + CURSED_GALLOP_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG
  const theReaperVal = THE_REAPER_DMG + dreadfulValueOfGaining(dreadful, THE_REAPER_DREADFUL_GIVEN) + CARD_DRAW_VALUE
  const spookyVal = SPOOKY_DMG + SPOOKY_GRIM_PURSUIT * GRIM_PURSUIT_AVG_DMG

  const entries: AbilityEntry[] = [
    { name: 'Dreadful Charge (CCCCC)', value: DREADFUL_CHARGE_VALUE + dc,         baseDamage: DREADFUL_CHARGE_VALUE,       matched: matchedSet.has('Dreadful Charge') },
    { name: 'Horrify (CCCC)',          value: horrifyVal,                            baseDamage: HORRIFY_BASE_UNDEFENDABLE,    matched: matchedSet.has('Horrify') },
    { name: 'Spectral Assault (AAACC)',value: saVal - tax,                               baseDamage: spectralAssaultBase,         matched: matchedSet.has('Spectral Assault') },
    { name: 'Cleave 5A (AAAAA)',       value: cleave5Dmg - tax,                          baseDamage: cleave5Dmg,                  matched: matchedSet.has('Cleave 5A') },
    { name: 'Cleave 4A (AAAA)',        value: cleave4Dmg - tax,                          baseDamage: cleave4Dmg,                  matched: matchedSet.has('Cleave 4A') },
    { name: 'Cleave 3A (AAA)',         value: cleave3Dmg - tax,                          baseDamage: cleave3Dmg,                  matched: matchedSet.has('Cleave 3A') },
    { name: 'Ride Down (AAABB)',       value: rdVal - tax,                               baseDamage: RIDE_DOWN_BASE,              matched: matchedSet.has('Ride Down') },
    { name: 'Reap (BBBC)',             value: reapVal,                             baseDamage: reapDmg,                     matched: matchedSet.has('Reap') },
    { name: 'Sow Despair L (5-straight)', value: sowLVal - tax,                          baseDamage: sowLDmg,                     matched: matchedSet.has('Sow Despair L') },
    { name: 'Sow Despair S (4-straight)', value: sowSVal - tax,                          baseDamage: SOW_SMALL_DMG,               matched: matchedSet.has('Sow Despair S') },
    { name: 'Whiff',                   value: whiffVal,                            baseDamage: whiffVal,                    matched: matchedSet.has('Whiff') },
  ]

  if (has('cleave-ii')) {
    entries.push({ name: 'Ghostly Charge (AABC)', value: ghostlyChargeVal, baseDamage: GHOSTLY_CHARGE_DMG, matched: matchedSet.has('Ghostly Charge') })
  }
  if (has('ride-down-ii')) {
    entries.push({ name: 'Cursed Gallop (BBB)', value: cursedGallopVal, baseDamage: CURSED_GALLOP_DMG, matched: matchedSet.has('Cursed Gallop') })
  }
  if (has('reap-ii')) {
    entries.push({ name: 'The Reaper (BBBCC)', value: theReaperVal, baseDamage: THE_REAPER_DMG, matched: matchedSet.has('The Reaper') })
  }
  if (has('spectral-assault-ii')) {
    entries.push({ name: 'Haunted Strike (AACC)', value: HAUNTED_STRIKE_DMG, baseDamage: HAUNTED_STRIKE_DMG, matched: matchedSet.has('Haunted Strike') })
  }
  if (has('horrify-ii')) {
    entries.push({ name: 'Spooky (CCC)', value: spookyVal - tax, baseDamage: SPOOKY_DMG, matched: matchedSet.has('Spooky') })
  }

  return entries
}
