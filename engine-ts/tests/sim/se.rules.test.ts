import { describe, it, expect } from 'vitest'
import { createInitialPlayer, runMatch } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import * as se from '../../src/sim/hero/se.rules.js'
import { getCandidates } from '../../src/characters/sunelf/abilities.js'

// Sun Elf — mécaniques vérifiées (characters/Sun_Elf/SPEC.md, scans + rulings user 2026-07-08).

describe('se.rules: Sun Dial', () => {
  it('setup 0 DUSK ; +1 borné à 5 ; excès = heal 1/point', () => {
    const p = createInitialPlayer('se')
    expect(se.dialOf(p)).toBe(0)
    expect(se.isDawn(p)).toBe(false)
    p.sunDial = 4
    p.hp = 45
    const r = se.increaseDial(p, 3) // 4+3 -> 5, excès 2 = heal 2... mais flip à 5
    expect(se.dialOf(p)).toBe(5)
    expect(r.healed).toBe(2)
    expect(p.hp).toBe(47)
    expect(r.flipped).toBe('dawn') // « whenever this dial reads 5, immediately flip »
    expect(se.isDawn(p)).toBe(true)
  })

  it('DAWN à 0 -> flip DUSK (dépense -4)', () => {
    const p = createInitialPlayer('se')
    p.sunDial = 3
    p.sunDialDawn = true
    const r = se.reduceDial(p, se.DAWN_SPEND_COST)
    expect(r.reduced).toBe(3) // borné à 0
    expect(r.flipped).toBe('dusk')
    expect(se.isDawn(p)).toBe(false)
  })

  it('flip manuel (The Glorious Sun!) garde la valeur', () => {
    const p = createInitialPlayer('se')
    p.sunDial = 2
    se.flipDial(p)
    expect(se.isDawn(p)).toBe(true)
    expect(se.dialOf(p)).toBe(2)
  })
})

describe('se.rules: jetons', () => {
  it('Charged Gem stack 1 + dépense d6 (1-2 CP, 3-4 dmg, 5-6 les deux)', () => {
    const p = createInitialPlayer('se')
    expect(se.gainChargedGem(p)).toBe(1)
    expect(se.gainChargedGem(p)).toBe(0)
    const r = se.spendChargedGem(p, mulberry32(7))
    expect(p.tokens.chargedGem).toBe(0)
    if (r.face <= 2) { expect(r.cp).toBe(1); expect(r.damage).toBe(0) }
    else if (r.face <= 4) { expect(r.cp).toBe(0); expect(r.damage).toBe(2) }
    else { expect(r.cp).toBe(1); expect(r.damage).toBe(2) }
  })

  it('Sun Marked stack 1', () => {
    const p = createInitialPlayer('hh')
    expect(se.inflictSunMarked(p)).toBe(1)
    expect(se.inflictSunMarked(p)).toBe(0)
  })
})

describe('se.rules: Harness the Light', () => {
  it('I : heal 1/A ; On BB (une fois) +1 ; On C (une fois) +1', () => {
    // [1,4,5] : 1 Stave, 2 Charges, 0 Sun Power
    expect(se.harnessEffects([1, 4, 5], false)).toEqual({ heal: 1, dialGain: 1, gem: false })
    // [6,6,6] : « On C » une fois seulement
    expect(se.harnessEffects([6, 6, 6], false)).toEqual({ heal: 0, dialGain: 1, gem: false })
    // [4,6,2] : 1 Charge (pas BB), 1 C
    expect(se.harnessEffects([2, 4, 6], false)).toEqual({ heal: 1, dialGain: 1, gem: false })
  })

  it('II : On B une fois ; +1 PAR C ; A+B+C -> gem', () => {
    expect(se.harnessEffects([1, 4, 6], true)).toEqual({ heal: 1, dialGain: 2, gem: true })
    expect(se.harnessEffects([6, 6, 6], true)).toEqual({ heal: 0, dialGain: 3, gem: false })
  })
})

describe('sunelf solveur: getCandidates', () => {
  const names = (dice: number[], ups: string[] = []) =>
    getCandidates(dice, 0, false, false, false, ups).map(([n]) => n)

  it('matche les patterns du board', () => {
    expect(names([1, 1, 1, 4, 6])).toContain('Light Staff 3A (AAA)')
    expect(names([4, 4, 5, 5, 1])).toContain('Ray Absorption (BBBB)')
    expect(names([1, 2, 3, 6, 6])).toContain('Radiant Energy (AAACC)')
    expect(names([1, 4, 4, 5, 6])).toContain('Scorching Staff (ABBB)')
    expect(names([1, 2, 3, 4, 4])).toContain('Ray of Light (4-straight)')
    expect(names([1, 2, 3, 4, 5])).toContain('Sunbeam (5-straight)')
    expect(names([6, 6, 6, 6, 1])).toContain('Solar Burst (CCCC)')
    expect(names([6, 6, 6, 6, 6])).toContain('Solar Flare! (CCCCC)')
  })

  it('Radiant Energy II élargit AAACC -> AACC ; alts gatés', () => {
    expect(names([1, 2, 6, 6, 4])).not.toContain('Radiant Energy (AAACC)')
    expect(names([1, 2, 6, 6, 4], ['radiant-energy-ii'])).toContain('Radiant Energy (AAACC)')
    expect(names([1, 2, 3, 6, 4])).not.toContain('Praise the Sun (AAAC)')
    expect(names([1, 2, 3, 6, 4], ['radiant-energy-ii'])).toContain('Praise the Sun (AAAC)')
    expect(names([4, 6, 6, 6, 1], ['sunbeam-ii'])).toContain('Soaking Up the Sun (BCCC)')
    expect(names([6, 6, 6, 1, 2], ['solar-burst-ii'])).toContain('Bestow Your Light (CCC)')
  })

  it('le bonus DAWN (cadran >= 3) monte la valeur des attaques', () => {
    const v = (dawn: boolean, dial: number) =>
      getCandidates([1, 1, 1, 4, 6], dial, dawn, false, false).find(([n]) => n.startsWith('Light Staff'))![1]
    expect(v(true, 5)).toBeGreaterThan(v(false, 5))
    expect(v(true, 5)).toBeGreaterThan(v(true, 0))
  })
})

describe('sun elf: parties complètes (smoke déterministe)', () => {
  it('se vs bw / se vs du se terminent sans exception, mécaniques dans les logs', () => {
    for (const opp of ['bw', 'du'] as const) {
      const r = runMatch('se', opp, 1, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
      expect(r.finalState.gameOver || r.turns >= 1).toBe(true)
    }
    const r = runMatch('se', 'bw', 2, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    const msgs = r.finalState.log.map(e => e.message).join('\n')
    expect(msgs).toMatch(/Sun Dial \(DUSK\)/)
    expect(msgs).toMatch(/Harness the Light/)
  })
})
