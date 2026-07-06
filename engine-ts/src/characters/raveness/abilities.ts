// Raveness — matching des habiletés et valeurs EV (board vérifié par scans user 2026-07-06).
// Dé : 1-3 Talon (A), 4-5 Wing (B), 6 Raven Eye (C). Hex sur SOI : les 6 sont des faces
// blanches (ni C ni rien) — géré via le flag `hexed` de l'état.
import type { AbilityEntry } from '../../core/types.js'
import {
  NEVERMORE_ACTIVATION_VALUE, FEATHER_VALUE, FEATHER_CAP, HEX_VALUE,
  CARD_DRAW_VALUE, PECK_DMG, PECK_DMG_UPGRADED, RAVEN_SIGHT_DMG, CRAVEN_DMG,
  CRAVEN_DMG_UPGRADED, BEGUILE_DMG, MURDER_DMG, MURDER_DMG_UPGRADED, CHAMBER_DMG,
  AVIARY_DMG, PLUCK_DMG, FANTASTIC_TERRORS_DMG,
} from './constants.js'

export function rvFaceToSymbol(face: number): 'A' | 'B' | 'C' {
  return face <= 3 ? 'A' : face <= 5 ? 'B' : 'C'
}

function classify(dice: number[], hexed: boolean): { A: number; B: number; C: number } {
  let A = 0, B = 0, C = 0
  for (const d of dice) {
    if (d <= 3) A += 1
    else if (d <= 5) B += 1
    else if (!hexed) C += 1 // Hex : les 6 sont BLANCS pour l'affligé
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
  return uniq.length >= len && run >= len
}

function maxOfAKind(dice: number[]): number {
  const counts = new Map<number, number>()
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
  return Math.max(...counts.values())
}

// Gain de Feather plafonné par le stock actuel (cap 5, +1 avec Birds of a Feather).
function featherGainValue(current: number, gain: number, cap = FEATHER_CAP): number {
  return Math.min(gain, Math.max(0, cap - current)) * FEATHER_VALUE
}

// [name, valeur totale, dégâts directs]
export function getCandidates(
  dice: number[],
  feathers: number,
  nevermoreOnOpponent: boolean,
  hexed: boolean,
  upgradeIds: string[] = [],
  defenseTax = 0,
): Array<[string, number, number]> {
  const { A: a, B: b, C: c } = classify(dice, hexed)
  const has = (id: string) => upgradeIds.includes(id)
  const out: Array<[string, number, number]> = []

  // Une activation vaut un peu plus quand Nevermore est déjà chez l'adversaire (Absorb
  // disponible : dégât garanti + cadran).
  const act = NEVERMORE_ACTIVATION_VALUE + (nevermoreOnOpponent ? 0.2 : 0)
  const tax = (defendable: boolean) => (defendable ? defenseTax : 0)

  // Peck (AAA/AAAA/AAAAA) — Peck II : +1 dmg et le N-of-a-kind passe de 4 à 3
  const peckUp = has('peck-ii')
  const dmgs = peckUp ? PECK_DMG_UPGRADED : PECK_DMG
  const kindNeeded = peckUp ? 3 : 4
  const kindBonus = maxOfAKind(dice) >= kindNeeded ? act : 0
  if (a >= 5) out.push([`Peck 5T (AAAAA)`, dmgs[2] + kindBonus - tax(true), dmgs[2]])
  else if (a >= 4) out.push([`Peck 4T (AAAA)`, dmgs[1] + kindBonus - tax(true), dmgs[1]])
  else if (a >= 3) out.push([`Peck 3T (AAA)`, dmgs[0] + kindBonus - tax(true), dmgs[0]])

  // Raven Sight (AACC) : 3 indéfendables + activation(s)
  if (a >= 2 && c >= 2) {
    const acts = has('raven-sight-ii') ? 2 : 1
    out.push(['Raven Sight (AACC)', RAVEN_SIGHT_DMG + acts * act, RAVEN_SIGHT_DMG])
  }

  // Craven (petite suite)
  if (hasStraight(dice, 4)) {
    const up = has('craven-ii')
    const dmg = up ? CRAVEN_DMG_UPGRADED : CRAVEN_DMG
    const f = up ? 2 : 1
    out.push(['Craven (4-straight)', dmg + featherGainValue(feathers, f) - tax(true), dmg])
  }

  // Beguile (grande suite)
  if (hasStraight(dice, 5)) {
    const up = has('beguile-ii')
    const f = up ? 3 : 2
    const acts = up ? 2 : 1
    out.push(['Beguile (5-straight)', BEGUILE_DMG + featherGainValue(feathers, f) + acts * act - tax(true), BEGUILE_DMG])
  }

  // Fowl Friend (BBBB — II : BBB) : pioche + Feathers + activations, 0 dégât
  const ffUp = has('fowl-friend-ii')
  const ffNeed = ffUp ? 3 : 4
  if (b >= ffNeed) {
    const fGain = ffUp ? Math.max(0, FEATHER_CAP - feathers) : 4
    const acts = ffUp ? 3 : 2
    const name = ffUp ? 'Fowl Friend II (BBB)' : 'Fowl Friend (BBBB)'
    out.push([name, CARD_DRAW_VALUE + featherGainValue(feathers, fGain) + acts * act, 0])
  }

  // Murder of Crows (AABBB) : 5/6 + jet bonus 4/5 dés
  if (a >= 2 && b >= 3) {
    const up = has('murder-of-crows-ii')
    const dmg = up ? MURDER_DMG_UPGRADED : MURDER_DMG
    const n = up ? 5 : 4
    const eTalon = n / 2            // +1 dégât par Talon (p = 1/2)
    const eFeather = n / 3          // +1 Feather par Wing (p = 1/3)
    const pEye = 1 - Math.pow(5 / 6, n) // « On Raven Eye, Activate » (une fois)
    const val = dmg + eTalon + featherGainValue(feathers, Math.round(eFeather)) + pEye * act - tax(true)
    out.push(['Murder of Crows (AABBB)', val, dmg])
  }

  // Chamber (CCCC) : 7 indéfendables + activations — alt Aviary (CCC) avec Chamber II
  if (c >= 4) {
    const acts = has('chamber-ii') ? 3 : 2
    out.push(['Chamber (CCCC)', CHAMBER_DMG + acts * act, CHAMBER_DMG])
  } else if (c >= 3 && has('chamber-ii')) {
    out.push(['Aviary (CCC)', AVIARY_DMG + featherGainValue(feathers, 4), AVIARY_DMG])
  }

  // Pluck (BBBCC, exige Beguile II) : Hex puis 9
  if (b >= 3 && c >= 2 && has('beguile-ii')) {
    out.push(['Pluck (BBBCC)', PLUCK_DMG + HEX_VALUE - tax(true), PLUCK_DMG])
  }

  // Birds of a Feather (BBBBB, exige Fowl Friend II) : cap +1 puis Fowl Friend II complet
  if (b >= 5 && has('fowl-friend-ii')) {
    const ffVal = CARD_DRAW_VALUE + featherGainValue(feathers, FEATHER_CAP + 1 - feathers, FEATHER_CAP + 1) + 3 * act
    out.push(['Birds of a Feather (BBBBB)', 0.3 + ffVal, 0])
  }

  // Fantastic Terrors (CCCCC) — ULTIMATE
  if (c >= 5) {
    out.push(['Fantastic Terrors (CCCCC)', FANTASTIC_TERRORS_DMG + 3 * act + HEX_VALUE, FANTASTIC_TERRORS_DMG])
  }

  // Whiff : aucune consolation sur le board Raveness
  out.push(['Whiff', 0, 0])
  return out
}

export function bestAbilityValue(dice: number[], feathers: number, nvOnOpp: boolean, hexed: boolean, upgradeIds: string[] = [], defenseTax = 0): number {
  return Math.max(...getCandidates(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax).map(([, v]) => v))
}

export function bestAbilityName(dice: number[], feathers: number, nvOnOpp: boolean, hexed: boolean, upgradeIds: string[] = [], defenseTax = 0): string {
  const cands = getCandidates(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax)
  let best = cands[0]
  for (const cand of cands) if (cand[1] > best[1]) best = cand
  return best[0]
}

export function buildAbilityBoard(dice: number[], feathers: number, nvOnOpp: boolean, hexed: boolean, upgradeIds: string[] = [], defenseTax = 0): AbilityEntry[] {
  const matched = new Map(getCandidates(dice, feathers, nvOnOpp, hexed, upgradeIds, defenseTax).map(([n, v, d]) => [n, [v, d] as const]))
  const all = [
    'Peck 3T (AAA)', 'Peck 4T (AAAA)', 'Peck 5T (AAAAA)', 'Raven Sight (AACC)',
    'Craven (4-straight)', 'Beguile (5-straight)',
    upgradeIds.includes('fowl-friend-ii') ? 'Fowl Friend II (BBB)' : 'Fowl Friend (BBBB)',
    'Murder of Crows (AABBB)', 'Chamber (CCCC)', 'Fantastic Terrors (CCCCC)',
  ]
  if (upgradeIds.includes('chamber-ii')) all.push('Aviary (CCC)')
  if (upgradeIds.includes('beguile-ii')) all.push('Pluck (BBBCC)')
  if (upgradeIds.includes('fowl-friend-ii')) all.push('Birds of a Feather (BBBBB)')
  return all.map(name => {
    const hit = matched.get(name)
    return { name, matched: !!hit, value: hit ? hit[0] : 0, baseDamage: hit ? hit[1] : 0 }
  })
}
