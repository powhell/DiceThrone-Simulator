import { describe, it, expect } from 'vitest'
import { createInitialPlayer, runMatch } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import * as mb from '../../src/sim/hero/mb.rules.js'
import { getCandidates } from '../../src/characters/mythicbrawler/abilities.js'

// Mythic Brawler — mécaniques vérifiées (characters/Mythic_Brawler/SPEC.md, scans + rulings
// user 2026-07-16).

describe('mb.rules: jetons Strength', () => {
  it('setup : aucun jeton de départ (ruling user)', () => {
    const p = createInitialPlayer('mb')
    expect(p.tokens.strengthOcean).toBe(0)
    expect(p.tokens.strengthMountain).toBe(0)
    expect(p.tokens.strengthSky).toBe(0)
    expect(p.tokens.concussion).toBe(0)
  })

  it('caps : Ocean 3, Mountain 2, Sky 2 ; gain au cap échoue silencieusement', () => {
    const p = createInitialPlayer('mb')
    for (let i = 0; i < 5; i++) mb.gainStrengthOf(p, 'strengthOcean')
    for (let i = 0; i < 5; i++) mb.gainStrengthOf(p, 'strengthMountain')
    for (let i = 0; i < 5; i++) mb.gainStrengthOf(p, 'strengthSky')
    expect(p.tokens.strengthOcean).toBe(3)
    expect(p.tokens.strengthMountain).toBe(2)
    expect(p.tokens.strengthSky).toBe(2)
    expect(mb.gainStrength(p)).toBeNull() // tout au cap
  })

  it('gain générique : heuristique Mountain -> Sky -> Ocean', () => {
    const p = createInitialPlayer('mb')
    expect(mb.gainStrength(p)).toBe('strengthMountain')
    expect(mb.gainStrength(p)).toBe('strengthMountain')
    expect(mb.gainStrength(p)).toBe('strengthSky')
    expect(mb.gainStrength(p)).toBe('strengthSky')
    expect(mb.gainStrength(p)).toBe('strengthOcean')
  })

  it('Concussion stack 1', () => {
    const p = createInitialPlayer('hh')
    expect(mb.inflictConcussion(p)).toBe(1)
    expect(mb.inflictConcussion(p)).toBe(0)
  })

  it('dépense Ocean à l’Upkeep : 1 -> +1 CP ; 2 -> +1 CP et Heal 2 (choix IA : 2 si blessé)', () => {
    const p = createInitialPlayer('mb')
    p.tokens.strengthOcean = 2
    p.hp = 50
    expect(mb.oceanUpkeepChoice(p)).toBe(1) // pas blessé : garde le 2e jeton
    p.hp = 40
    expect(mb.oceanUpkeepChoice(p)).toBe(2)
    const r = mb.spendOcean(p, 2)
    expect(r).toEqual({ cp: 1, heal: 2 })
    expect(p.tokens.strengthOcean).toBe(0)
  })
})

describe('mb.rules: Wrassle', () => {
  it('1 dmg x Fist, Heal 1 x Spirit, On Peak (une fois) gain 1 Strength', () => {
    expect(mb.wrassleEffects([1, 4])).toEqual({ counterDamage: 1, heal: 1, strengthOnPeak: false })
    expect(mb.wrassleEffects([6, 6, 6])).toEqual({ counterDamage: 0, heal: 0, strengthOnPeak: true })
    expect(mb.wrassleEffects([2, 3, 5])).toEqual({ counterDamage: 2, heal: 1, strengthOnPeak: false })
  })
})

describe('mb.rules: Spirit Strike II — « use a 6 in this straight »', () => {
  it('vrai seulement si la suite contient 3-4-5-6', () => {
    expect(mb.straightUsesSix([3, 4, 5, 6, 1])).toBe(true)
    expect(mb.straightUsesSix([2, 3, 4, 5, 6])).toBe(true)
    expect(mb.straightUsesSix([1, 2, 3, 4, 4])).toBe(false)
    expect(mb.straightUsesSix([2, 3, 4, 5, 5])).toBe(false)
  })
})

describe('mythicbrawler solveur: getCandidates', () => {
  const names = (dice: number[], ups: string[] = []) =>
    getCandidates(dice, 0, 0, 0, false, ups).map(([n]) => n)

  it('matche les patterns du board', () => {
    expect(names([1, 2, 3, 6, 4])).toContain('Strong Arm (AAAC)')
    expect(names([1, 2, 3, 4, 5])).toContain('Tidal Blow (AAABB)')
    expect(names([1, 1, 2, 3, 6])).toContain('Clobber 4A (AAAA)')
    expect(names([1, 1, 2, 2, 3])).toContain('Clobber 5A (AAAAA)')
    expect(names([4, 4, 5, 6, 1])).toContain('Healing Wind (BBBC)')
    expect(names([6, 6, 6, 6, 1])).toContain('Ancestral Strength (CCCC)')
    expect(names([1, 2, 3, 4, 4])).toContain('Spirit Strike (4-straight)')
    expect(names([2, 3, 4, 5, 6])).toContain('Tectonic Punch (5-straight)')
    expect(names([6, 6, 6, 6, 6])).toContain('Power of the Ancients! (CCCCC)')
  })

  it('alts gatées par les upgrades II', () => {
    expect(names([6, 6, 6, 1, 2])).not.toContain('Spirit Call (CCC)')
    expect(names([6, 6, 6, 1, 2], ['ancestral-strength-ii'])).toContain('Spirit Call (CCC)')
    expect(names([1, 4, 5, 6, 1])).not.toContain('Knock Out (ABBC)')
    expect(names([1, 4, 5, 6, 1], ['tectonic-punch-ii'])).toContain('Knock Out (ABBC)')
  })

  it('Mountain monte les dégâts des attaques (valeur et dmg direct)', () => {
    const clobber = (mtn: number) =>
      getCandidates([1, 1, 1, 1, 6], 0, mtn, 0, false).find(([n]) => n.startsWith('Clobber'))!
    expect(clobber(2)[1]).toBeGreaterThan(clobber(0)[1])
    expect(clobber(2)[2]).toBe(clobber(0)[2] + 2)
  })

  it('Concussion déjà posée -> le rider ne vaut plus rien', () => {
    const ult = (conc: boolean) =>
      getCandidates([6, 6, 6, 6, 6], 3, 2, 2, conc).find(([n]) => n.startsWith('Power'))![1]
    expect(ult(false)).toBeGreaterThan(ult(true))
  })
})

describe('mythic brawler: parties complètes (smoke déterministe)', () => {
  it('mb vs bw / mb vs hh se terminent sans exception, mécaniques dans les logs', () => {
    for (const opp of ['bw', 'hh'] as const) {
      const r = runMatch('mb', opp, 1, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
      expect(r.finalState.gameOver || r.turns >= 1).toBe(true)
    }
    let all = ''
    for (let seed = 1; seed <= 6; seed++) {
      const r = runMatch('mb', 'bw', seed, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
      all += r.finalState.log.map(e => e.message).join('\n') + '\n'
    }
    expect(all).toMatch(/Wrassle/) // la défense s'active
    expect(all).toMatch(/gained (Mountain|Sky|Ocean|Strength)/i) // des Strengths se gagnent
  })
})
