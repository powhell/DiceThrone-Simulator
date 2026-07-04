import { describe, it, expect } from 'vitest'
import { runOffensiveRoll } from '../../src/sim/oracle.js'
import { mulberry32 } from '../../src/sim/rng.js'
import { clearCache } from '../../src/index.js'

// These verify the beforeReroll contract itself (extraRollsGranted, dice override) in
// isolation from turn.ts's card-specific wiring (covered separately in turn.test.ts).
//
// Contract since the final-window change: beforeReroll fires once per Roll Attempt DECISION
// (rollsRemaining 2, then 1) plus one FINAL time at rollsRemaining 0 — the "final dice" window
// where resurrect-the-roll effects (One More Time!, Grim Pursuit mode (a)) may re-enter the
// loop by granting extra rolls.

describe('runOffensiveRoll: beforeReroll contract', () => {
  it('with no extra rolls granted, beforeReroll fires three times (rollsRemaining 2, 1, 0)', () => {
    clearCache()
    const rng = mulberry32(1)
    const seen: number[] = []
    runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, (step) => {
      seen.push(step.rollsRemaining)
      return { oracleState: { dreadful: 0, hasHead: false }, dice: step.dice }
    })
    expect(seen).toEqual([2, 1, 0])
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
    expect(calls).toBe(4) // rollsRemaining 2(+1), 2, 1, 0
  })

  it('an extra roll granted AT the final window resurrects the roll', () => {
    clearCache()
    const rng = mulberry32(1)
    const seen: number[] = []
    runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, (step) => {
      seen.push(step.rollsRemaining)
      const grantNow = step.rollsRemaining === 0 && seen.filter(r => r === 0).length === 1
      return { oracleState: { dreadful: 0, hasHead: false }, dice: step.dice, extraRollsGranted: grantNow ? 1 : 0 }
    })
    // 2, 1, then final window 0 grants one more attempt -> loop re-enters, ends at 0 again.
    expect(seen[0]).toBe(2)
    expect(seen[seen.length - 1]).toBe(0)
    expect(seen.filter(r => r === 0).length).toBe(2)
  })

  it('dice returned from beforeReroll are what the DP evaluates that iteration', () => {
    clearCache()
    const rng = mulberry32(1)
    let calls = 0
    // Forcing CCCCC (Dreadful Charge, HH's highest-value ability by a wide margin) every call
    // — the DP recognizes "keep all 5" immediately; only the final window follows.
    const finalDice = runOffensiveRoll('hh', { dreadful: 0, hasHead: false }, rng, () => {
      calls += 1
      return { oracleState: { dreadful: 0, hasHead: false }, dice: [6, 6, 6, 6, 6] }
    })
    expect(calls).toBe(2) // keep-all at rollsRemaining 2, then the final window at 0
    expect(finalDice).toEqual([6, 6, 6, 6, 6])
  })
})
