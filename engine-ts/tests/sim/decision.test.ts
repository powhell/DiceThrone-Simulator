import { describe, it, expect } from 'vitest'
import { resolveResponseWindow } from '../../src/sim/decision.js'
import type { Policy } from '../../src/sim/policy.js'
import type { GameState, WindowAction, WindowContext } from '../../src/sim/types.js'
import { mulberry32 } from '../../src/sim/rng.js'

// The primitive only touches state via the caller-supplied closures, so a stub state is fine.
const STATE = {} as unknown as GameState
const CTX: WindowContext = { windowType: 'mainPhase', phase: 'main1' }
const RNG = mulberry32(1)

// resolveResponseWindow only ever calls policies[p].decide — a partial stub is enough.
function policy(decide: Policy['decide']): Policy {
  return { decide } as unknown as Policy
}
const ALWAYS_PASS = policy(() => ({ kind: 'pass' }))
const ALWAYS_ACT = policy((_s, _p, req) => req.options.find(o => o.kind === 'playCard') ?? { kind: 'pass' })

describe('resolveResponseWindow (pass-pass priority loop)', () => {
  it('single participant acts until no more actions are offered, then closes', () => {
    let budget = 3
    let applied = 0
    const enumerate = (): WindowAction[] =>
      budget > 0 ? [{ kind: 'pass' }, { kind: 'playCard', cardId: 'x' }] : [{ kind: 'pass' }]
    const apply = (): void => { budget -= 1; applied += 1 }
    resolveResponseWindow(STATE, [0], CTX, RNG, [ALWAYS_ACT, ALWAYS_ACT], enumerate, apply)
    expect(applied).toBe(3)
  })

  it('closes immediately when every participant passes in a row (pass-pass)', () => {
    let applied = 0
    const enumerate = (): WindowAction[] => [{ kind: 'pass' }, { kind: 'playCard', cardId: 'x' }]
    const apply = (): void => { applied += 1 }
    resolveResponseWindow(STATE, [0, 1], CTX, RNG, [ALWAYS_PASS, ALWAYS_PASS], enumerate, apply)
    expect(applied).toBe(0)
  })

  it('any action returns priority to the active player, and a single opponent action still terminates', () => {
    // p0 (priority) always passes; p1 acts once (budget 1). Expected order: p0 pass -> p1 act ->
    // priority back to p0 -> p0 pass -> p1 (nothing to do) pass -> pass-pass -> close. 1 action.
    let budget = 1
    let applied = 0
    const enumerate = (): WindowAction[] =>
      budget > 0 ? [{ kind: 'pass' }, { kind: 'playCard', cardId: 'y' }] : [{ kind: 'pass' }]
    const apply = (): void => { budget -= 1; applied += 1 }
    resolveResponseWindow(STATE, [0, 1], CTX, RNG, [ALWAYS_PASS, ALWAYS_ACT], enumerate, apply)
    expect(applied).toBe(1)
  })

  it('skips the Policy when only pass is available (no wasted decision)', () => {
    let decideCalls = 0
    const spy = policy((_s, _p, _r) => { decideCalls += 1; return { kind: 'pass' } })
    const enumerate = (): WindowAction[] => [{ kind: 'pass' }]
    resolveResponseWindow(STATE, [0], CTX, RNG, [spy, spy], enumerate, () => {})
    expect(decideCalls).toBe(0)
  })
})
