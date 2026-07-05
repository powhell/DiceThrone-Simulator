// Combo user-caught : à 0 Grim Pursuit mais avec Thundering Hooves! en main + CP,
// Unescapable! doit rester jouable dans la même fenêtre (TH convertit CP->GP AVANT).
import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../src/sim/match.js'
import { resolveAbilityPhase } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import type { Policy } from '../../src/sim/policy.js'

describe('Thundering Hooves! -> Unescapable! (même fenêtre)', () => {
  it('à 0 GP : TH convertit d\'abord, l\'attaque devient indéfendable', () => {
    const rng = mulberry32(3)
    const state = createInitialGameState('hh', 'bw', rng)
    const hh0 = state.players[0]
    hh0.cp = 5
    hh0.tokens.grimPursuit = 0
    hh0.hand = ['thundering-hooves', 'unescapable']
    const hpBefore = state.players[1].hp

    const combo: Policy = {
      ...greedyHighestDamagePolicy,
      chooseAbility: () => 'Ride Down (AAABB)',
      // ordre VOLONTAIREMENT mauvais : le moteur doit trier TH en premier
      chooseAttackModifierCards: (_s, _p, _d, eligible) =>
        ['unescapable', 'thundering-hooves'].filter(id => eligible.includes(id)),
      chooseGrimPursuitSpend: () => false,
    }
    // AAABB -> Ride Down (6 dmg, défendable de base)
    resolveAbilityPhase(state, 0, [1, 2, 3, 4, 5], rng, [combo, greedyHighestDamagePolicy])

    const logText = state.log.map(l => l.message).join('\n')
    // Unescapable a bien été offert (éligible à 0 GP grâce à TH) et a fonctionné.
    // Ride Down accorde d'abord +2 GP -> TH ne convertit QUE jusqu'au cap de 3 (1 CP, pas 3).
    expect(logText).toContain('Thundering Hooves!: spent 1 CP for +1 Grim Pursuit')
    expect(logText).toContain('Unescapable!: spent 1 Grim Pursuit, attack is now undefendable')
    // indéfendable : aucune défense Sabotage roulée, les 6+ dégâts passent entiers
    expect(logText).not.toContain('Sabotage')
    expect(state.players[1].hp).toBeLessThanOrEqual(hpBefore - 6)
    // comptes : 5 CP -> 1 converti -> 1 payé pour Unescapable = 3 ; GP : 2 +1 -1 = 2 (cap 3)
    expect(hh0.cp).toBe(3)
    expect(hh0.tokens.grimPursuit).toBe(2)
  })
})
