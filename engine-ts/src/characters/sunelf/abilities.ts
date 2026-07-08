// Sun Elf — matching + valeurs EV (board vérifié). Dé : 1-3 Stave (A), 4-5 Charge (B), 6 Sun Power (C).
import type { AbilityEntry } from '../../core/types.js'
import {
  DIAL_VALUE, DIAL_RESIDUAL_DAWN, GEM_VALUE, SUN_MARKED_VALUE, HEAL_VALUE, dialValueOfGaining,
  LIGHT_STAFF_DMG, LIGHT_STAFF_DMG_II, RAY_ABSORPTION_DIAL, RAY_ABSORPTION_HEAL,
  RADIANT_ENERGY_DMG, PRAISE_THE_SUN_DMG, SCORCHING_DMG,
  SCORCHING_BONUS_E_DMG, SCORCHING_BONUS_E_DIAL, SCORCHING_BONUS_P_GEM,
  SCORCHING_II_E_DMG, SCORCHING_II_E_DIAL, SCORCHING_II_P_GEM,
  RAY_OF_LIGHT_DMG, RAY_OF_LIGHT_DIAL, SUNBEAM_DMG, SUNBEAM_DIAL, SUNBEAM_DIAL_II, SOAKING_DMG,
  SOLAR_BURST_DMG, SOLAR_BURST_DMG_II, SOLAR_BURST_DIAL, BESTOW_DIAL, ULT_DMG, ULT_DIAL,
} from './constants.js'

export function seFaceToSymbol(face: number): 'A' | 'B' | 'C' {
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
// dawn+dial : côté DAWN, l'attaque peut dumper la valeur du cadran en dégâts (puis -4) —
// le moteur (applySEAbility) dépense dès que dial >= 3 (heuristique IA / pré-armé humain).
export function getCandidates(
  dice: number[],
  dial: number,
  dawn: boolean,
  gemHeld: boolean,
  oppMarked: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)

  const gem = (p = 1) => (gemHeld ? 0 : p * GEM_VALUE)
  const mark = () => (oppMarked ? 0 : SUN_MARKED_VALUE)
  const dial$ = (n: number) => dialValueOfGaining(dial, n)
  // Bonus DAWN (même règle que le moteur : dépense si cadran >= 3) : +dial en dégâts,
  // moins la valeur résiduelle des 4 points consommés.
  const dawnBonus = dawn && dial >= 3 ? dial - DIAL_RESIDUAL_DAWN * Math.min(dial, 4) : 0

  // Light Staff (3/4/5 A) ; N-of-a-kind (#'s, II : 3) -> Dial +1
  if (a >= 3) {
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('light-staff-ii') ? LIGHT_STAFF_DMG_II : LIGHT_STAFF_DMG
    const kindNeed = has('light-staff-ii') ? 3 : 4
    const kindBonus = maxOfAKind(dice) >= kindNeed ? dial$(1) : 0
    const label = a >= 5 ? 'Light Staff 5A (AAAAA)' : a >= 4 ? 'Light Staff 4A (AAAA)' : 'Light Staff 3A (AAA)'
    out.push([label, table[tier] + dawnBonus + kindBonus - tax(true), table[tier]])
  }

  // Ray Absorption (BBBB) : Dial +3, Heal 2, Charged Gem — pas de dégâts
  if (b >= 4) {
    out.push(['Ray Absorption (BBBB)', dial$(RAY_ABSORPTION_DIAL) + RAY_ABSORPTION_HEAL * HEAL_VALUE + gem(), 0])
  }

  // Radiant Energy (AAACC ; II : AACC) : Sun Marked + 6 dmg
  if ((has('radiant-energy-ii') ? a >= 2 : a >= 3) && c >= 2) {
    out.push(['Radiant Energy (AAACC)', RADIANT_ENERGY_DMG + dawnBonus + mark() - tax(true), RADIANT_ENERGY_DMG])
  }

  // Praise the Sun (AAAC, Radiant Energy II) : Charged Gem + 5 dmg
  if (a >= 3 && c >= 1 && has('radiant-energy-ii')) {
    out.push(['Praise the Sun (AAAC)', PRAISE_THE_SUN_DMG + dawnBonus + gem() - tax(true), PRAISE_THE_SUN_DMG])
  }

  // Scorching Staff (ABBB) : 5 + dé(s) bonus
  if (a >= 1 && b >= 3) {
    const up = has('scorching-staff-ii')
    const eDmg = up ? SCORCHING_II_E_DMG : SCORCHING_BONUS_E_DMG
    const eDial = up ? SCORCHING_II_E_DIAL : SCORCHING_BONUS_E_DIAL
    const pGem = up ? SCORCHING_II_P_GEM : SCORCHING_BONUS_P_GEM
    const v = SCORCHING_DMG + eDmg + dawnBonus + dialValueOfGaining(dial, 1) * eDial + gem(pGem) - tax(true)
    out.push(['Scorching Staff (ABBB)', v, SCORCHING_DMG])
  }

  // Ray of Light / Sunbeam (suites)
  if (hasStraight(dice, 5)) {
    const d = has('sunbeam-ii') ? SUNBEAM_DIAL_II : SUNBEAM_DIAL
    out.push(['Sunbeam (5-straight)', SUNBEAM_DMG + dawnBonus + dial$(d) - tax(true), SUNBEAM_DMG])
  } else if (hasStraight(dice, 4)) {
    out.push(['Ray of Light (4-straight)', RAY_OF_LIGHT_DMG + dawnBonus + dial$(RAY_OF_LIGHT_DIAL) - tax(true), RAY_OF_LIGHT_DMG])
  }

  // Soaking Up the Sun (BCCC, Sunbeam II) : Charged Gem + 9 dmg
  if (b >= 1 && c >= 3 && has('sunbeam-ii')) {
    out.push(['Soaking Up the Sun (BCCC)', SOAKING_DMG + dawnBonus + gem() - tax(true), SOAKING_DMG])
  }

  // Solar Burst (CCCC) : Dial +2 ; I : gem OU mark (le meilleur) + 8 ; II : gem ET mark + 7 indéf.
  if (c >= 4) {
    if (has('solar-burst-ii')) {
      out.push(['Solar Burst (CCCC)', SOLAR_BURST_DMG_II + dawnBonus + dial$(SOLAR_BURST_DIAL) + gem() + mark(), SOLAR_BURST_DMG_II])
    } else {
      out.push(['Solar Burst (CCCC)', SOLAR_BURST_DMG + dawnBonus + dial$(SOLAR_BURST_DIAL) + Math.max(gem(), mark()) - tax(true), SOLAR_BURST_DMG])
    }
  }

  // Bestow Your Light (CCC, Solar Burst II) : Dial +4 + Sun Marked, pas de dégâts
  if (c >= 3 && has('solar-burst-ii')) {
    out.push(['Bestow Your Light (CCC)', dial$(BESTOW_DIAL) + mark(), 0])
  }

  // Solar Flare! (CCCCC) — ULTIMATE indéfendable (le bonus DAWN s'applique — ruling user)
  if (c >= 5) {
    out.push(['Solar Flare! (CCCCC)', ULT_DMG + dawnBonus + dial$(ULT_DIAL) + gem() + mark(), ULT_DMG])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], dial: number, dawn: boolean, gemHeld: boolean, oppMarked: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], dial: number, dawn: boolean, gemHeld: boolean, oppMarked: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], dial: number, dawn: boolean, gemHeld: boolean, oppMarked: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, dial, dawn, gemHeld, oppMarked, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Light Staff 3A (AAA)', 'Light Staff 4A (AAAA)', 'Light Staff 5A (AAAAA)',
    'Ray Absorption (BBBB)', 'Radiant Energy (AAACC)', 'Scorching Staff (ABBB)',
    'Ray of Light (4-straight)', 'Sunbeam (5-straight)', 'Solar Burst (CCCC)', 'Solar Flare! (CCCCC)',
  ]
  if (upgradeIds.includes('radiant-energy-ii')) all.push('Praise the Sun (AAAC)')
  if (upgradeIds.includes('sunbeam-ii')) all.push('Soaking Up the Sun (BCCC)')
  if (upgradeIds.includes('solar-burst-ii')) all.push('Bestow Your Light (CCC)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
