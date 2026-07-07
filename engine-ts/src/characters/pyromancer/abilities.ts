// Pyromancer — matching + valeurs EV (board vérifié, SPEC.md).
// Dé à 4 symboles : 1-3 Flame (A), 4 Blaze (B), 5 Fiery Soul (C), 6 Meteor (D).
import type { AbilityEntry } from '../../core/types.js'
import {
  FM_VALUE, BURN_VALUE, KNOCKDOWN_VALUE, STUN_EXTRA_PHASE_VALUE, CP_TO_DMG_EQUIV,
  FIREBALL_DMG, HOT_STREAK_BASE, HOT_STREAK_BASE_II, IGNITE_BASE, IGNITE_BASE_II,
  PYROBLAST_DMG, COMBUSTION_DMG_PER_TOKEN, COMBUSTION_DMG_PER_TOKEN_II,
  METEORITE_COLLATERAL, METEORITE_COLLATERAL_II, SCORCH_DMG, ULT_DMG, ULT_COLLATERAL,
} from './constants.js'

export function pyFaceToSymbol(face: number): 'A' | 'B' | 'C' | 'D' {
  return face <= 3 ? 'A' : face === 4 ? 'B' : face === 5 ? 'C' : 'D'
}

function classify(dice: number[]): { A: number; B: number; C: number; D: number } {
  let A = 0, B = 0, C = 0, D = 0
  for (const d of dice) {
    if (d <= 3) A += 1
    else if (d === 4) B += 1
    else if (d === 5) C += 1
    else D += 1
  }
  return { A, B, C, D }
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

// fm = Fire Mastery courant ; fmCap = 5 + bonus permanent ; oppBurned/oppKnocked : les
// négatifs stack 1 déjà posés valent 0. Les « collateral » comptent comme dégâts (1v1).
export function getCandidates(
  dice: number[],
  fm: number,
  fmCap: number,
  oppBurned: boolean,
  oppKnocked: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c, D: d } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)
  const burnV = oppBurned ? 0 : BURN_VALUE
  const knockV = oppKnocked ? 0 : KNOCKDOWN_VALUE
  const gainFm = (n: number) => Math.min(fmCap, fm + n) - fm // gains au-delà du cap perdus

  // Fireball (3/4/5 F) : +1 FM (2 en II)
  if (a >= 3) {
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const dmg = FIREBALL_DMG[tier]
    const fmGain = gainFm(has('fireball-ii') ? 2 : 1)
    const label = a >= 5 ? 'Fireball 5F (AAAAA)' : a >= 4 ? 'Fireball 4F (AAAA)' : 'Fireball 3F (AAA)'
    out.push([label, dmg + fmGain * FM_VALUE - tax(true), dmg])
  }

  // Burning Soul (>=2 S) : 2 FM par S + 1 collatéral par S (indéfendable)
  if (c >= 2) {
    const up = has('burning-soul-ii')
    const fmGain = gainFm(2 * c)
    let v = fmGain * FM_VALUE + c
    if (up && c >= 3) v += burnV
    if (up && c >= 4) v += FM_VALUE // stack limit +1 (permanent, compté comme ~1 FM)
    out.push(['Burning Soul (CC)', v, c])
  }

  // Combustion (1 de chaque) : +1 FM puis retire jusqu'à 4 FM -> 3/4 dmg indéf PAR jeton
  if (a >= 1 && b >= 1 && c >= 1 && d >= 1) {
    const per = has('combustion-ii') ? COMBUSTION_DMG_PER_TOKEN_II : COMBUSTION_DMG_PER_TOKEN
    const removable = Math.min(4, Math.min(fmCap, fm + 1))
    const dmg = removable * per
    out.push(['Combustion (ABCD)', dmg - removable * FM_VALUE + FM_VALUE, dmg])
  }

  // Pyroblast (4 F + 1 M) : 6 dmg + 1d6 d'effets (II/III : 2d6, III relance 1)
  if (a >= 4 && d >= 1) {
    const dice2 = (has('pyroblast-ii') || has('pyroblast-iii')) ? 2 : 1
    // E[par dé] = 1/2*3 dmg + 1/6*Burn + 1/6*2 FM + 1/6*Knockdown
    const perDie = 0.5 * 3 + (burnV + 2 * FM_VALUE + knockV) / 6
    const reroll = has('pyroblast-iii') ? 0.4 : 0 // relance optionnelle ~ +0.4
    out.push(['Pyroblast (AAAAD)', PYROBLAST_DMG + dice2 * perDie + reroll - tax(true), PYROBLAST_DMG])
  }

  // Hot Streak (petite suite) : +2 FM PUIS base + 1/FM
  if (hasStraight(dice, 4)) {
    const base = has('hot-streak-ii') ? HOT_STREAK_BASE_II : HOT_STREAK_BASE
    const fmAfter = Math.min(fmCap, fm + 2)
    const dmg = base + fmAfter
    out.push(['Hot Streak (4-straight)', dmg + (fmAfter - fm) * FM_VALUE - tax(true), dmg])
  }

  // Ignite (grande suite) : +2 FM PUIS base + 2/FM (II : + Burn)
  if (hasStraight(dice, 5)) {
    const up = has('ignite-ii')
    const base = up ? IGNITE_BASE_II : IGNITE_BASE
    const fmAfter = Math.min(fmCap, fm + 2)
    const dmg = base + 2 * fmAfter
    out.push(['Ignite (5-straight)', dmg + (fmAfter - fm) * FM_VALUE + (up ? burnV : 0) - tax(true), dmg])
  }

  // Scorch (AABB, Hot Streak II) : +2 FM, Burn, 6 dmg
  if (a >= 2 && b >= 2 && has('hot-streak-ii')) {
    out.push(['Scorch (AABB)', SCORCH_DMG + gainFm(2) * FM_VALUE + burnV - tax(true), SCORCH_DMG])
  }

  // Blazing Soul (BBCC, Ignite II) : cap +1, +5 FM, Knockdown
  if (b >= 2 && c >= 2 && has('ignite-ii')) {
    const fmGain = Math.min(fmCap + 1, fm + 5) - fm
    out.push(['Blazing Soul (BBCC)', fmGain * FM_VALUE + FM_VALUE + knockV, 0])
  }

  // Meteoroid (DDD, Meteorite II) : Knockdown + Burn + Stun (l'infligeur rejoue une phase)
  if (d >= 3 && has('meteorite-ii')) {
    out.push(['Meteoroid (DDD)', knockV + burnV + STUN_EXTRA_PHASE_VALUE, 0])
  }

  // Meteorite (DDDD) : +2 FM, Stun, 1 indéf par FM (après gain), + collatéraux
  if (d >= 4) {
    const coll = has('meteorite-ii') ? METEORITE_COLLATERAL_II : METEORITE_COLLATERAL
    const fmAfter = Math.min(fmCap, fm + 2)
    const dmg = fmAfter + coll
    out.push(['Meteorite (DDDD)', dmg + (fmAfter - fm) * FM_VALUE + STUN_EXTRA_PHASE_VALUE, dmg])
  }

  // Scorch the Earth (DDDDD) — ULTIMATE
  if (d >= 5) {
    out.push(['Scorch the Earth (DDDDD)', ULT_DMG + ULT_COLLATERAL + gainFm(3) * FM_VALUE + knockV + burnV, ULT_DMG + ULT_COLLATERAL])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], fm: number, fmCap: number, oppBurned: boolean, oppKnocked: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, fm, fmCap, oppBurned, oppKnocked, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], fm: number, fmCap: number, oppBurned: boolean, oppKnocked: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, fm, fmCap, oppBurned, oppKnocked, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], fm: number, fmCap: number, oppBurned: boolean, oppKnocked: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, fm, fmCap, oppBurned, oppKnocked, upgradeIds, defenseTax).map(([n, v, dd]) => [n, [v, dd] as const]))
  const all = [
    'Fireball 3F (AAA)', 'Fireball 4F (AAAA)', 'Fireball 5F (AAAAA)', 'Burning Soul (CC)',
    'Combustion (ABCD)', 'Pyroblast (AAAAD)', 'Hot Streak (4-straight)', 'Ignite (5-straight)',
    'Meteorite (DDDD)', 'Scorch the Earth (DDDDD)',
  ]
  if (upgradeIds.includes('hot-streak-ii')) all.push('Scorch (AABB)')
  if (upgradeIds.includes('ignite-ii')) all.push('Blazing Soul (BBCC)')
  if (upgradeIds.includes('meteorite-ii')) all.push('Meteoroid (DDD)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
