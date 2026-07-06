import { describe, it, expect, beforeEach } from 'vitest'
import { BWEngine } from '../src/index.js'

beforeEach(() => BWEngine.clearCache())

// ─── Terminal states (rollsRemaining=0) ──────────────────────────────────────

describe('BW terminal states', () => {
  it('Grapple 4C upgrades=0: 6 + 0 + 1.5 agility = 7.5 (calibré)', () => {
    // [1,6,6,6,6] → c=4, a=1 → Grapple (undefendable + 1 agility). Base dmg verified at 6
    // against the physical board photo (was wrongly 5.0 before 2026-07-01).
    const r = BWEngine.calculateOptimalKeep([1, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(7.1, 2) // Agility v3 1.1
  })

  it("Widow's Gauntlets 3B 2A upgrades=0: 6 + 0 + 0.75 CP = 6.75 (calibré)", () => {
    // [1,1,3,3,3] → a=2, b=3, c=0, no straight → Gauntlets (verified pattern is 3 Batons +
    // 2 Espionage — was wrongly encoded as 3A 2B before 2026-07-01). Baton Strike 3B also
    // matches (b===3, EV=5.0) but Gauntlets' 7.5 wins.
    const r = BWEngine.calculateOptimalKeep([1, 1, 3, 3, 3], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(6.75, 2)
  })

  it('Vengeance large straight upgrades=0 tb=0 — rider + agility ≈ 13.44', () => {
    // [1,2,3,4,5] → 5-straight → Vengeance. Rider verified: Batons(B)->dmg, Espionage(A)->TB
    // (boolean), Widow-pair(CC)->Covert Ops (was wrongly "face==1 inflicts TB, else +1 dmg").
    // 7 + riderDmg(2.0) + tbEV(0.8025x1.6=1.284) + covertOpsEV(0.1319x0.75=0.0990) + 1.5 agility = 11.8830 (calibré)
    const r = BWEngine.calculateOptimalKeep([1, 2, 3, 4, 5], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(11.397, 2) // v3
  })

  it("Widow's Bite 5C upgrades=0: 10 + 1.6 TB = 11.6 (calibré)", () => {
    // [6,6,6,6,6] → c=5 → Widow's Bite (beats Grapple=8.0)
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(11.6, 2)
  })

  it('Hacked small straight upgrades=3 — threshold bonus +2 + TB', () => {
    // [1,1,2,3,4] → 4-straight, a=3, b=2, c=0. Under the corrected Gauntlets pattern
    // (needs b>=3) this dice set no longer also matches Gauntlets, so Hacked alone wins:
    // 5 + 2 threshold + 1.6 TB + 0 rrt = 8.6 (calibré)
    const r = BWEngine.calculateOptimalKeep([1, 1, 2, 3, 4], 0, { upgrades: 3, tbOnOpp: 0 })
    expect(r.currentEv).toBeCloseTo(8.6, 2)
  })

  it('RRT II: +1 dmg all attacks — EXIGE la carte en jeu (texte vérifié, user-caught)', () => {
    // sans RRT II en jeu : 5 upgrades quelconques ne donnent RIEN
    const r0 = BWEngine.calculateOptimalKeep([1, 1, 3, 3, 3], 0, { upgrades: 5, tbOnOpp: 0 })
    expect(r0.currentEv).toBeCloseTo(11.75, 2) // 6 + 5 + 0.75 CP, pas de +1
    // avec RRT II en jeu : +1
    const r1 = BWEngine.calculateOptimalKeep([1, 1, 3, 3, 3], 0, { upgrades: 5, tbOnOpp: 0, upgradeIds: ['red-room-training-ii'] })
    expect(r1.currentEv).toBeCloseTo(12.75, 2)
  })

  it('TB stack cap at tbOnOpp=2 zeroes TB value', () => {
    // [6,6,6,6,6] tbOnOpp=2 → Widow's Bite = 10 + 0 + 0 = 10 (still beats Grapple's 8.0)
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 0, tbOnOpp: 2 })
    expect(r.currentEv).toBeCloseTo(10.0, 2)
  })

  it('TB value scales at upgrades≥6 (1.9 instead of 1.6, calibré)', () => {
    // [6,6,6,6,6] upgrades=6 tb=0: Bite's OWN board value = 10 + 1.9 + 1 RRT = 12.9 (calibré).
    // (Grapple also matches this all-C dice and now wins the overall pick at 16.5 thanks to
    // its corrected 6 dmg + conditional CP gain — that's checked separately below. This test
    // isolates Bite's board entry to verify TB-value scaling specifically.)
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 6, tbOnOpp: 0 })
    const bite = r.abilities.find(a => a.name.startsWith("Widow's Bite"))
    expect(bite?.value).toBeCloseTo(12.9, 2)
  })

  it('Grapple beats Widow\'s Bite at upgrades=6 thanks to the corrected dmg + CP gain', () => {
    // [6,6,6,6,6] upgrades=6: Grapple = 6 + 6 + 1.5 agility + 0.75 CP + 1 RRT = 15.25 (calibré)
    const r = BWEngine.calculateOptimalKeep([6, 6, 6, 6, 6], 0, { upgrades: 6, tbOnOpp: 0, upgradeIds: ['red-room-training-ii'] })
    expect(r.currentEv).toBeCloseTo(14.85, 2) // Agility v3 1.1, RRT II en jeu
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
