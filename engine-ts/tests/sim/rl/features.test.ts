import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../../src/sim/match.js'
import { encodeState, FEATURE_COUNT, UPGRADE_ONEHOT_SIZE, HAND_ONEHOT_SIZE } from '../../../src/sim/rl/features.js'

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

  // v3 layout (2026-07-07, bloc joueur 48 champs — voir features.ts PLAYER_BLOCK_SIZE) :
  // [turn, self(48 base + upgrade one-hot), selfHand(one-hot), opp(48 base + one-hot)].
  // Les offsets sont dérivés des constantes exportées (les 21/8/33 v2 codés en dur ont cassé
  // au passage v3).
  const SELF_BASE = 1
  const SELF_UPGRADES = SELF_BASE + 48
  const SELF_HAND = SELF_UPGRADES + UPGRADE_ONEHOT_SIZE

  it('v2: encodes WHICH upgrades are in play, not just how many', () => {
    const state = createInitialGameState('bw', 'hh')
    const f0 = encodeState(state, 0)
    expect(f0.slice(SELF_UPGRADES, SELF_UPGRADES + UPGRADE_ONEHOT_SIZE).every(v => v === 0)).toBe(true)
    // red-room-training-ii is bw's 3rd upgrade card in hero.json order (index 2)
    state.players[0].upgradesInPlay = ['red-room-training-ii']
    const f1 = encodeState(state, 0)
    expect(f1[SELF_UPGRADES + 2]).toBe(1)
    expect(f1.slice(SELF_UPGRADES, SELF_UPGRADES + UPGRADE_ONEHOT_SIZE).filter(v => v === 1)).toHaveLength(1)
  })

  it('v2: encodes the exact contents of SELF hand (one-hot over the full deck)', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hand = ['cleave-ii'] // hh's first card in hero.json → deck index 0
    const f = encodeState(state, 0)
    expect(f[SELF_HAND + 0]).toBe(1)
    expect(f.slice(SELF_HAND, SELF_HAND + HAND_ONEHOT_SIZE).filter(v => v === 1)).toHaveLength(1)
  })

  it('v2: tokens are un-gated — a bw player holding dreadful (via transfer) is visible', () => {
    const state = createInitialGameState('bw', 'hh')
    state.players[0].tokens.dreadful = 3
    const f = encodeState(state, 0)
    const dreadfulIdx = SELF_BASE + 21 // 8 scalaires + 8 identité + 5 forge/armures avant les jetons
    expect(f[dreadfulIdx]).toBeCloseTo(3 / 5)
  })
})
