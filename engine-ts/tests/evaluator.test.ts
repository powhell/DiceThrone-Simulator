import { describe, it, expect, beforeEach } from 'vitest'
import { evalState, calculateOptimalKeep, clearCache } from '../src/index.js'
import { dreadfulValueOfGaining } from '../src/characters/horseman/dreadful.js'
import {
  REAP_UNDEFENDABLE, REAP_DREADFUL_GIVEN, CARD_DRAW_VALUE, GRIM_PURSUIT_AVG_DMG,
  DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN, HORRIFY_BASE_UNDEFENDABLE,
  HORRIFY_DREADFUL_GIVEN, RIDE_DOWN_BASE, RIDE_DOWN_GRIM_PURSUIT,
  SOW_SMALL_DMG, SOW_SMALL_DREADFUL, SOW_LARGE_DMG, SOW_LARGE_DREADFUL,
} from '../src/characters/horseman/constants.js'

beforeEach(() => clearCache())

// gpGainValue (abilities.ts, cap solveur 3) — répliqué pour dériver les attendus.
const gpGain = (gp: number, gain: number) => Math.min(gain, Math.max(0, 3 - gp)) * GRIM_PURSUIT_AVG_DMG
const dv = dreadfulValueOfGaining

// ─── Terminal states (rollsRemaining=0) ──────────────────────────────────────
// EV = ability value exactly. Les attendus sont DÉRIVÉS des constantes (plus de chiffres
// magiques : chaque recalibration des jetons cassait la suite — v3->v4 2026-07-07).

describe('terminal states', () => {
  it('Reap at dreadful=0 (base + 2 Dreadful)', () => {
    // [4,4,4,6,1] → b=3, c=1, a=1 → Reap: base + M[0]+M[1]
    expect(evalState([1, 4, 4, 4, 6], 0, 0, false)).toBeCloseTo(REAP_UNDEFENDABLE + dv(0, REAP_DREADFUL_GIVEN))
  })

  it('Reap at dreadful=0 with Head (+card draw)', () => {
    // [4,4,4,6,6] → b=3, c=2, hasHead → Reap: base + 2 Dreadful + pioche
    expect(evalState([4, 4, 4, 6, 6], 0, 0, true)).toBeCloseTo(REAP_UNDEFENDABLE + dv(0, REAP_DREADFUL_GIVEN) + CARD_DRAW_VALUE)
  })

  it('Spectral Assault at dreadful=0 (8+0=8)', () => {
    // [1,1,3,6,6] → a=3, c=2 → SA: 8 + 0*1.5 = 8
    expect(evalState([1, 1, 3, 6, 6], 0, 0, false)).toBeCloseTo(8.0)
  })

  it('Spectral Assault at dreadful=4 (8+6=14)', () => {
    // [1,1,3,6,6] → SA: 8 + 4*1.5 = 14
    expect(evalState([1, 1, 3, 6, 6], 0, 4, false)).toBeCloseTo(14.0)
  })

  it('Dreadful Charge at dreadful=0 (base + 4 Dreadful)', () => {
    expect(evalState([6, 6, 6, 6, 6], 0, 0, false)).toBeCloseTo(DREADFUL_CHARGE_VALUE + dv(0, DREADFUL_CHARGE_DREADFUL_GIVEN))
  })

  it('Dreadful Charge at dreadful=4 — near token cap', () => {
    expect(evalState([6, 6, 6, 6, 6], 0, 4, false)).toBeCloseTo(DREADFUL_CHARGE_VALUE + dv(4, DREADFUL_CHARGE_DREADFUL_GIVEN))
  })

  it('Horrify at dreadful=0 (base + 3 Dreadful)', () => {
    // [1,6,6,6,6] → c=4, a=1
    expect(evalState([1, 6, 6, 6, 6], 0, 0, false)).toBeCloseTo(HORRIFY_BASE_UNDEFENDABLE + dv(0, HORRIFY_DREADFUL_GIVEN))
  })

  it('Horrify at dreadful=0 with Head (+1 Grim Pursuit)', () => {
    expect(evalState([1, 6, 6, 6, 6], 0, 0, true)).toBeCloseTo(HORRIFY_BASE_UNDEFENDABLE + dv(0, HORRIFY_DREADFUL_GIVEN) + gpGain(0, 1), 2)
  })

  it('Ride Down at dreadful=0 (base + 2 GP) — needs the verified AAABB, not AABBB', () => {
    // [1,1,2,4,4] → a=3, b=2 (true AAABB, no straight)
    expect(evalState([1, 1, 2, 4, 4], 0, 0, false)).toBeCloseTo(RIDE_DOWN_BASE + gpGain(0, RIDE_DOWN_GRIM_PURSUIT), 2)
    // AABBB does NOT activate Ride Down (old matcher wrongly accepted it — user-caught in
    // the play UI): only the Whiff consolation remains (+1 GP).
    expect(evalState([1, 2, 4, 4, 4], 0, 0, false)).toBeCloseTo(gpGain(0, 1), 2)
  })

  it('Sow Despair L at dreadful=0 (base + 2 Dreadful)', () => {
    expect(evalState([1, 2, 3, 4, 5], 0, 0, false)).toBeCloseTo(SOW_LARGE_DMG + dv(0, SOW_LARGE_DREADFUL))
  })

  it('Sow Despair S only — no 5-straight (base + 1 Dreadful)', () => {
    // [1,1,2,3,4] → unique {1,2,3,4} → 4-straight only
    expect(evalState([1, 1, 2, 3, 4], 0, 0, false)).toBeCloseTo(SOW_SMALL_DMG + dv(0, SOW_SMALL_DREADFUL))
  })

  it('Cleave 3A (no better ability)', () => {
    // [1,1,1,4,6] → a=3, b=1, c=1, no straight → Cleave3A: 4
    expect(evalState([1, 1, 1, 4, 6], 0, 0, false)).toBeCloseTo(4.0)
  })

  it('Cleave 4A (no better ability)', () => {
    // [1,1,1,1,6] → a=4, c=1 → Cleave4A: 5
    expect(evalState([1, 1, 1, 1, 6], 0, 0, false)).toBeCloseTo(5.0)
  })

  it('Reap at dreadful=3 — reduced gain (M[3]+M[4])', () => {
    expect(evalState([1, 4, 4, 4, 6], 0, 3, false)).toBeCloseTo(REAP_UNDEFENDABLE + dv(3, REAP_DREADFUL_GIVEN))
  })

  it('Grim Pursuit cap 3 (user-caught) : les gains au-delà du stock ne valent rien', () => {
    // Ride Down [1,1,2,4,4] : base + gpGainValue(gp, 2)
    expect(evalState([1, 1, 2, 4, 4], 0, 0, false, 0)).toBeCloseTo(RIDE_DOWN_BASE + gpGain(0, 2), 2)
    expect(evalState([1, 1, 2, 4, 4], 0, 0, false, 2)).toBeCloseTo(RIDE_DOWN_BASE + gpGain(2, 2), 2)
    expect(evalState([1, 1, 2, 4, 4], 0, 0, false, 3)).toBeCloseTo(RIDE_DOWN_BASE, 2) // cap plein : +0
  })

  it('throws on invalid state (5 dice required at rolls=0)', () => {
    expect(() => evalState([], 0, 0, false)).toThrow()
  })
})

// ─── Non-terminal states (oracle values from Python engine) ──────────────────

describe('non-terminal states (oracle)', () => {
  it('[4,4,4,6,6] rolls=2 dreadful=0 — best keep EV (ancre de régression)', () => {
    const result = calculateOptimalKeep([4, 4, 4, 6, 6], 2, 0, false)
    // 9.335 → 9.028 (fix matcher Ride Down) → 7.5425 (recalibration 2026-07-05) →
    // 6.7897 (v3 : GP 0.9, Dreadful [1.5,0.8,...]) → 6.9168 (v4 archivé 2026-07-07 :
    // GP 1.3, Dreadful [1.0,1.4,0.8,0.45,1.0], pioche 1.4).
    expect(result.topOptions[0].ev).toBeCloseTo(6.9168, 2)
  })

  it('[1,1,3,6,6] rolls=1 dreadful=2 — SA already matched, best EV = 11.0', () => {
    const result = calculateOptimalKeep([1, 1, 3, 6, 6], 1, 2, false)
    expect(result.topOptions[0].ev).toBeCloseTo(11.0, 2)
  })
})

// ─── calculateOptimalKeep shape ──────────────────────────────────────────────

describe('calculateOptimalKeep result structure', () => {
  it('returns at most 6 options; first 5 sorted by EV descending', () => {
    const r = calculateOptimalKeep([1, 2, 3, 4, 5], 2, 0, false)
    expect(r.topOptions.length).toBeLessThanOrEqual(6)
    const top5 = r.topOptions.slice(0, 5)
    for (let i = 1; i < top5.length; i++) {
      expect(top5[i - 1].ev).toBeGreaterThanOrEqual(top5[i].ev)
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

  it('partial keep shows upgrade distribution (Sow S + Sow L)', () => {
    const r = calculateOptimalKeep([2, 3, 4, 5, 6], 1, 0, false)
    const partial = r.topOptions.find(o => o.kept.join(',') === '3,4,5,6')
    if (partial) expect(partial.probDist['Sow Despair L'] ?? 0).toBeGreaterThan(0)
  })

  it('Keep All forced in topOptions when ability already matched', () => {
    const r = calculateOptimalKeep([1, 2, 3, 4, 5], 2, 0, false)
    const keepAll = r.topOptions.find(o => o.kept.length === 5)
    expect(keepAll).toBeDefined()
    expect(keepAll!.isGuaranteed).toBe(true)
    const vals = Object.values(keepAll!.probDist)
    expect(vals.length).toBe(1)
    expect(vals[0]).toBeCloseTo(100, 0)
  })
})
