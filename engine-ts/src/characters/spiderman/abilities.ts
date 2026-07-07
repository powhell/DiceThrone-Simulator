// Spider-Man — matching + valeurs EV (board vérifié, SPEC.md). Dé : 1-3 Thwip, 4-5 Web, 6 Spider.
import type { AbilityEntry } from '../../core/types.js'
import {
  COMBO_VALUE, WEBBED_VALUE, INVIS_VALUE, CARD_DRAW_VALUE,
  PUNCH_DMG, PUNCH_DMG_II, CCC_COMBO_DMG, CCC_COMBO_DMG_II,
  SPIDER_REFLEXES_EV, SPIDER_REFLEXES_P_COMBO, WALL_CRAWLER_DMG,
  ENSNARE_SMALL_DMG, ENSNARE_SMALL_DMG_II, ENSNARE_LARGE_DMG, ENSNARE_LARGE_DMG_II,
  VENOM_PUNCH_DMG, VENOM_PUNCH_DMG_II, VENOM_SHOCKWAVE_DMG, COMBO_UP_DMG,
} from './constants.js'

export function smFaceToSymbol(face: number): 'A' | 'B' | 'C' {
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

// Les jetons sont tous stack 1 : un gain quand on le détient déjà vaut 0.
// comboHeld/invisHeld = les nôtres ; oppWebbed = l'adversaire est déjà Webbed.
export function getCandidates(
  dice: number[],
  comboHeld: boolean,
  invisHeld: boolean,
  oppWebbed: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)
  const comboV = comboHeld ? 0 : COMBO_VALUE
  const invisV = invisHeld ? 0 : INVIS_VALUE
  const webbedV = oppWebbed ? 0 : WEBBED_VALUE

  // Punch (3/4/5 Thwip) ; II : 4-of-a-kind (chiffres) -> Combo
  if (a >= 3) {
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const dmg = (has('punch-ii') ? PUNCH_DMG_II : PUNCH_DMG)[tier]
    const comboBonus = has('punch-ii') && maxOfAKind(dice) >= 4 ? comboV : 0
    const label = a >= 5 ? 'Punch 5A (AAAAA)' : a >= 4 ? 'Punch 4A (AAAA)' : 'Punch 3A (AAA)'
    out.push([label, dmg + comboBonus - tax(true), dmg])
  }

  // C-C-C-Combo (AACC) : dmg + Combo
  if (a >= 2 && c >= 2) {
    const dmg = has('combo-ii') ? CCC_COMBO_DMG_II : CCC_COMBO_DMG
    out.push(['C-C-C-Combo (AACC)', dmg + comboV - tax(true), dmg])
  }

  // Web Shot (BBC, C-C-C-Combo II) : Invisibility + Webbed, pas de dégâts directs
  if (b >= 2 && c >= 1 && has('combo-ii')) {
    out.push(['Web Shot (BBC)', invisV + webbedV, 0])
  }

  // Spider-Reflexes (ABBC) : 2d6 = dégâts ; total <= 5 -> Combo
  if (a >= 1 && b >= 2 && c >= 1) {
    out.push(['Spider-Reflexes (ABBC)', SPIDER_REFLEXES_EV + SPIDER_REFLEXES_P_COMBO * comboV - tax(true), SPIDER_REFLEXES_EV])
  }

  // Wall Crawler (AABBB) : Invisibility + 7
  if (a >= 2 && b >= 3) {
    out.push(['Wall Crawler (AABBB)', WALL_CRAWLER_DMG + invisV - tax(true), WALL_CRAWLER_DMG])
  }

  // Ensnare (petite/grande suite) : dmg + Webbed (grande : pioche 1 en plus)
  if (hasStraight(dice, 5)) {
    const dmg = has('ensnare-ii') ? ENSNARE_LARGE_DMG_II : ENSNARE_LARGE_DMG
    out.push(['Ensnare (5-straight)', dmg + webbedV + CARD_DRAW_VALUE - tax(true), dmg])
  } else if (hasStraight(dice, 4)) {
    const dmg = has('ensnare-ii') ? ENSNARE_SMALL_DMG_II : ENSNARE_SMALL_DMG
    out.push(['Ensnare (4-straight)', dmg + webbedV - tax(true), dmg])
  }

  // Combo Up (CCC, Venom Punch II) : Combo + 2 indéfendables
  if (c >= 3 && has('venom-punch-ii')) {
    out.push(['Combo Up (CCC)', COMBO_UP_DMG + comboV, COMBO_UP_DMG])
  }

  // Venom Punch (CCCC) : Invisibility + 7/8 INDÉFENDABLES
  if (c >= 4) {
    const dmg = has('venom-punch-ii') ? VENOM_PUNCH_DMG_II : VENOM_PUNCH_DMG
    out.push(['Venom Punch (CCCC)', dmg + invisV, dmg])
  }

  // Venom Shockwave (CCCCC) — ULTIMATE : Invisibility + Webbed + 13
  if (c >= 5) {
    out.push(['Venom Shockwave (CCCCC)', VENOM_SHOCKWAVE_DMG + invisV + webbedV, VENOM_SHOCKWAVE_DMG])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], comboHeld: boolean, invisHeld: boolean, oppWebbed: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], comboHeld: boolean, invisHeld: boolean, oppWebbed: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], comboHeld: boolean, invisHeld: boolean, oppWebbed: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, comboHeld, invisHeld, oppWebbed, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Punch 3A (AAA)', 'Punch 4A (AAAA)', 'Punch 5A (AAAAA)', 'C-C-C-Combo (AACC)',
    'Spider-Reflexes (ABBC)', 'Wall Crawler (AABBB)', 'Ensnare (4-straight)', 'Ensnare (5-straight)',
    'Venom Punch (CCCC)', 'Venom Shockwave (CCCCC)',
  ]
  if (upgradeIds.includes('combo-ii')) all.push('Web Shot (BBC)')
  if (upgradeIds.includes('venom-punch-ii')) all.push('Combo Up (CCC)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
