import { describe, it, expect } from 'vitest'
import { cloneForLookahead, scoreCandidatesByReplay } from '../../../src/sim/rl/lookahead.js'
import { FEATURE_COUNT } from '../../../src/sim/rl/features.js'
import type { Network } from '../../../src/sim/rl/network.js'
import { createInitialGameState } from '../../../src/sim/match.js'

// Feature layout (features.ts): [turnNumber, ...self(15 fields, hp is field 0), ...opp(15)].
const SELF_HP_FEATURE_INDEX = 1

function netScoringFeature(index: number): Network {
  const row = new Array(FEATURE_COUNT).fill(0)
  row[index] = 1
  return { sizes: [FEATURE_COUNT, 1], layers: [{ W: [row], b: [0] }] }
}

describe('cloneForLookahead', () => {
  it('produces an independent deep copy and strips the log', () => {
    const state = createInitialGameState('hh', 'bw')
    state.log.push({ turn: 1, playerIdx: 0, phase: 'upkeep', message: 'test' })
    const clone = cloneForLookahead(state)

    expect(clone.log).toEqual([])
    expect(state.log.length).toBe(1) // original untouched

    clone.players[0].hp = 1
    expect(state.players[0].hp).not.toBe(1) // mutating the clone doesn't touch the original
  })
})

describe('scoreCandidatesByReplay', () => {
  it('returns the sole candidate immediately without touching the network for single-option decisions', () => {
    const state = createInitialGameState('hh', 'bw')
    const net = netScoringFeature(SELF_HP_FEATURE_INDEX)
    let applyCalls = 0
    const result = scoreCandidatesByReplay(net, 0, state, 1, ['only'], (clone) => { applyCalls += 1 })
    expect(result).toBe('only')
    expect(applyCalls).toBe(0)
  })

  it('picks the candidate whose resulting clone scores highest under the network', () => {
    const state = createInitialGameState('hh', 'bw')
    const net = netScoringFeature(SELF_HP_FEATURE_INDEX)
    const best = scoreCandidatesByReplay(net, 0, state, 42, [10, 50, 30], (clone, hp: number) => {
      clone.players[0].hp = hp
    })
    expect(best).toBe(50)
  })

  it('scores from the given scoringPlayerIdx perspective, not always player 0', () => {
    const state = createInitialGameState('hh', 'bw')
    const net = netScoringFeature(SELF_HP_FEATURE_INDEX)
    // Candidate sets player 1's hp — only affects the score when scoring FOR player 1.
    const bestForP1 = scoreCandidatesByReplay(net, 1, state, 1, [10, 50], (clone, hp: number) => {
      clone.players[1].hp = hp
    })
    expect(bestForP1).toBe(50)
  })

  it('candidate mutations do not leak into the base state or across candidates', () => {
    const state = createInitialGameState('hh', 'bw')
    const hpBefore = state.players[0].hp
    const net = netScoringFeature(SELF_HP_FEATURE_INDEX)
    const seen: number[] = []
    scoreCandidatesByReplay(net, 0, state, 1, [10, 20, 30], (clone, hp: number) => {
      seen.push(clone.players[0].hp) // should always be the ORIGINAL hp before this candidate's own mutation
      clone.players[0].hp = hp
    })
    expect(seen).toEqual([hpBefore, hpBefore, hpBefore])
    expect(state.players[0].hp).toBe(hpBefore)
  })

  it('is deterministic: the same seed produces the same RNG draws for every candidate', () => {
    const state = createInitialGameState('hh', 'bw')
    const net = netScoringFeature(SELF_HP_FEATURE_INDEX)
    const draws: number[] = []
    scoreCandidatesByReplay(net, 0, state, 7, ['a', 'b', 'c'], (clone, _candidate, rng) => {
      draws.push(rng())
    })
    // Same seed reused per candidate (RNG-fairness rule) => identical first draw every time.
    expect(new Set(draws).size).toBe(1)
  })
})
