import {
  GRIM_PURSUIT_AVG_DMG, CARD_DRAW_VALUE,
  SPECTRAL_ASSAULT_BASE, SPECTRAL_ASSAULT_PER_DREADFUL,
  DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN,
  CLEAVE_3A, CLEAVE_4A, CLEAVE_5A,
  REAP_UNDEFENDABLE, REAP_DREADFUL_GIVEN,
  RIDE_DOWN_BASE,
  SOW_SMALL_DMG, SOW_SMALL_DREADFUL,
  SOW_LARGE_DMG, SOW_LARGE_DREADFUL,
  HORRIFY_BASE_UNDEFENDABLE, HORRIFY_DREADFUL_GIVEN,
  WHIFF_PURSUIT_TOKENS,
} from './constants.js'
import { classifyDice } from './dice.js'
import { dreadfulValueOfGaining } from './dreadful.js'

export interface AbilityEntry {
  name: string
  value: number
  baseDamage: number
  matched: boolean
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

// Returns [internalName, value, baseDamage] for all abilities whose dice
// requirements are met by the given dice.
export function getCandidates(
  dice: number[],
  dreadful: number,
  hasHead: boolean,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classifyDice(dice)
  const out: Array<[string, number, number]> = []

  if (c >= 5) {
    const base = DREADFUL_CHARGE_VALUE
    out.push(['Dreadful Charge', base + dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN), base])
  }
  if (c >= 4) {
    const base = HORRIFY_BASE_UNDEFENDABLE
    let val = base + dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN)
    if (hasHead) val += GRIM_PURSUIT_AVG_DMG
    out.push(['Horrify', val, base])
  }
  if (a >= 3 && c >= 2) {
    const val = SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL
    out.push(['Spectral Assault', val, SPECTRAL_ASSAULT_BASE])
  }
  if (a >= 5) {
    out.push(['Cleave 5A', CLEAVE_5A, CLEAVE_5A])
  } else if (a === 4) {
    out.push(['Cleave 4A', CLEAVE_4A, CLEAVE_4A])
  } else if (a === 3) {
    out.push(['Cleave 3A', CLEAVE_3A, CLEAVE_3A])
  }
  if (a >= 2 && b >= 2 && c === 0) {
    const val = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG
    out.push(['Ride Down', val, RIDE_DOWN_BASE])
  }
  if (b >= 3 && c >= 1) {
    let val = REAP_UNDEFENDABLE + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN)
    if (hasHead) val += CARD_DRAW_VALUE
    out.push(['Reap', val, REAP_UNDEFENDABLE])
  }
  if (hasStraight(dice, 5)) {
    const val = SOW_LARGE_DMG + dreadfulValueOfGaining(dreadful, SOW_LARGE_DREADFUL)
    out.push(['Sow Despair L', val, SOW_LARGE_DMG])
  }
  if (hasStraight(dice, 4)) {
    const val = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, SOW_SMALL_DREADFUL)
    out.push(['Sow Despair S', val, SOW_SMALL_DMG])
  }

  const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG
  out.push(['Whiff', whiffVal, whiffVal])
  return out
}

export function bestAbilityValue(dice: number[], dreadful: number, hasHead: boolean): number {
  return Math.max(...getCandidates(dice, dreadful, hasHead).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], dreadful: number, hasHead: boolean): string {
  const cands = getCandidates(dice, dreadful, hasHead)
  return cands.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

// Builds the full ability board (all 11 abilities) with hypothetical values
// even for abilities whose dice requirement is not currently met.
export function buildAbilityBoard(dice: number[], dreadful: number, hasHead: boolean): AbilityEntry[] {
  const matchedSet = new Set(getCandidates(dice, dreadful, hasHead).map(([name]) => name))

  const dc = dreadfulValueOfGaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN)
  const horrifyGain = dreadfulValueOfGaining(dreadful, HORRIFY_DREADFUL_GIVEN)
  let horrifyVal = HORRIFY_BASE_UNDEFENDABLE + horrifyGain
  if (hasHead) horrifyVal += GRIM_PURSUIT_AVG_DMG
  let reapVal = REAP_UNDEFENDABLE + dreadfulValueOfGaining(dreadful, REAP_DREADFUL_GIVEN)
  if (hasHead) reapVal += CARD_DRAW_VALUE
  const sowLVal = SOW_LARGE_DMG + dreadfulValueOfGaining(dreadful, SOW_LARGE_DREADFUL)
  const sowSVal = SOW_SMALL_DMG + dreadfulValueOfGaining(dreadful, SOW_SMALL_DREADFUL)
  const rdVal = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG
  const saVal = SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL
  const whiffVal = WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG

  return [
    { name: 'Dreadful Charge (CCCCC)', value: DREADFUL_CHARGE_VALUE + dc,         baseDamage: DREADFUL_CHARGE_VALUE,       matched: matchedSet.has('Dreadful Charge') },
    { name: 'Horrify (CCCC)',          value: horrifyVal,                            baseDamage: HORRIFY_BASE_UNDEFENDABLE,    matched: matchedSet.has('Horrify') },
    { name: 'Spectral Assault (AAACC)',value: saVal,                               baseDamage: SPECTRAL_ASSAULT_BASE,       matched: matchedSet.has('Spectral Assault') },
    { name: 'Cleave 5A (AAAAA)',       value: CLEAVE_5A,                           baseDamage: CLEAVE_5A,                   matched: matchedSet.has('Cleave 5A') },
    { name: 'Cleave 4A (AAAA)',        value: CLEAVE_4A,                           baseDamage: CLEAVE_4A,                   matched: matchedSet.has('Cleave 4A') },
    { name: 'Cleave 3A (AAA)',         value: CLEAVE_3A,                           baseDamage: CLEAVE_3A,                   matched: matchedSet.has('Cleave 3A') },
    { name: 'Ride Down (AAABB)',       value: rdVal,                               baseDamage: RIDE_DOWN_BASE,              matched: matchedSet.has('Ride Down') },
    { name: 'Reap (BBBC)',             value: reapVal,                             baseDamage: REAP_UNDEFENDABLE,           matched: matchedSet.has('Reap') },
    { name: 'Sow Despair L (5-straight)', value: sowLVal,                          baseDamage: SOW_LARGE_DMG,               matched: matchedSet.has('Sow Despair L') },
    { name: 'Sow Despair S (4-straight)', value: sowSVal,                          baseDamage: SOW_SMALL_DMG,               matched: matchedSet.has('Sow Despair S') },
    { name: 'Whiff',                   value: whiffVal,                            baseDamage: whiffVal,                    matched: matchedSet.has('Whiff') },
  ]
}
