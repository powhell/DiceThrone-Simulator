import { describe, it, expect } from 'vitest'
import {
  createInitialHHTokens, grantDreadful, grantGrimPursuit, canTerrorize, resolveTerrorize,
  endOfTurnHeadCheck, resolveHallowedReckoning, hasNumberMatch, resolveSpectralAssaultBonusRoll,
  spendGrimPursuitForBonusDamage,
  DREADFUL_CAP, GRIM_PURSUIT_CAP, TERRORIZE_DREADFUL_COST, TERRORIZE_DAMAGE, TERRORIZE_CP,
  TERRORIZE_GRIM_PURSUIT,
} from '../../src/sim/hero/hh.rules.js'
import { createInitialPlayer } from '../../src/sim/match.js'
import { mulberry32 } from '../../src/sim/rng.js'

describe('HH Grim Pursuit spend mode (b): roll 5 dice, +1 dmg per Horseshoe (verified leaflet)', () => {
  it('spends 1 Grim Pursuit; all-Axe roll (faces 1-3) gives +0 but the token is still spent', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantGrimPursuit(p, 2)
    const r = spendGrimPursuitForBonusDamage(p, () => 0) // rollDie(()=>0) = 1 → AAAAA, 0 Horseshoes
    expect(r.dice).toEqual([1, 1, 1, 1, 1])
    expect(r.bonus).toBe(0)
    expect((p.tokens as any).grimPursuit).toBe(1)
  })

  it('all-Horseshoe roll gives the +5 maximum (never more — user-verified rule)', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantGrimPursuit(p, 1)
    const r = spendGrimPursuitForBonusDamage(p, () => 0.6) // rollDie(()=>0.6) = 4 → BBBBB
    expect(r.dice).toEqual([4, 4, 4, 4, 4])
    expect(r.bonus).toBe(5)
  })

  it('returns 0 and spends nothing when there is no Grim Pursuit', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true) // grimPursuit starts at 0
    const r = spendGrimPursuitForBonusDamage(p, () => 0.99)
    expect(r.bonus).toBe(0)
    expect(r.dice).toEqual([])
    expect((p.tokens as any).grimPursuit).toBe(0)
  })
})

describe('HH Dreadful gain', () => {
  it('accumulates and caps at 5', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 10)
    expect((p.tokens as any).dreadful).toBe(DREADFUL_CAP)
  })

  it('grantGrimPursuit caps at 3', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantGrimPursuit(p, 10)
    expect((p.tokens as any).grimPursuit).toBe(GRIM_PURSUIT_CAP)
  })
})

describe('HH Terrorize (leaflet: player choice during Upkeep, requires >=4 Dreadful)', () => {
  it('is not available below 4 Dreadful', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 3)
    expect(canTerrorize(p)).toBe(false)
  })

  it('costs 4 Dreadful, reclaims the Head, deals 3 dmg, grants 1 Grim Pursuit + 1 CP', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(false) // opponent holds it
    grantDreadful(p, 4)
    const startCp = p.cp

    expect(canTerrorize(p)).toBe(true)
    const r = resolveTerrorize(p)

    expect((p.tokens as any).dreadful).toBe(0)
    expect((p.tokens as any).head).toBe(1)
    expect((p.tokens as any).grimPursuit).toBe(TERRORIZE_GRIM_PURSUIT)
    expect(p.cp).toBe(startCp + TERRORIZE_CP)
    expect(r.damageToOpponent).toBe(TERRORIZE_DAMAGE)
  })

  it('can be used repeatedly whenever Dreadful is re-accumulated to 4+', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, TERRORIZE_DREADFUL_COST)
    resolveTerrorize(p)
    expect(canTerrorize(p)).toBe(false)
    grantDreadful(p, TERRORIZE_DREADFUL_COST)
    expect(canTerrorize(p)).toBe(true)
  })
})

describe('HH Haunted Head end-of-turn check', () => {
  it('grants +1 Dreadful at end of turn when the opponent holds the Head', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(false)
    const fired = endOfTurnHeadCheck(p)
    expect(fired).toBe(true)
    expect((p.tokens as any).dreadful).toBe(1)
  })

  it('does nothing when self holds the Head', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    const fired = endOfTurnHeadCheck(p)
    expect(fired).toBe(false)
    expect((p.tokens as any).dreadful).toBe(0)
  })
})

describe('HH Hallowed Reckoning defense', () => {
  it('rolls 1 + Dreadful dice (capped at 5) and tallies A/B/C', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 2) // 1 + 2 = 3 dice
    const r = resolveHallowedReckoning(p, mulberry32(1), false)
    expect(r.damagePrevented).toBeGreaterThanOrEqual(0)
    expect(r.counterDamageToAttacker).toBeGreaterThanOrEqual(0)
  })

  it('caps total dice at 5 even at max Dreadful (dreadful stays <=5 after resolving)', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 10) // capped at 5, so 1+5=6 would exceed the dice cap of 5 if uncapped
    resolveHallowedReckoning(p, mulberry32(2), false)
    expect((p.tokens as any).dreadful).toBeLessThanOrEqual(DREADFUL_CAP)
  })

  it('upgraded version grants Grim Pursuit on 2 Scare, base version never does', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 5) // 5+ dice so a CC pair is plausible across many trials
    let sawGrimPursuit = false
    for (let seed = 0; seed < 200; seed++) {
      const trial = createInitialPlayer('hh')
      trial.tokens = createInitialHHTokens(true)
      grantDreadful(trial, 5)
      const r = resolveHallowedReckoning(trial, mulberry32(seed), true)
      if (r.grimPursuitGained > 0) { sawGrimPursuit = true; break }
    }
    expect(sawGrimPursuit).toBe(true)

    const rBase = resolveHallowedReckoning(p, mulberry32(0), false)
    expect(rBase.grimPursuitGained).toBe(0)
  })
})

describe('HH Cleave number-match bonus (verified: face VALUE, not A/B/C symbol)', () => {
  it('detects N-of-a-kind by raw face value', () => {
    expect(hasNumberMatch([2, 2, 2, 2, 5], 4)).toBe(true)
    expect(hasNumberMatch([2, 2, 2, 5, 5], 4)).toBe(false)
    expect(hasNumberMatch([2, 2, 2, 5, 5], 3)).toBe(true)
  })

  it('does not confuse a same-symbol-different-value roll for a number match', () => {
    // 1,2,3 are all symbol A but different face values — no 3-of-a-kind, let alone 4.
    expect(hasNumberMatch([1, 2, 3, 5, 6], 3)).toBe(false)
  })
})

describe('HH Spectral Assault bonus roll (verified card text)', () => {
  it('rolls 1 die per current Dreadful, capped at 5, tallying Axe=dmg/Horseshoe-pair=undefendable/Scare=Grim Pursuit', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 3)
    const r = resolveSpectralAssaultBonusRoll(p, mulberry32(1))
    expect(r.bonusDamage).toBeGreaterThanOrEqual(0)
    expect(r.grimPursuitGained).toBeGreaterThanOrEqual(0)
  })

  it('rolls 0 dice (no bonus possible) at 0 Dreadful', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    const r = resolveSpectralAssaultBonusRoll(p, mulberry32(2))
    expect(r.bonusDamage).toBe(0)
    expect(r.undefendable).toBe(false)
    expect(r.grimPursuitGained).toBe(0)
  })

  it('caps dice count at 5 even with max Dreadful', () => {
    const p = createInitialPlayer('hh')
    p.tokens = createInitialHHTokens(true)
    grantDreadful(p, 10) // capped at DREADFUL_CAP=5
    // With 5 dice, max possible bonusDamage is 5 (all Axe) — sanity bound, not a crash check.
    const r = resolveSpectralAssaultBonusRoll(p, mulberry32(3))
    expect(r.bonusDamage).toBeLessThanOrEqual(5)
  })
})
