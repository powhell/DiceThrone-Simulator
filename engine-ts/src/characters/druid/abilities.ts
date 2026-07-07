// Druid — matching + valeurs EV (board vérifié, SPEC.md). Dé : 1-3 Claw, 4-5 Paw, 6 Nature.
import type { AbilityEntry } from '../../core/types.js'
import {
  SHAPE_SHIFT_VALUE, REGEN2_VALUE, WOUND_VALUE, CARD_DRAW_VALUE, CP_TO_DMG_EQUIV,
  FEROCITY_DMG, FEROCITY_DMG_UPGRADED, MAUL_EV, MAUL_EV_BEAR, NATURES_CURE_DMG,
  FORESTS_CALL_DMG, FORESTS_ANSWER_DMG, PROTECT_DMG, PROTECT_DMG_UPGRADED, WRATH_DMG,
  CAT_ATTACK_BONUS,
} from './constants.js'

export function drFaceToSymbol(face: number): 'A' | 'B' | 'C' {
  return face <= 3 ? 'A' : face <= 5 ? 'B' : 'C'
}

function classify(dice: number[]): { A: number; B: number; C: number } {
  let A = 0, B = 0, C = 0
  for (const d of dice) {
    if (d <= 3) A += 1
    else if (d <= 5) B += 1
    else C += 1
  }
  return { A, B, C }
}

function hasStraight(dice: number[], len: number): boolean {
  const uniq = [...new Set(dice)].sort((a, b) => a - b)
  let run = 1
  for (let i = 1; i < uniq.length; i++) {
    run = uniq[i] === uniq[i - 1] + 1 ? run + 1 : 1
    if (run >= len) return true
  }
  return false
}

function maxOfAKind(dice: number[]): number {
  const counts = new Map<number, number>()
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
  return Math.max(...counts.values())
}

// [name, valeur totale, dégâts directs]
export function getCandidates(
  dice: number[],
  form: 'druid' | 'cat' | 'bear',
  shapeShift: number,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)
  // Cat Form : +2 dégâts (et Wound) sur toute attaque conclue — s'ajoute aux attaques à dégâts.
  const catBonus = (dmg: number) => (form === 'cat' && dmg > 0 ? CAT_ATTACK_BONUS + WOUND_VALUE : 0)
  // Shape Shift cap 2 : un gain au-delà du cap vaut 0 (user-caught : le solveur poussait
  // Wild Realignment à Shape Shift plein — la formule créditait toujours 2 jetons).
  const ssGain = (n: number) => (Math.min(2, shapeShift + n) - Math.min(2, shapeShift)) * SHAPE_SHIFT_VALUE

  // Ferocity
  const fUp = has('ferocity-ii')
  const fd = fUp ? FEROCITY_DMG_UPGRADED : FEROCITY_DMG
  const kindNeeded = fUp ? 3 : 4
  const woundBonus = maxOfAKind(dice) >= kindNeeded ? WOUND_VALUE : 0
  if (a >= 5) out.push(['Ferocity 5A (AAAAA)', fd[2] + woundBonus + catBonus(fd[2]) - tax(true), fd[2]])
  else if (a >= 4) out.push(['Ferocity 4A (AAAA)', fd[1] + woundBonus + catBonus(fd[1]) - tax(true), fd[1]])
  else if (a >= 3) out.push(['Ferocity 3A (AAA)', fd[0] + woundBonus + catBonus(fd[0]) - tax(true), fd[0]])

  // Maul (BBBB) — 2d6 (E=7 ; Bear ~8.17). Savage Maul (BBBBB, Maul II) : +Shape Shift puis Maul.
  const maulEv = form === 'bear' ? MAUL_EV_BEAR : MAUL_EV
  if (b >= 5 && has('maul-ii')) {
    out.push(['Savage Maul (BBBBB)', ssGain(1) + maulEv + catBonus(maulEv) - tax(true), Math.round(maulEv)])
  }
  if (b >= 4) out.push(['Maul (BBBB)', maulEv + catBonus(maulEv) - tax(true), Math.round(maulEv)])

  // Nature's Cure (AACC — ruling user)
  if (a >= 2 && c >= 2) {
    out.push(["Nature's Cure (AACC)", NATURES_CURE_DMG + REGEN2_VALUE + catBonus(NATURES_CURE_DMG) - tax(true), NATURES_CURE_DMG])
  }

  // Wild Realignment (ABBC) : +1 CP, +2 Shape Shift, pioche si Druid — pas de dégâts
  if (a >= 1 && b >= 2 && c >= 1) {
    const val = CP_TO_DMG_EQUIV + ssGain(2) + (form === 'druid' ? CARD_DRAW_VALUE : 0)
    out.push(['Wild Realignment (ABBC)', val, 0])
  }

  // Suites
  if (hasStraight(dice, 4)) {
    out.push(["Forest's Call (4-straight)", FORESTS_CALL_DMG + ssGain(1) + catBonus(FORESTS_CALL_DMG) - tax(true), FORESTS_CALL_DMG])
  }
  if (hasStraight(dice, 5)) {
    // dé bonus : 1/2 -> +2 dmg ; 1/3 -> +SS ; 1/6 -> +Regen2
    const bonus = 0.5 * 2 + (1 / 3) * ssGain(1) + (1 / 6) * REGEN2_VALUE
    out.push(["Forest's Answer (5-straight)", FORESTS_ANSWER_DMG + ssGain(1) + bonus + catBonus(FORESTS_ANSWER_DMG) - tax(true), FORESTS_ANSWER_DMG])
  }

  // Protect the Forest (CCCC) — indéfendable. Rainfall (CCC, PtF II).
  const pDmg = has('protect-the-forest-ii') ? PROTECT_DMG_UPGRADED : PROTECT_DMG
  if (c >= 4) {
    out.push(['Protect the Forest (CCCC)', pDmg + REGEN2_VALUE + ssGain(1) + catBonus(pDmg), pDmg])
  } else if (c >= 3 && has('protect-the-forest-ii')) {
    out.push(['Rainfall (CCC)', CP_TO_DMG_EQUIV + 2 * REGEN2_VALUE, 0])
  }

  // Wrath of Nature (CCCCC) — ULTIMATE
  if (c >= 5) {
    out.push(['Wrath of Nature (CCCCC)', WRATH_DMG + REGEN2_VALUE + ssGain(2) + catBonus(WRATH_DMG), WRATH_DMG])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], form: 'druid' | 'cat' | 'bear', shapeShift: number, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, form, shapeShift, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], form: 'druid' | 'cat' | 'bear', shapeShift: number, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, form, shapeShift, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], form: 'druid' | 'cat' | 'bear', shapeShift: number, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, form, shapeShift, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Ferocity 3A (AAA)', 'Ferocity 4A (AAAA)', 'Ferocity 5A (AAAAA)', 'Maul (BBBB)',
    "Nature's Cure (AACC)", 'Wild Realignment (ABBC)', "Forest's Call (4-straight)",
    "Forest's Answer (5-straight)", 'Protect the Forest (CCCC)', 'Wrath of Nature (CCCCC)',
  ]
  if (upgradeIds.includes('maul-ii')) all.push('Savage Maul (BBBBB)')
  if (upgradeIds.includes('protect-the-forest-ii')) all.push('Rainfall (CCC)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
