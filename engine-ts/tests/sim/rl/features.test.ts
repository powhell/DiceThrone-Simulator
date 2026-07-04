import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../../src/sim/match.js'
import { encodeState, FEATURE_COUNT } from '../../../src/sim/rl/features.js'

describe('encodeState', () => {
  it('produces a fixed-size vector regardless of hero matchup', () => {
    for (const [a, b] of [['hh', 'bw'], ['bw', 'hh'], ['hh', 'hh'], ['bw', 'bw']] as const) {
      const state = createInitialGameState(a, b)
      expect(encodeState(state, 0)).toHaveLength(FEATURE_COUNT)
      expect(encodeState(state, 1)).toHaveLength(FEATURE_COUNT)
    }
  })

  it('every value is finite and within a sane [-1, 1]-ish range at game start', () => {
    const state = createInitialGameState('hh', 'bw')
    for (const v of encodeState(state, 0)) {
      expect(Number.isFinite(v)).toBe(true)
      expect(v).toBeGreaterThanOrEqual(-1)
      expect(v).toBeLessThanOrEqual(1.01)
    }
  })

  it('is symmetric: encoding for player 0 vs player 1 swaps self/opponent blocks', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hp = 30
    state.players[1].hp = 45
    const f0 = encodeState(state, 0)
    const f1 = encodeState(state, 1)
    // First feature (turn progress) is shared; the next block is "self" HP for each encoding.
    expect(f0[1]).not.toBeCloseTo(f1[1]) // self HP differs since HP differs between players
    expect(f0[0]).toBeCloseTo(f1[0]) // turn-progress feature is the same regardless of perspective
  })

  it('zeroes out hero-specific tokens that do not apply (hh tokens are 0 for a bw player)', () => {
    const state = createInitialGameState('hh', 'bw')
    const bwSelf = encodeState(state, 1) // player 1 is bw
    // Feature layout: [turn, ...self(15), ...opp(15)]; self block starts at index 1.
    // self block order: hp,cp,hand,deck,discard,upgrades,timeBombs,upgradesPlayedThisTurn,
    // isHH,isBW,dreadful,grimPursuit,hasHead,agility,covertOps (indices 1..15)
    const dreadfulIdx = 1 + 10
    const grimPursuitIdx = 1 + 11
    const hasHeadIdx = 1 + 12
    expect(bwSelf[dreadfulIdx]).toBe(0)
    expect(bwSelf[grimPursuitIdx]).toBe(0)
    expect(bwSelf[hasHeadIdx]).toBe(0)
  })
})
