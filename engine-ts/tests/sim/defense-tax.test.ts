// Prime "indéfendable" (user-caught) : les attaques DÉFENDABLES paient la défense adverse
// (defenseTax = prévention attendue + contre-dégâts attendus), les indéfendables non.
import { describe, it, expect } from 'vitest'
import { hhConfig } from '../../src/characters/horseman/config.js'
import { defenseTaxFor } from '../../src/sim/turn.js'
import { createInitialPlayer } from '../../src/sim/match.js'
import { mulberry32 } from '../../src/sim/rng.js'

describe('defenseTax', () => {
  it('taxe les défendables, épargne les indéfendables (Reap remonte face à Ride Down)', () => {
    const dice = [4, 4, 4, 6, 6] // Reap (BBBC, indéf) matché ; comparons ses valeurs
    const noTax = hhConfig.buildAbilityBoard(dice, { dreadful: 0, hasHead: false, upgradeIds: [] })
    const taxed = hhConfig.buildAbilityBoard(dice, { dreadful: 0, hasHead: false, upgradeIds: [], defenseTax: 2.0 })
    const get = (b: typeof noTax, n: string) => b.find(e => e.name.startsWith(n))!.value
    // Reap est indéfendable : valeur INCHANGÉE
    expect(get(taxed, 'Reap')).toBeCloseTo(get(noTax, 'Reap'), 5)
    // Ride Down est défendable : valeur - 2
    expect(get(taxed, 'Ride Down')).toBeCloseTo(get(noTax, 'Ride Down') - 2.0, 5)
    // Horrify (indéf) inchangé aussi
    expect(get(taxed, 'Horrify')).toBeCloseTo(get(noTax, 'Horrify'), 5)
  })

  it('defenseTaxFor reflète l\'état réel de l\'adversaire', () => {
    const rng = mulberry32(1)
    const bw = createInitialPlayer('bw', rng)
    expect(defenseTaxFor(bw)).toBeCloseTo(2.0, 2)     // Sabotage 3 dés
    const hh = createInitialPlayer('hh', rng)
    hh.tokens.dreadful = 0
    expect(defenseTaxFor(hh)).toBeCloseTo(0.5, 2)      // 1 dé : 0.5 contre, 0 prévenu
    hh.tokens.dreadful = 4
    expect(defenseTaxFor(hh)).toBeCloseTo(2.5 + 0.58, 2) // 5 dés
    const fm = createInitialPlayer('fm', rng)
    expect(defenseTaxFor(fm)).toBeCloseTo(0, 2)        // aucune armure
    fm.armor = { helmet: 3, shield: 3 }
    expect(defenseTaxFor(fm)).toBeCloseTo(5 * 1.33, 2) // mur complet : attaquer défendable coûte ~6.65
  })
})
