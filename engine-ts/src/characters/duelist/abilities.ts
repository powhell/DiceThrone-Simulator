// Duelist — matching + valeurs EV (board vérifié, characters/Duelist/SPEC.md).
// Dé : 1-3 Blade (A), 4-5 Boot (B), 6 Pierce (C).
import type { AbilityEntry } from '../../core/types.js'
import {
  GB_VALUE, DISARM_VALUE, STEP_VALUE, gbValueOfGaining, offensiveBonusDmg,
  BLADE_FLURRY_DMG, BLADE_FLURRY_DMG_II, BALESTRA_DMG, BALESTRA_DMG_II, BALESTRA_STEPS,
  FANCY_FEET_STEPS, FEINT_ATTACK_DMG, FEINT_ATTACK_DMG_II, EN_GARDE_DMG, EN_GARDE_P_DISARM,
  STRIKE_SMALL_DMG, STRIKE_LARGE_DMG, BLADESTORM_DMG, BLADESTORM_DMG_II, BLADESTORM_STEPS,
  BLADEWIND_COLLATERAL, ULT_DMG, ULT_STEPS,
} from './constants.js'

export function duFaceToSymbol(face: number): 'A' | 'B' | 'C' {
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
// Le moteur (applyDUAbility) fait avancer l'IA au maximum sur ses Steps gratuits — le
// modèle suppose donc posAfter = min(2, pos + steps) et crédite le Bonus offensif de la
// position FINALE (un Bonus/tour : bonusAvailable=false quand déjà consommé) + une valeur
// résiduelle STEP_VALUE par Step pris.
export function getCandidates(
  dice: number[],
  footwork: number,
  guardBreak: number,
  oppDisarmed: boolean,
  bonusAvailable: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)

  // Valeur d'une attaque avec `steps` Steps gratuits pris vers l'avant : dégâts + Bonus
  // offensif de la position finale + résiduel des Steps.
  const stepPack = (steps: number) => {
    const posAfter = Math.min(2, footwork + steps)
    const moved = posAfter - footwork
    return { offBonus: bonusAvailable ? offensiveBonusDmg(posAfter) : 0, residual: STEP_VALUE * moved }
  }
  const baselineOff = bonusAvailable ? offensiveBonusDmg(footwork) : 0

  // Blade Flurry (3/4/5 Blades) ; sur N-of-a-kind (#'s, II : 3) -> may take 1 Step
  if (a >= 3) {
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('blade-flurry-ii') ? BLADE_FLURRY_DMG_II : BLADE_FLURRY_DMG
    const kindNeed = has('blade-flurry-ii') ? 3 : 4
    const steps = maxOfAKind(dice) >= kindNeed ? 1 : 0
    const p = stepPack(steps)
    const label = a >= 5 ? 'Blade Flurry 5A (AAAAA)' : a >= 4 ? 'Blade Flurry 4A (AAAA)' : 'Blade Flurry 3A (AAA)'
    out.push([label, table[tier] + p.offBonus + p.residual - tax(true), table[tier]])
  }

  // Balestra (AABB) : up to 2 Steps puis 6 (II : 8)
  if (a >= 2 && b >= 2) {
    const dmg = has('balestra-ii') ? BALESTRA_DMG_II : BALESTRA_DMG
    const p = stepPack(BALESTRA_STEPS)
    out.push(['Balestra (AABB)', dmg + p.offBonus + p.residual - tax(true), dmg])
  }

  // Fancy Feet (BBB, Balestra II) : GB + up to 3 Steps, pas de dégâts
  if (b >= 3 && has('balestra-ii')) {
    const p = stepPack(FANCY_FEET_STEPS)
    out.push(['Fancy Feet (BBB)', gbValueOfGaining(guardBreak, 1) + p.residual + STEP_VALUE, 0])
  }

  // Feint Attack (AACC) : GB (II : 2) + 1 Step + 2 (II : 3) dmg INDÉFENDABLES
  if (a >= 2 && c >= 2) {
    const up = has('feint-attack-ii')
    const dmg = up ? FEINT_ATTACK_DMG_II : FEINT_ATTACK_DMG
    const p = stepPack(1)
    out.push(['Feint Attack (AACC)', dmg + p.offBonus + p.residual + gbValueOfGaining(guardBreak, up ? 2 : 1), dmg])
  }

  // En Garde (CBBB) : 8 dmg + 4d6 : sur Pierce -> Disarm
  if (c >= 1 && b >= 3) {
    const disarmV = oppDisarmed ? 0 : EN_GARDE_P_DISARM * DISARM_VALUE
    out.push(['En Garde (CBBB)', EN_GARDE_DMG + baselineOff + disarmV - tax(true), EN_GARDE_DMG])
  }

  // Strike (petite / grande suite)
  if (hasStraight(dice, 5)) {
    const p = stepPack(1)
    out.push(['Strike (5-straight)', STRIKE_LARGE_DMG + p.offBonus + p.residual - tax(true), STRIKE_LARGE_DMG])
  } else if (hasStraight(dice, 4)) {
    out.push(['Strike (4-straight)', STRIKE_SMALL_DMG + baselineOff - tax(true), STRIKE_SMALL_DMG])
  }

  // Bladestorm (CCCC) : GB (II : 2) + Disarm + up to 2 Steps + 8 (II : 9)
  if (c >= 4) {
    const up = has('bladestorm-ii')
    const dmg = up ? BLADESTORM_DMG_II : BLADESTORM_DMG
    const p = stepPack(BLADESTORM_STEPS)
    const v = dmg + p.offBonus + p.residual + gbValueOfGaining(guardBreak, up ? 2 : 1)
      + (oppDisarmed ? 0 : DISARM_VALUE) - tax(true)
    out.push(['Bladestorm (CCCC)', v, dmg])
  }

  // Bladewind (CCC, Bladestorm II) : 3 collatéraux (indéfendables, non modifiables)
  if (c >= 3 && has('bladestorm-ii')) {
    out.push(['Bladewind (CCC)', BLADEWIND_COLLATERAL, BLADEWIND_COLLATERAL])
  }

  // Master of the Blade! (CCCCC) — ULTIMATE indéfendable
  if (c >= 5) {
    const p = stepPack(ULT_STEPS)
    const v = ULT_DMG + p.offBonus + p.residual + gbValueOfGaining(guardBreak, 2)
      + (oppDisarmed ? 0 : DISARM_VALUE)
    out.push(['Master of the Blade! (CCCCC)', v, ULT_DMG])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], footwork: number, guardBreak: number, oppDisarmed: boolean, bonusAvailable: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], footwork: number, guardBreak: number, oppDisarmed: boolean, bonusAvailable: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], footwork: number, guardBreak: number, oppDisarmed: boolean, bonusAvailable: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, footwork, guardBreak, oppDisarmed, bonusAvailable, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Blade Flurry 3A (AAA)', 'Blade Flurry 4A (AAAA)', 'Blade Flurry 5A (AAAAA)',
    'Balestra (AABB)', 'Feint Attack (AACC)', 'En Garde (CBBB)',
    'Strike (4-straight)', 'Strike (5-straight)', 'Bladestorm (CCCC)', 'Master of the Blade! (CCCCC)',
  ]
  if (upgradeIds.includes('balestra-ii')) all.push('Fancy Feet (BBB)')
  if (upgradeIds.includes('bladestorm-ii')) all.push('Bladewind (CCC)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
