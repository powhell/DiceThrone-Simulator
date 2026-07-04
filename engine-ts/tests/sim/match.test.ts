import { describe, it, expect, beforeEach } from 'vitest'
import { runMatch, MAX_TURNS } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { clearCache } from '../../src/index.js'

beforeEach(() => clearCache())

describe('runMatch', () => {
  it('always ends with a winner, a mutual-kill draw, or a MAX_TURNS timeout, never crashes, across many seeds', () => {
    for (const [heroA, heroB] of [['hh', 'hh'], ['bw', 'bw'], ['hh', 'bw'], ['bw', 'hh']] as const) {
      for (let seed = 0; seed < 25; seed++) {
        const result = runMatch(heroA, heroB, seed, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
        expect(result.turns).toBeGreaterThan(0)
        expect(result.turns).toBeLessThanOrEqual(MAX_TURNS)
        if (result.turns < MAX_TURNS) {
          // Ending before the cap is either a decisive win (winner 0/1) or a mutual-kill draw
          // (winner null but gameOver set, both players at <=0 HP simultaneously — Golden Rule
          // #4). Before simultaneous damage + the gameOver flag, draws wrongly spun to MAX_TURNS.
          if (result.winner === null) {
            expect(result.finalState.gameOver).toBe(true)
            expect(result.finalState.players.every(p => p.hp <= 0)).toBe(true)
          } else {
            expect([0, 1]).toContain(result.winner)
          }
        }
        for (const p of result.finalState.players) {
          expect(p.cp).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })

  it('is deterministic for a given seed', () => {
    const r1 = runMatch('hh', 'bw', 123, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    const r2 = runMatch('hh', 'bw', 123, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(r1.winner).toBe(r2.winner)
    expect(r1.turns).toBe(r2.turns)
  })
})
