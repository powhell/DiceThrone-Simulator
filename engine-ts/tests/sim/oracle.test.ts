import { describe, it, expect } from 'vitest'
import { runOffensiveRoll } from '../../src/sim/oracle.js'
import { mulberry32 } from '../../src/sim/rng.js'
import { clearCache } from '../../src/index.js'

// These verify the beforeReroll contract itself (extraRollsGranted, dice override) in
// isolation from turn.ts's card-specific wiring (covered separately in turn.test.ts).

describe('runOffensiveRoll: beforeReroll contract', () => {
  it('with no extra rolls granted, beforeReroll fires exactly twice (initial + 2 rerolls)', () => {
    clearCache()
    const rng = mulberry32(1)
    let calls = 0
    runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, (step) => {
      calls += 1
      return { oracleState: { dreadful: 0, hasHead: false }, dice: step.dice }
    })
    expect(calls).toBe(2)
  })

  it('extraRollsGranted (One More Time!) adds one additional iteration to the loop', () => {
    clearCache()
    const rng = mulberry32(1)
    let calls = 0
    runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, (step) => {
      calls += 1
      // Grant the extra roll only on the very first call, so it adds exactly one iteration.
      return { oracleState: { dreadful: 0, hasHead: false }, dice: step.dice, extraRollsGranted: calls === 1 ? 1 : 0 }
    })
    expect(calls).toBe(3)
  })

  it('dice returned from beforeReroll are what the DP evaluates that iteration', () => {
    clearCache()
    const rng = mulberry32(1)
    let calls = 0
    // Forcing CCCCC (Dreadful Charge, HH's highest-value ability by a wide margin) every call
    // — the DP should recognize "keep all 5" as optimal immediately and stop rerolling.
    const finalDice = runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, (step) => {
      calls += 1
      return { oracleState: { dreadful: 0, hasHead: false }, dice: [6, 6, 6, 6, 6] }
    })
    expect(calls).toBe(1)
    expect(finalDice).toEqual([6, 6, 6, 6, 6])
  })
})
