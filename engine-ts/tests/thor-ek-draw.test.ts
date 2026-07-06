import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../src/sim/match.js'
import { playMainPhase } from '../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../src/sim/policy.js'
import { mulberry32 } from '../src/sim/rng.js'

// EK x4 -> pioche (leaflet vérifié : 1x/tour, Main Phase). L'audit greedy ne l'exerce
// jamais (main<=2 + 4 EK simultanés trop rare) — on force la situation ici.
describe('Thor — Electrokinesis x4 -> pioche', () => {
  it('dépense 4 EK, pioche 1, et refuse un 2e usage le même tour', () => {
    const rng = mulberry32(7)
    const state = createInitialGameState('th', 'bw', rng)
    const th = state.players[0]
    th.tokens.electrokinesis = 4
    th.hand = th.hand.slice(0, 2)
    th.ekDrawUsedThisTurn = false
    const deckBefore = th.deck.length

    playMainPhase(state, 0, 'main1', [greedyHighestDamagePolicy, greedyHighestDamagePolicy], rng)

    expect(th.tokens.electrokinesis).toBe(0)
    expect(th.deck.length).toBe(deckBefore - 1)
    expect(th.ekDrawUsedThisTurn).toBe(true)
    expect(state.log.some(e => /Electrokinesis x4 spent: drew 1/.test(e.message))).toBe(true)

    // 2e usage le même tour : bloqué par le flag
    th.tokens.electrokinesis = 4
    th.hand = th.hand.slice(0, 2)
    playMainPhase(state, 0, 'main2', [greedyHighestDamagePolicy, greedyHighestDamagePolicy], rng)
    expect(th.tokens.electrokinesis).toBe(4)
  })
})
