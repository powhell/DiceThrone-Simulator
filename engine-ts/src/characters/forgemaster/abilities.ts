// Forgemaster (fm) — correspondance dés -> habiletés + valeur EV pour l'oracle de garde.
// Patterns vérifiés (scans board, characters/forge_master/) : dé 1-3 = Pick (A),
// 4-5 = Forge (B), 6 = Anvil (C). Conventions identiques à horseman/abilities.ts :
// getCandidates -> [nomCourt, valeur, dégâtsBase] ; buildAbilityBoard -> noms AVEC pattern
// (doivent égaler les boardName de sim/data/characters/fm/hero.json).
import {
  PICK_AXE_3A, PICK_AXE_4A, PICK_AXE_5A,
  FURNACE_BASE, FURNACE_BONUS_ROLL_EV,
  SMELTING_TIME_UNDEFENDABLE,
  A_GOOD_HAUL_DMG,
  ARMORED_UP_SMALL, ARMORED_UP_LARGE, ARMORED_UP_2ARMOR_BONUS,
  FINAL_TOUCHES_VALUE,
  CP_TO_DMG_EQUIV, CARD_DRAW_VALUE, MINE_VALUE, ORE_TUTOR_VALUE, WHIFF_VALUE,
} from './constants.js'
import type { AbilityEntry } from '../../core/types.js'

export type FMSymbol = 'A' | 'B' | 'C'

export function fmFaceToSymbol(face: number): FMSymbol {
  if (face <= 3) return 'A'
  if (face <= 5) return 'B'
  return 'C'
}

function classify(dice: number[]): { A: number; B: number; C: number } {
  const counts = { A: 0, B: 0, C: 0 }
  for (const face of dice) counts[fmFaceToSymbol(face)]++
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

// "4-of-a-kind (#'s)" — par VALEUR de face, pas par symbole (même règle que Cleave chez HH).
function hasNumberMatch(dice: number[], ofAKind: number): boolean {
  const counts = new Map<number, number>()
  for (const v of dice) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.values()].some(n => n >= ofAKind)
}

export function getCandidates(
  dice: number[],
  armorCount: number,
  defenseTax = 0,
): Array<[string, number, number]> {
  const tax = defenseTax // prime indefendable - voir horseman/abilities.ts
  const { A: a, B: b, C: c } = classify(dice)
  const out: Array<[string, number, number]> = []
  // Pick Axe : +1 CP sur carré de mêmes # (déterministe une fois les dés connus)
  const pickCpBonus = hasNumberMatch(dice, 4) ? CP_TO_DMG_EQUIV : 0
  if (a >= 5) out.push(['Pick Axe 5A', PICK_AXE_5A + pickCpBonus - tax, PICK_AXE_5A])
  else if (a === 4) out.push(['Pick Axe 4A', PICK_AXE_4A + pickCpBonus - tax, PICK_AXE_4A])
  else if (a === 3) out.push(['Pick Axe 3A', PICK_AXE_3A + pickCpBonus - tax, PICK_AXE_3A])
  if (b >= 4) out.push(['Furnace', FURNACE_BASE + FURNACE_BONUS_ROLL_EV - tax, FURNACE_BASE])
  if (c >= 4) out.push(['Smelting Time', SMELTING_TIME_UNDEFENDABLE + CARD_DRAW_VALUE, SMELTING_TIME_UNDEFENDABLE])
  if (a >= 1 && b >= 1 && c >= 2) out.push(['A Good Haul', A_GOOD_HAUL_DMG + MINE_VALUE - tax, A_GOOD_HAUL_DMG])
  const armoredBonus = armorCount >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0
  if (hasStraight(dice, 5)) out.push(['Armored Up L', ARMORED_UP_LARGE + armoredBonus - tax, ARMORED_UP_LARGE + armoredBonus])
  if (hasStraight(dice, 4)) out.push(['Armored Up S', ARMORED_UP_SMALL + armoredBonus - tax, ARMORED_UP_SMALL + armoredBonus])
  if (c >= 5) out.push(['Final Touches!', FINAL_TOUCHES_VALUE + ORE_TUTOR_VALUE, FINAL_TOUCHES_VALUE])
  out.push(['Whiff', WHIFF_VALUE, WHIFF_VALUE])
  return out
}

export function bestAbilityValue(dice: number[], armorCount: number, defenseTax = 0): number {
  return Math.max(...getCandidates(dice, armorCount, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], armorCount: number, defenseTax = 0): string {
  const cands = getCandidates(dice, armorCount, defenseTax)
  return cands.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

export function buildAbilityBoard(dice: number[], armorCount: number, defenseTax = 0): AbilityEntry[] {
  const matchedSet = new Set(getCandidates(dice, armorCount, defenseTax).map(([name]) => name))
  const tax = defenseTax
  const armoredBonus = armorCount >= 2 ? ARMORED_UP_2ARMOR_BONUS : 0
  return [
    { name: 'Final Touches! (CCCCC)',     value: FINAL_TOUCHES_VALUE + ORE_TUTOR_VALUE,              baseDamage: FINAL_TOUCHES_VALUE,        matched: matchedSet.has('Final Touches!') },
    { name: 'Smelting Time (CCCC)',       value: SMELTING_TIME_UNDEFENDABLE + CARD_DRAW_VALUE,       baseDamage: SMELTING_TIME_UNDEFENDABLE, matched: matchedSet.has('Smelting Time') },
    { name: 'Armored Up L (5-straight)',  value: ARMORED_UP_LARGE + armoredBonus - tax,                    baseDamage: ARMORED_UP_LARGE + armoredBonus, matched: matchedSet.has('Armored Up L') },
    { name: 'A Good Haul (ABCC)',         value: A_GOOD_HAUL_DMG + MINE_VALUE - tax,                       baseDamage: A_GOOD_HAUL_DMG,            matched: matchedSet.has('A Good Haul') },
    { name: 'Armored Up S (4-straight)',  value: ARMORED_UP_SMALL + armoredBonus - tax,                    baseDamage: ARMORED_UP_SMALL + armoredBonus, matched: matchedSet.has('Armored Up S') },
    { name: 'Furnace (BBBB)',             value: FURNACE_BASE + FURNACE_BONUS_ROLL_EV - tax,               baseDamage: FURNACE_BASE,               matched: matchedSet.has('Furnace') },
    { name: 'Pick Axe 5A (AAAAA)',        value: PICK_AXE_5A - tax,                                        baseDamage: PICK_AXE_5A,                matched: matchedSet.has('Pick Axe 5A') },
    { name: 'Pick Axe 4A (AAAA)',         value: PICK_AXE_4A - tax,                                        baseDamage: PICK_AXE_4A,                matched: matchedSet.has('Pick Axe 4A') },
    { name: 'Pick Axe 3A (AAA)',          value: PICK_AXE_3A - tax,                                        baseDamage: PICK_AXE_3A,                matched: matchedSet.has('Pick Axe 3A') },
    { name: 'Whiff',                      value: WHIFF_VALUE,                                        baseDamage: WHIFF_VALUE,                matched: matchedSet.has('Whiff') },
  ]
}
