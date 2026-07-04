import { describe, it, expect } from 'vitest'
import {
  enumerateHorrifyBonus, enumerateHeadlessMayhem, enumerateSabotageReroll,
  enumerateAffordableUpgradeSubsets, enumerateDiscardSubsets, enumerateSmallCardSubsets,
  enumerateRollManipulationChoices,
} from '../../../src/sim/rl/candidates.js'
import { createInitialPlayer } from '../../../src/sim/match.js'
import { heroTemplateFor } from '../../../src/sim/data/load.js'
import { mulberry32 } from '../../../src/sim/rng.js'

describe('enumerateHorrifyBonus / enumerateSabotageReroll', () => {
  it('always returns the fixed discrete option sets', () => {
    expect(enumerateHorrifyBonus()).toEqual(['dreadful', 'grimPursuit'])
    expect(enumerateSabotageReroll()).toEqual([true, false])
  })
})

describe('enumerateHeadlessMayhem', () => {
  it('includes terrorize only when canTerrorize is true', () => {
    const self = createInitialPlayer('hh')
    expect(enumerateHeadlessMayhem(self, false)).not.toContain('terrorize')
    expect(enumerateHeadlessMayhem(self, true)).toContain('terrorize')
  })

  it('includes giveHead only when self currently holds the Head', () => {
    const self = createInitialPlayer('hh')
    ;(self.tokens as any).head = 1
    expect(enumerateHeadlessMayhem(self, false)).toContain('giveHead')
    ;(self.tokens as any).head = 0
    expect(enumerateHeadlessMayhem(self, false)).not.toContain('giveHead')
  })

  it('always includes none', () => {
    const self = createInitialPlayer('hh')
    expect(enumerateHeadlessMayhem(self, false)).toContain('none')
  })
})

describe('enumerateAffordableUpgradeSubsets', () => {
  it('only returns subsets whose total cost fits the CP budget', () => {
    const rng = mulberry32(1)
    const self = createInitialPlayer('bw', rng)
    const hero = heroTemplateFor('bw')
    self.cp = 2
    const subsets = enumerateAffordableUpgradeSubsets(self, hero)
    for (const subset of subsets) {
      const totalCost = subset.reduce((sum, id) => sum + (hero.cards.find(c => c.id === id)?.cpCost ?? 0), 0)
      expect(totalCost).toBeLessThanOrEqual(2)
    }
    expect(subsets).toContainEqual([]) // "play nothing" is always a valid subset
  })

  it('only includes upgrade-kind cards, never action cards', () => {
    const rng = mulberry32(2)
    const self = createInitialPlayer('bw', rng)
    const hero = heroTemplateFor('bw')
    self.cp = 15
    const subsets = enumerateAffordableUpgradeSubsets(self, hero)
    for (const subset of subsets) {
      for (const id of subset) {
        const card = hero.cards.find(c => c.id === id)
        expect(card?.kind).toBe('upgrade')
      }
    }
  })
})

describe('enumerateDiscardSubsets', () => {
  it('returns only [[]] when hand is within the max size', () => {
    expect(enumerateDiscardSubsets(['a', 'b', 'c'], 6)).toEqual([[]])
  })

  it('enumerates every combination of exactly the required overflow', () => {
    const hand = ['a', 'b', 'c', 'd']
    const maxHandSize = 2 // overflow = 2
    const subsets = enumerateDiscardSubsets(hand, maxHandSize)
    expect(subsets.length).toBe(6) // C(4,2)
    for (const subset of subsets) expect(subset.length).toBe(2)
  })
})

describe('enumerateSmallCardSubsets', () => {
  it('returns the full powerset, including the empty set', () => {
    const subsets = enumerateSmallCardSubsets(['a', 'b', 'c'])
    expect(subsets.length).toBe(8) // 2^3
    expect(subsets).toContainEqual([])
    expect(subsets).toContainEqual(['a', 'b', 'c'])
  })
})

describe('enumerateRollManipulationChoices', () => {
  const dice = [1, 2, 3, 4, 5]

  it('always includes "play nothing" (empty array)', () => {
    const options = enumerateRollManipulationChoices(dice, [])
    expect(options).toContainEqual([])
  })

  it('six-it: one candidate per die, value always fixed at 6', () => {
    const options = enumerateRollManipulationChoices(dice, ['six-it']).filter(o => o.length > 0)
    expect(options.length).toBe(dice.length)
    for (const [choice] of options) expect(choice.values).toEqual([6])
  })

  it('so-wild: pruned to {6} ∪ current values, never a die\'s own current value', () => {
    // Pruned from the full 1-6 search now that these candidates are actually SCORED by the
    // policy (see candidates.ts): "max it out" or "match an existing die" only.
    const options = enumerateRollManipulationChoices(dice, ['so-wild']).filter(o => o.length > 0)
    const allowed = new Set([6, ...dice])
    for (const [choice] of options) {
      const [i] = choice.dieIndices!
      const [v] = choice.values!
      expect(allowed.has(v)).toBe(true)
      expect(dice[i]).not.toBe(v) // setting a die to its own value would waste the card
    }
    // dice [1,2,3,4,5]: each die can take the 4 other values + 6 = 5 → 25 candidates
    expect(options.length).toBe(25)
  })

  it('samesies: sets a die to another die\'s current value, never itself', () => {
    const options = enumerateRollManipulationChoices(dice, ['samesies']).filter(o => o.length > 0)
    for (const [choice] of options) {
      const [i] = choice.dieIndices!
      const [v] = choice.values!
      expect(dice[i]).not.toBe(v) // wouldn't be a real copy if it matched its own current value... unless dice happen to share a value; use distinct dice above to avoid ambiguity
    }
    // 5 dice x 4 other dice = 20 candidates
    expect(options.length).toBe(20)
  })

  it('twice-as-wild: restricts values to {6, current die values}, not the full 6x6 per pair', () => {
    const options = enumerateRollManipulationChoices(dice, ['twice-as-wild']).filter(o => o.length > 0)
    const candidateValues = new Set([6, ...dice])
    for (const [choice] of options) {
      for (const v of choice.values!) expect(candidateValues.has(v)).toBe(true)
    }
  })

  it('try-try-again: index choices only, no values', () => {
    const options = enumerateRollManipulationChoices(dice, ['try-try-again']).filter(o => o.length > 0)
    for (const [choice] of options) expect(choice.values).toBeUndefined()
  })

  it('one-more-time: a single no-argument candidate', () => {
    const options = enumerateRollManipulationChoices(dice, ['one-more-time']).filter(o => o.length > 0)
    expect(options).toEqual([[{ cardId: 'one-more-time' }]])
  })

  it('never returns more than one card played at once (v1 simplification)', () => {
    const options = enumerateRollManipulationChoices(dice, ['six-it', 'so-wild', 'samesies'])
    for (const option of options) expect(option.length).toBeLessThanOrEqual(1)
  })
})
