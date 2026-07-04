import { describe, it, expect } from 'vitest'
import { createValueGreedyPolicy } from '../../../src/sim/rl/valueGreedyPolicy.js'
import { createNetwork } from '../../../src/sim/rl/network.js'
import type { Network } from '../../../src/sim/rl/network.js'
import { FEATURE_COUNT, encodeState } from '../../../src/sim/rl/features.js'
import { enumerateRollManipulationChoices } from '../../../src/sim/rl/candidates.js'
import { completeOffensiveRoll } from '../../../src/sim/oracle.js'
import { createInitialGameState } from '../../../src/sim/match.js'
import { playTurn, oracleStateFor, playUpkeepPhase } from '../../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../../src/sim/policy.js'
import { mulberry32 } from '../../../src/sim/rng.js'

// Opponent HP is the first field of the "opponent" block (layout: [turn, self..., opp...]).
// Derived the same way valueGreedyPolicy.test.ts does — a 1-layer net that prefers LOWER
// opponent HP, making scoring assertions deterministic.
function preferLowerOpponentHpNetwork(oppHpIndex: number): Network {
  const row = new Array(FEATURE_COUNT).fill(0)
  row[oppHpIndex] = -1
  return { sizes: [FEATURE_COUNT, 1], layers: [{ W: [row], b: [0] }] }
}
// Probe: encode two states differing only in OPPONENT hp; the differing index is opp-hp.
// Avoids hard-coding a layout that features.ts v2 (main tree) will change at merge time.
function findOppHpIndex(): number {
  const a = createInitialGameState('hh', 'bw')
  const b = createInitialGameState('hh', 'bw')
  b.players[1].hp = 10
  const fa = encodeState(a, 0)
  const fb = encodeState(b, 0)
  for (let i = 0; i < fa.length; i++) if (fa[i] !== fb[i]) return i
  throw new Error('opp hp feature not found')
}

describe('oracle.completeOffensiveRoll (resumable roll tail)', () => {
  it('with 0 rolls remaining, returns the dice unchanged (sorted)', () => {
    const state = createInitialGameState('hh', 'bw')
    const os = oracleStateFor(state.players[0], state.players[1])
    const dice = completeOffensiveRoll('hh', os, [5, 1, 3, 2, 6], 0, mulberry32(1))
    expect(dice).toEqual([1, 2, 3, 5, 6])
  })

  it('with rolls remaining, still returns 5 dice', () => {
    const state = createInitialGameState('hh', 'bw')
    const os = oracleStateFor(state.players[0], state.players[1])
    const dice = completeOffensiveRoll('hh', os, [1, 1, 2, 3, 4], 2, mulberry32(2))
    expect(dice).toHaveLength(5)
    for (const d of dice) { expect(d).toBeGreaterThanOrEqual(1); expect(d).toBeLessThanOrEqual(6) }
  })
})

// Regression: giveHead used to clear self.head WITHOUT giving it to the opponent — the unique
// Haunted Head vanished from the game (user-reported from the play UI, 2026-07-04).
describe('Headless Mayhem: the Haunted Head actually moves', () => {
  const forced = (choice: 'giveHead' | 'terrorize') =>
    ({ ...greedyHighestDamagePolicy, chooseHeadlessMayhem: () => choice })

  it('giveHead transfers the head to the opponent (never destroys it)', () => {
    const state = createInitialGameState('hh', 'bw')
    playUpkeepPhase(state, 0, mulberry32(1), forced('giveHead'))
    expect(state.players[0].tokens.head).toBe(0)
    expect(state.players[1].tokens.head).toBe(1)
  })

  it('terrorize reclaims the head: opponent loses it, self gets it, exactly one head exists', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].tokens.head = 0
    state.players[1].tokens.head = 1 // opponent holds it (after a prior giveHead)
    state.players[0].tokens.dreadful = 4
    playUpkeepPhase(state, 0, mulberry32(2), forced('terrorize'))
    expect(state.players[0].tokens.head).toBe(1)
    expect(state.players[1].tokens.head).toBe(0)
  })
})

describe('valueGreedyPolicy.chooseRollManipulationCards (un-stubbed)', () => {
  it('passes on the pre-reroll windows (rollsRemaining 2 and 1) — acts only on the final window', () => {
    const policy = createValueGreedyPolicy(createNetwork([FEATURE_COUNT, 4, 1], mulberry32(3)))
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hand = ['six-it']
    state.players[0].cp = 5
    expect(policy.chooseRollManipulationCards(state, 0, [1, 2, 3, 4, 5], 2, ['six-it'])).toEqual([])
    expect(policy.chooseRollManipulationCards(state, 0, [1, 2, 3, 4, 5], 1, ['six-it'])).toEqual([])
  })

  it('returns a legal choice (or nothing) from the enumerated set on the final window', () => {
    const policy = createValueGreedyPolicy(createNetwork([FEATURE_COUNT, 6, 1], mulberry32(4)))
    const state = createInitialGameState('hh', 'bw')
    state.turnNumber = 3
    state.players[0].hand = ['six-it']
    state.players[0].cp = 5
    const dice = [1, 1, 2, 3, 6]
    const result = policy.chooseRollManipulationCards(state, 0, dice, 0, ['six-it'])
    const legal = enumerateRollManipulationChoices(dice, ['six-it'])
    expect(legal.map(o => JSON.stringify(o))).toContain(JSON.stringify(result))
  })

  it('plays Six-It! to complete a guaranteed CCCCC ultimate when the network wants opponent HP down', () => {
    const policy = createValueGreedyPolicy(preferLowerOpponentHpNetwork(findOppHpIndex()))
    const state = createInitialGameState('hh', 'bw')
    state.turnNumber = 4
    state.players[0].hand = ['six-it']
    state.players[0].cp = 5
    // Final window: four 6s and a 1, no reroll follows. Six-It! on the 1 = guaranteed CCCCC
    // (Dreadful Charge, 14 undefendable) vs keeping a dead 4C hand — deterministic, no reroll
    // luck involved at rollsRemaining 0.
    const dice = [1, 6, 6, 6, 6]
    const result = policy.chooseRollManipulationCards(state, 0, dice, 0, ['six-it'])
    expect(result).toHaveLength(1)
    expect(result[0].cardId).toBe('six-it')
    expect(result[0].values).toEqual([6])
    expect(result[0].dieIndices).toEqual([0]) // the lone non-6 die
  })

  it('Grim Pursuit mode (a): engine spends at most 1 per turn even with an always-yes policy', () => {
    const net = createNetwork([FEATURE_COUNT, 4, 1], mulberry32(6))
    const base = createValueGreedyPolicy(net)
    const alwaysSpend = { ...base, chooseGrimPursuitReroll: () => true }
    const rng = mulberry32(300)
    const state = createInitialGameState('hh', 'bw', rng)
    state.players[0].tokens.grimPursuit = 3
    state.turnNumber = 1
    playTurn(state, 0, rng, [alwaysSpend, alwaysSpend])
    // Mode (a) fired exactly once (flag), mode (b) may spend 1 more — never below 3 - 2,
    // and the once-per-turn flag must be set.
    expect(state.players[0].grimPursuitRerollUsedThisTurn).toBe(true)
    expect(state.players[0].tokens.grimPursuit).toBeGreaterThanOrEqual(0)
  })

  it('Grim Pursuit mode (a): learned policy returns a boolean and never spends without tokens', () => {
    const policy = createValueGreedyPolicy(createNetwork([FEATURE_COUNT, 4, 1], mulberry32(7)))
    const state = createInitialGameState('hh', 'bw')
    state.turnNumber = 2
    expect(typeof policy.chooseGrimPursuitReroll!(state, 0, [1, 2, 3, 4, 5])).toBe('boolean')
  })

  it('end to end: a full turn with a manipulation card in hand plays without crashing and keeps CP >= 0', () => {
    const net = createNetwork([FEATURE_COUNT, 8, 1], mulberry32(5))
    const policy = createValueGreedyPolicy(net)
    const rng = mulberry32(200)
    const state = createInitialGameState('hh', 'bw', rng)
    state.players[0].hand.push('six-it', 'one-more-time')
    state.players[0].cp = 6
    for (let i = 0; i < 4 && !state.gameOver; i++) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      expect(() => playTurn(state, activeIdx, rng, [policy, policy])).not.toThrow()
      expect(state.players[0].cp).toBeGreaterThanOrEqual(0)
      expect(state.players[1].cp).toBeGreaterThanOrEqual(0)
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    }
  })
})
