// Mythic Brawler — matching + valeurs EV (board vérifié). Dé : 1-3 Fist (A), 4-5 Spirit (B), 6 Peak (C).
import type { AbilityEntry } from '../../core/types.js'
import {
  mountainMarginal, skyMarginal, oceanMarginal, CONCUSSION_VALUE, HEAL_VALUE, CARD_VALUE,
  strengthGainValue, STRONG_ARM_DMG_WIN, STRONG_ARM_DMG_LOSE, STRONG_ARM_WIN_P,
  TIDAL_DMG, TIDAL_BONUS_E_DMG, TIDAL_BONUS_P_DRAW, TIDAL_BONUS_P_CONC,
  TIDAL_II_E_DMG, TIDAL_II_P_DRAW, TIDAL_II_P_CONC,
  CLOBBER_DMG, CLOBBER_DMG_II, HEALING_WIND_HEAL,
  ANCESTRAL_DMG, ANCESTRAL_DMG_II, SPIRIT_STRIKE_DMG, SPIRIT_STRIKE_DMG_II,
  TECTONIC_DMG, TECTONIC_DMG_II, TECTONIC_SPEND_BONUS, KNOCK_OUT_DMG, ULT_DMG,
} from './constants.js'

export function mbFaceToSymbol(face: number): 'A' | 'B' | 'C' {
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
// mountain : +1 dmg PAR jeton Mountain sur TOUTE attaque qui inflige des dégâts (Attack
// Modifier persistant) — inclus ici ET appliqué par le moteur (applyMBAbility).
export function getCandidates(
  dice: number[],
  ocean: number,
  mountain: number,
  sky: number,
  oppConcussed: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)

  const str$ = (n: number) => strengthGainValue(n, ocean, mountain, sky)
  const conc$ = (p = 1) => (oppConcussed ? 0 : p * CONCUSSION_VALUE)

  // Strong Arm (AAAC) : duel de dés — gagné (>= , 21/36) : gain 1 Strength + 6 ; perdu : 7
  if (a >= 3 && c >= 1) {
    const eDmg = STRONG_ARM_WIN_P * STRONG_ARM_DMG_WIN + (1 - STRONG_ARM_WIN_P) * STRONG_ARM_DMG_LOSE + mountain
    out.push(['Strong Arm (AAAC)', eDmg + STRONG_ARM_WIN_P * str$(1) - tax(true), eDmg])
  }

  // Tidal Blow (AAABB) : gain Ocean ; 6 + dé(s) bonus
  if (a >= 3 && b >= 2) {
    const up = has('tidal-blow-ii')
    const eDmg = TIDAL_DMG + (up ? TIDAL_II_E_DMG : TIDAL_BONUS_E_DMG) + mountain
    const pDraw = up ? TIDAL_II_P_DRAW : TIDAL_BONUS_P_DRAW
    const pConc = up ? TIDAL_II_P_CONC : TIDAL_BONUS_P_CONC
    const oceanGain = oceanMarginal(ocean)
    out.push(['Tidal Blow (AAABB)', eDmg + oceanGain + pDraw * CARD_VALUE + conc$(pConc) - tax(true), eDmg])
  }

  // Clobber (AAAA / AAAAA) ; 4-of-a-kind (#) -> Concussion ; II : 3-of-a-kind -> Sky
  if (a >= 4) {
    const up = has('clobber-ii')
    const table = up ? CLOBBER_DMG_II : CLOBBER_DMG
    const tier = a >= 5 ? 1 : 0
    const kind = maxOfAKind(dice)
    const dmg = table[tier] + mountain
    let v = dmg - tax(true)
    if (kind >= 4) v += conc$()
    if (up && kind >= 3) v += skyMarginal(sky)
    out.push([a >= 5 ? 'Clobber 5A (AAAAA)' : 'Clobber 4A (AAAA)', v, dmg])
  }

  // Healing Wind (BBBC) : Heal 3 + 2 Strengths — pas de dégâts
  if (b >= 3 && c >= 1) {
    out.push(['Healing Wind (BBBC)', HEALING_WIND_HEAL * HEAL_VALUE + str$(2), 0])
  }

  // Ancestral Strength (CCCC) : 2 Strengths + 7/9 INDÉFENDABLES
  if (c >= 4) {
    const dmg = (has('ancestral-strength-ii') ? ANCESTRAL_DMG_II : ANCESTRAL_DMG) + mountain
    out.push(['Ancestral Strength (CCCC)', dmg + str$(2), dmg])
  }

  // Spirit Call (CCC, Ancestral Strength II) : 2 Strengths + Concussion — pas de dégâts
  if (c >= 3 && has('ancestral-strength-ii')) {
    out.push(['Spirit Call (CCC)', str$(2) + conc$(), 0])
  }

  // Knock Out (ABBC, Tectonic Punch II) : 3 INDÉFENDABLES
  if (a >= 1 && b >= 2 && c >= 1 && has('tectonic-punch-ii')) {
    out.push(['Knock Out (ABBC)', KNOCK_OUT_DMG + mountain, KNOCK_OUT_DMG + mountain])
  }

  // Spirit Strike (petite suite) / Tectonic Punch (grande suite)
  if (hasStraight(dice, 5)) {
    if (has('tectonic-punch-ii')) {
      const dmg = TECTONIC_DMG_II + mountain
      out.push(['Tectonic Punch (5-straight)', dmg + mountainMarginal(mountain) - tax(true), dmg])
    } else {
      // CHOIX : gain Mountain OU retirer 1 Mountain pour +3 (heuristique moteur : dépense
      // seulement au cap — même arbitrage qu'ici, valeurs alignées)
      const optGain = TECTONIC_DMG + mountain + mountainMarginal(mountain)
      const optSpend = mountain >= 1 ? TECTONIC_DMG + TECTONIC_SPEND_BONUS + (mountain - 1) - mountainMarginal(mountain - 1) : -Infinity
      const spend = optSpend > optGain
      const dmg = spend ? TECTONIC_DMG + TECTONIC_SPEND_BONUS + (mountain - 1) : TECTONIC_DMG + mountain
      out.push(['Tectonic Punch (5-straight)', Math.max(optGain, optSpend) - tax(true), dmg])
    }
  } else if (hasStraight(dice, 4)) {
    const up = has('spirit-strike-ii')
    const dmg = (up ? SPIRIT_STRIKE_DMG_II : SPIRIT_STRIKE_DMG) + mountain
    const healBonus = up && [3, 4, 5, 6].every(v => dice.includes(v)) ? HEAL_VALUE : 0
    out.push(['Spirit Strike (4-straight)', dmg + str$(1) + healBonus - tax(true), dmg])
  }

  // Power of the Ancients! (CCCCC) — ULTIMATE indéfendable : 2 Strengths + Concussion + 12
  if (c >= 5) {
    const dmg = ULT_DMG + mountain
    out.push(['Power of the Ancients! (CCCCC)', dmg + str$(2) + conc$(), dmg])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], ocean: number, mountain: number, sky: number, oppConcussed: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, ocean, mountain, sky, oppConcussed, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], ocean: number, mountain: number, sky: number, oppConcussed: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, ocean, mountain, sky, oppConcussed, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], ocean: number, mountain: number, sky: number, oppConcussed: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, ocean, mountain, sky, oppConcussed, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Strong Arm (AAAC)', 'Tidal Blow (AAABB)', 'Clobber 4A (AAAA)', 'Clobber 5A (AAAAA)',
    'Healing Wind (BBBC)', 'Ancestral Strength (CCCC)', 'Spirit Strike (4-straight)',
    'Tectonic Punch (5-straight)', 'Power of the Ancients! (CCCCC)',
  ]
  if (upgradeIds.includes('ancestral-strength-ii')) all.push('Spirit Call (CCC)')
  if (upgradeIds.includes('tectonic-punch-ii')) all.push('Knock Out (ABBC)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
