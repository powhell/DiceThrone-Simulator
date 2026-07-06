// Thor — matching + valeurs EV (board vérifié, SPEC.md). Dé : 1-3 Marteau, 4-5 Digne, 6 Tonnerre.
import type { AbilityEntry } from '../../core/types.js'
import {
  EK_VALUE, GB_VALUE, HEAL_VALUE, CP_TO_DMG_EQUIV,
  HAMMERED_DMG, HAMMERED_DMG_II, HAMMERED_DMG_III,
  MIGHTY_SUMMON_HEAL, MIGHTY_SUMMON_HEAL_II, MIGHTY_SUMMON_COLLATERAL, MIGHTY_SUMMON_COLLATERAL_II,
  CHAIN_LIGHTNING_EV, CHAIN_LIGHTNING_EV_II, CHAIN_LIGHTNING_COLLATERAL, CHAIN_LIGHTNING_COLLATERAL_II,
  ODINFORCE_DMG, ODINFORCE_DMG_II, ODINFORCE_P_SHUTTLE, ODINFORCE_P_CP, ODINFORCE_E_THUNDER,
  BOTTLED_DMG, BOTTLED_DMG_II, LIGHTNING_ROD_DMG, LIGHTNING_ROD_DMG_MJOLNIR, LIGHTNING_ROD_DMG_II,
  THUNDER_BOLT_DMG, THUNDER_BOLT_DMG_II, FOR_ASGARD_DMG, BOOM_BOOM_DMG, ASGARDIAN_BRAWN_HEAL, RICOCHET_STEPS,
} from './constants.js'

export function thFaceToSymbol(face: number): 'A' | 'B' | 'C' {
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

// Valeur d'une séquence de navettes Mjölnir : alternance depuis la position courante.
// Throw = 1 dmg isolé indéfendable ; Retrieve = +1 EK.
export function shuttleValue(steps: number, home: boolean): number {
  let v = 0
  let h = home
  for (let i = 0; i < steps; i++) {
    v += h ? 1 : EK_VALUE
    h = !h
  }
  return v
}

// [name, valeur totale, dégâts directs]
export function getCandidates(
  dice: number[],
  mjolnirHome: boolean,
  electrokinesis: number,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)
  const ek = electrokinesis

  // Hammered (3/4/5 marteaux) + Throw (I) / Throw-or-Retrieve (II/III)
  if (a >= 3) {
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const dmgTable = has('hammered-iii') ? HAMMERED_DMG_III : has('hammered-ii') ? HAMMERED_DMG_II : HAMMERED_DMG
    const dmg = dmgTable[tier]
    // I : Throw seulement (rien si le marteau est absent) ; II/III : navette au choix
    const moveV = (has('hammered-ii') || has('hammered-iii')) ? shuttleValue(1, mjolnirHome) : (mjolnirHome ? 1 : 0)
    const kindNeed = has('hammered-iii') ? 3 : has('hammered-ii') ? 4 : 99
    const ekBonus = maxOfAKind(dice) >= kindNeed ? EK_VALUE : 0
    const label = a >= 5 ? 'Hammered 5H' : a >= 4 ? 'Hammered 4H' : 'Hammered 3H'
    out.push([label, dmg + moveV + ekBonus - tax(true), dmg])
  }

  // Mighty Summon (H+WW+T) — pas de dégâts directs (collateral isolé si Retrieve)
  if (a >= 1 && b >= 2 && c >= 1) {
    const up = has('mighty-summon-ii')
    const heal = up ? MIGHTY_SUMMON_HEAL_II : MIGHTY_SUMMON_HEAL
    const coll = up ? MIGHTY_SUMMON_COLLATERAL_II : MIGHTY_SUMMON_COLLATERAL
    const branch = mjolnirHome ? 3 * EK_VALUE : coll + EK_VALUE // Retrieve donne aussi son EK
    out.push(['Mighty Summon (HWWT)', 2 * GB_VALUE + heal * HEAL_VALUE + branch, 0])
  }

  // Boom Boom! (HH+TT, Mighty Summon II)
  if (a >= 2 && c >= 2 && has('mighty-summon-ii')) {
    out.push(['Boom Boom! (HHTT)', BOOM_BOOM_DMG + 2 * EK_VALUE - tax(true), BOOM_BOOM_DMG])
  }

  // Chain Lightning (HHH+TT) : 3d6 (4 en II), somme des 2 meilleurs + collateral
  if (a >= 3 && c >= 2) {
    const up = has('chain-lightning-ii')
    const ev = up ? CHAIN_LIGHTNING_EV_II : CHAIN_LIGHTNING_EV
    const coll = up ? CHAIN_LIGHTNING_COLLATERAL_II : CHAIN_LIGHTNING_COLLATERAL
    out.push(['Chain Lightning (HHHTT)', ev + coll - tax(true), Math.round(ev)])
  }

  // Odinforce (HH+WWW) : dmg + jet de 5 dés à effets + boost EK
  if (a >= 2 && b >= 3) {
    const dmg = has('odinforce-ii') ? ODINFORCE_DMG_II : ODINFORCE_DMG
    const expectEkGain = ODINFORCE_E_THUNDER
    const boost = Math.min(4, ek + expectEkGain) // +1 dmg x EK (après gains)
    const v = dmg + boost
      + ODINFORCE_P_SHUTTLE * shuttleValue(1, mjolnirHome)
      + ODINFORCE_P_CP * CP_TO_DMG_EQUIV
      + expectEkGain * EK_VALUE
      - tax(true)
    out.push(['Odinforce (HHWWW)', v, dmg])
  }

  // Bottled Lightning (TTTT) : navettes + GB + dmg boosté EK
  if (c >= 4) {
    const up = has('bottled-lightning-ii')
    const dmg = (up ? BOTTLED_DMG_II : BOTTLED_DMG) + Math.min(4, ek)
    const steps = up ? 3 : 2
    out.push(['Bottled Lightning (TTTT)', dmg + shuttleValue(steps, mjolnirHome) + 2 * GB_VALUE - tax(true), dmg])
  }

  // Ricochet! (TTT, Bottled Lightning II) : 6 navettes, pas d'attaque
  if (c >= 3 && has('bottled-lightning-ii')) {
    out.push(['Ricochet! (TTT)', shuttleValue(RICOCHET_STEPS, mjolnirHome), 0])
  }

  // Lightning Rod (suite de 4)
  if (hasStraight(dice, 4)) {
    if (has('lightning-rod-ii')) {
      out.push(['Lightning Rod (4-straight)', LIGHTNING_ROD_DMG_II + shuttleValue(1, mjolnirHome) + EK_VALUE - tax(true), LIGHTNING_ROD_DMG_II])
    } else {
      // 9 si l'adversaire a Mjölnir (= il est away), sinon 7 + 1 EK
      const v = mjolnirHome ? LIGHTNING_ROD_DMG + EK_VALUE : LIGHTNING_ROD_DMG_MJOLNIR
      const dmg = mjolnirHome ? LIGHTNING_ROD_DMG : LIGHTNING_ROD_DMG_MJOLNIR
      out.push(['Lightning Rod (4-straight)', v - tax(true), dmg])
    }
  }

  // Thunder Bolt (suite de 5)
  if (hasStraight(dice, 5)) {
    const dmg = has('thunder-bolt-ii') ? THUNDER_BOLT_DMG_II : THUNDER_BOLT_DMG
    out.push(['Thunder Bolt (5-straight)', dmg + shuttleValue(1, mjolnirHome) + 2 * EK_VALUE - tax(true), dmg])
  }

  // Asgardian Brawn (WWW, Thunder Bolt II) : soin pur
  if (b >= 3 && has('thunder-bolt-ii')) {
    out.push(['Asgardian Brawn (WWW)', ASGARDIAN_BRAWN_HEAL * HEAL_VALUE, 0])
  }

  // For Asgard! (TTTTT) — ULTIMATE indéfendable
  if (c >= 5) {
    out.push(['For Asgard! (TTTTT)', FOR_ASGARD_DMG + GB_VALUE + shuttleValue(4, mjolnirHome), FOR_ASGARD_DMG])
  }

  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], mjolnirHome: boolean, ek: number, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, mjolnirHome, ek, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], mjolnirHome: boolean, ek: number, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, mjolnirHome, ek, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], mjolnirHome: boolean, ek: number, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, mjolnirHome, ek, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Hammered 3H', 'Hammered 4H', 'Hammered 5H', 'Mighty Summon (HWWT)', 'Chain Lightning (HHHTT)',
    'Odinforce (HHWWW)', 'Bottled Lightning (TTTT)', 'Lightning Rod (4-straight)',
    'Thunder Bolt (5-straight)', 'For Asgard! (TTTTT)',
  ]
  if (upgradeIds.includes('mighty-summon-ii')) all.push('Boom Boom! (HHTT)')
  if (upgradeIds.includes('bottled-lightning-ii')) all.push('Ricochet! (TTT)')
  if (upgradeIds.includes('thunder-bolt-ii')) all.push('Asgardian Brawn (WWW)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
