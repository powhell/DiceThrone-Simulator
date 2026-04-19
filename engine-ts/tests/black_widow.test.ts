import { describe, it, expect, beforeEach } from 'vitest'
import { BWEngine } from '../src/index.js'

beforeEach(() => BWEngine.clearCache())

// ─── Terminal states (rollsRemaining=0) ──────────────────────────────────────

describe('BW terminal states', () => {
  it('Grapple 4C upgrades=0: 5 + 0 + 2 agility = 7.0', () => {
    // [1,6,6,6,6] → c=4, a=1 → Grapple (undefendable + 1 agility)
    const r = BWEngine.calculateOptimalKeep([1, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(7.0, 2)
  })

  it("Widow's Gauntlets 3A 2B upgrades=0: 6 + 0 + 1.5 CP = 7.5", () => {
    // [1,1,2,3,3] → a=3, b=2, c=0, no straight → Gauntlets
    const r = BWEngine.calculateOptimalKeep([1, 1, 2, 3, 3], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(7.5, 2)
  })

  it('Vengeance large straight upgrades=0 tb=0 — rider + agility ≈ 14.15', () => {
    // [1,2,3,4,5] → 5-straight → Vengeance wins over Hacked + Baton
    // 7 + (4×5/6) + tbEV(≈1.819) + 2 agility = 14.152
    const r = BWEngine.calculateOptimalKeep([1, 2, 3, 4, 5], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(14.152, 2)
  })

  it("Widow's Bite 5C upgrades=0: 10 + 2.8 TB = 12.8", () => {
    // [6,6,6,6,6] → c=5 → Widow's Bite (beats Grapple=7)
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(12.8, 2)
  })

  it('Hacked small straight upgrades=3 — threshold bonus +2 + TB', () => {
    // [1,1,2,3,4] → 4-straight, a=3, b=2, c=0.
    // Hacked = 5 + 2 threshold + 2.8 TB + 0 rrt = 9.8 ← matched
    // Gauntlets = 6 + 3 upgrades + 1.5 CP = 10.5 ← wins
    const r = BWEngine.calculateOptimalKeep([1, 1, 2, 3, 4], 0, { upgrades: 3, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(10.5, 2)
  })

  it('Red Room Training II: +1 dmg all attacks at upgrades≥5', () => {
    // [1,1,2,3,3] upgrades=5: Gauntlets = 6 + 5 + 1.5 + 1 RRT = 13.5
    const r = BWEngine.calculateOptimalKeep([1, 1, 2, 3, 3], 0, { upgrades: 5, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(13.5, 2)
  })

  it('TB stack cap at tbOnOpp=2 zeroes TB value', () => {
    // [6,6,6,6,6] tbOnOpp=2 → Widow's Bite = 10 + 0 + 0 = 10
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 2 })
    expect(r.currentEv).toBeCloseTo(10.0, 2)
  })

  it('TB value scales at upgrades≥6 (3.36 instead of 2.8)', () => {
    // [6,6,6,6,6] upgrades=6 tb=0 → Bite = 10 + 3.36 + 1 RRT = 14.36
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 6, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(14.36, 2)
  })
})

// ─── Non-terminal smoke ──────────────────────────────────────────────────────

describe('BW non-terminal smoke', () => {
  it('rolls=2 from neutral dice — returns options sorted desc', () => {
    const r = BWEngine.calculateOptimalKeep([1, 2, 3, 4, 6], 2, { upgrades: 0, tbOnOpp: 0 })
    expect(r.topOptions.length).toBeGreaterThan(0)
    for (let i = 1; i < Math.min(5, r.topOptions.length); i++) {
      expect(r.topOptions[i - 1].ev).toBeGreaterThanOrEqual(r.topOptions[i].ev)
    }
    expect(r.abilities.length).toBe(10)
  })

  it('rolls=1 with Vengeance already matched — Keep All forced', () => {
    const r = BWEngine.calculateOptimalKeep([1, 2, 3, 4, 5], 1, { upgrades: 0, tbOnOpp: 0 })
    const keepAll = r.topOptions.find(o => o.kept.length === 5)
    expect(keepAll).toBeDefined()
    expect(keepAll!.isGuaranteed).toBe(true)
  })
})
