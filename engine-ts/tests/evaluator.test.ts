import { describe, it, expect, beforeEach } from 'vitest'
import { evalState, calculateOptimalKeep, clearCache } from '../src/evaluator.js'

beforeEach(() => clearCache())

// ─── Terminal states (rollsRemaining=0) ──────────────────────────────────────
// EV = ability value exactly — verifiable from constants without running the solver.

describe('terminal states', () => {
  it('Reap at dreadful=0 (3+6=9)', () => {
    // [4,4,4,6,1] → b=3, c=1, a=1 → Reap: 3 + MARGINAL[0]+MARGINAL[1] = 3+6 = 9
    expect(evalState([1, 4, 4, 4, 6], 0, 0, false)).toBeCloseTo(9.0)
  })

  it('Reap at dreadful=0 with Head (+card draw = +2)', () => {
    // [4,4,4,6,6] → b=3, c=2, hasHead → Reap: 3+6+2 = 11
    expect(evalState([4, 4, 4, 6, 6], 0, 0, true)).toBeCloseTo(11.0)
  })

  it('Spectral Assault at dreadful=0 (8+0=8)', () => {
    // [1,1,3,6,6] → a=3, c=2 → SA: 8 + 0*1.5 = 8
    expect(evalState([1, 1, 3, 6, 6], 0, 0, false)).toBeCloseTo(8.0)
  })

  it('Spectral Assault at dreadful=4 (8+6=14)', () => {
    // [1,1,3,6,6] → SA: 8 + 4*1.5 = 14
    expect(evalState([1, 1, 3, 6, 6], 0, 4, false)).toBeCloseTo(14.0)
  })

  it('Dreadful Charge at dreadful=0 (15+14=29)', () => {
    // [6,6,6,6,6] → DC: 15 + (3+3+3+5) = 29
    expect(evalState([6, 6, 6, 6, 6], 0, 0, false)).toBeCloseTo(29.0)
  })

  it('Dreadful Charge at dreadful=4 — near token cap (15+0.5=15.5)', () => {
    // [6,6,6,6,6] → DC: 15 + MARGINAL[4] = 15+0.5 = 15.5
    expect(evalState([6, 6, 6, 6, 6], 0, 4, false)).toBeCloseTo(15.5)
  })

  it('Horrify at dreadful=0 (6+9=15)', () => {
    // [1,6,6,6,6] → c=4, a=1 → Horrify: 6 + (3+3+3) = 15
    expect(evalState([1, 6, 6, 6, 6], 0, 0, false)).toBeCloseTo(15.0)
  })

  it('Ride Down at dreadful=0 (6+2×1.66=9.32)', () => {
    // [1,2,4,4,4] → a=2, b=3, c=0 → RideDown: 6 + 2*1.66 = 9.32
    expect(evalState([1, 2, 4, 4, 4], 0, 0, false)).toBeCloseTo(9.32, 2)
  })

  it('Sow Despair L at dreadful=0 (9+6=15)', () => {
    // [1,2,3,4,5] → 5-straight → SowL: 9 + (3+3) = 15
    expect(evalState([1, 2, 3, 4, 5], 0, 0, false)).toBeCloseTo(15.0)
  })

  it('Sow Despair S only — no 5-straight (7+3=10)', () => {
    // [1,1,2,3,4] → unique {1,2,3,4} → 4-straight only → SowS: 7+3 = 10
    expect(evalState([1, 1, 2, 3, 4], 0, 0, false)).toBeCloseTo(10.0)
  })

  it('Cleave 3A (no better ability)', () => {
    // [1,1,1,4,6] → a=3, b=1, c=1, no straight → Cleave3A: 4
    expect(evalState([1, 1, 1, 4, 6], 0, 0, false)).toBeCloseTo(4.0)
  })

  it('Cleave 4A (no better ability)', () => {
    // [1,1,1,1,6] → a=4, c=1 → Cleave4A: 5
    expect(evalState([1, 1, 1, 1, 6], 0, 0, false)).toBeCloseTo(5.0)
  })

  it('Reap at dreadful=3 — reduced gain (3+5+0.5=8.5)', () => {
    // [1,4,4,4,6] → Reap: 3 + MARGINAL[3]+MARGINAL[4] = 3+5+0.5 = 8.5
    expect(evalState([1, 4, 4, 4, 6], 0, 3, false)).toBeCloseTo(8.5)
  })

  it('throws on invalid state (5 dice required at rolls=0)', () => {
    expect(() => evalState([], 0, 0, false)).toThrow()
  })
})

// ─── Non-terminal states (oracle values from Python engine) ──────────────────

describe('non-terminal states (oracle)', () => {
  it('[4,4,4,6,6] rolls=2 dreadful=0 — best keep EV ≈ 9.335', () => {
    const result = calculateOptimalKeep([4, 4, 4, 6, 6], 2, 0, false)
    expect(result.topOptions[0].ev).toBeCloseTo(9.335, 2)
  })

  it('[1,1,3,6,6] rolls=1 dreadful=2 — SA already matched, best EV = 11.0', () => {
    const result = calculateOptimalKeep([1, 1, 3, 6, 6], 1, 2, false)
    expect(result.topOptions[0].ev).toBeCloseTo(11.0, 2)
  })
})

// ─── calculateOptimalKeep shape ──────────────────────────────────────────────

describe('calculateOptimalKeep result structure', () => {
  it('returns at most 5 options sorted by EV descending', () => {
    const r = calculateOptimalKeep([1, 2, 3, 4, 5], 2, 0, false)
    expect(r.topOptions.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < r.topOptions.length; i++) {
      expect(r.topOptions[i - 1].ev).toBeGreaterThanOrEqual(r.topOptions[i].ev)
    }
  })

  it('probDist values sum to ~100%', () => {
    const r = calculateOptimalKeep([4, 4, 4, 6, 6], 1, 0, false)
    const sum = Object.values(r.topOptions[0].probDist).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(100, 0)
  })

  it('ability board always has 11 entries', () => {
    const r = calculateOptimalKeep([1, 2, 3, 4, 5], 2, 0, false)
    expect(r.abilities.length).toBe(11)
  })

  it('currentEv equals EV of current dice with no rerolls', () => {
    const dice = [4, 4, 4, 6, 6]
    const r = calculateOptimalKeep(dice, 2, 0, false)
    const direct = evalState([...dice].sort((a, b) => a - b), 0, 0, false)
    expect(r.currentEv).toBeCloseTo(direct, 5)
  })
})
