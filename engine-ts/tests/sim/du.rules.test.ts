import { describe, it, expect } from 'vitest'
import { createInitialPlayer, runMatch } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import * as du from '../../src/sim/hero/du.rules.js'
import { getCandidates } from '../../src/characters/duelist/abilities.js'

// Duelist — mécaniques vérifiées (characters/Duelist/SPEC.md, scans + rulings user 2026-07-07).

describe('du.rules: Footwork Track', () => {
  it('takeSteps borne la piste à -2..+2 (les Steps au-delà sont perdus — ruling)', () => {
    const p = createInitialPlayer('du')
    expect(du.takeSteps(p, 1)).toBe(1)
    expect(du.footworkPos(p)).toBe(1)
    expect(du.takeSteps(p, 3)).toBe(1) // +1 -> +2, le reste perdu
    expect(du.footworkPos(p)).toBe(2)
    expect(du.takeSteps(p, -10)).toBe(-4)
    expect(du.footworkPos(p)).toBe(-2)
  })

  it('bonus offensif +1/+3 aux positions +1/+2, rien ailleurs', () => {
    expect(du.offensiveBonusDmg(2)).toBe(3)
    expect(du.offensiveBonusDmg(1)).toBe(1)
    expect(du.offensiveBonusDmg(0)).toBe(0)
    expect(du.offensiveBonusDmg(-1)).toBe(0)
  })

  it('bonus défensif : -1 = pige 1 carte, -2 = prévient 3 (icônes leaflet + ruling user)', () => {
    expect(du.defensiveBonus(-2)).toEqual({ prevent: 3, draw: 0 })
    expect(du.defensiveBonus(-1)).toEqual({ prevent: 0, draw: 1 })
    expect(du.defensiveBonus(0)).toEqual({ prevent: 0, draw: 0 })
    expect(du.defensiveBonus(2)).toEqual({ prevent: 0, draw: 0 })
  })
})

describe('du.rules: Reposition (passif upkeep, obligatoire)', () => {
  it("GB gagné SEULEMENT sur un recul d'exactement 1 step (dos du leaflet, ruling user)", () => {
    const p1 = createInitialPlayer('du')
    const r1 = du.applyReposition(p1, 'backward', 1)
    expect(r1.moved).toBe(-1)
    expect(r1.gbGained).toBe(1)

    const p2 = createInitialPlayer('du')
    const r2 = du.applyReposition(p2, 'backward', 2)
    expect(r2.moved).toBe(-2)
    expect(r2.gbGained).toBe(0) // 2 steps back = PAS de GB

    const p3 = createInitialPlayer('du')
    const r3 = du.applyReposition(p3, 'forward', 2)
    expect(r3.gbGained).toBe(0)
  })

  it('à un bout de piste, la direction morte n\'est pas légale', () => {
    const p = createInitialPlayer('du')
    p.footwork = 2
    expect(du.repositionLegalDirections(p)).toEqual(['backward'])
    p.footwork = -2
    expect(du.repositionLegalDirections(p)).toEqual(['forward'])
    p.footwork = 0
    expect(du.repositionLegalDirections(p)).toEqual(['forward', 'backward'])
  })
})

describe('du.rules: Retreat (défense, 4 dés)', () => {
  it('1 dmg par 2 Blades (II : par Blade) ; 1 step backward forcé par Boot/Pierce', () => {
    // [1,2,4,6] : 2 Blades, 1 Boot, 1 Pierce
    expect(du.retreatEffects([1, 2, 4, 6], false)).toEqual({ counterDamage: 1, forcedBackSteps: 2 })
    expect(du.retreatEffects([1, 2, 4, 6], true)).toEqual({ counterDamage: 2, forcedBackSteps: 2 })
    // [1,2,3,3] : 4 Blades — plein contre, aucun recul
    expect(du.retreatEffects([1, 2, 3, 3], false)).toEqual({ counterDamage: 2, forcedBackSteps: 0 })
    // [4,5,6,6] : 0 Blade — 4 reculs forcés
    expect(du.retreatEffects([4, 5, 6, 6], false)).toEqual({ counterDamage: 0, forcedBackSteps: 4 })
  })
})

describe('du.rules: En Garde + Disarm', () => {
  it('enGardeRoll inflige Disarm sur au moins un Pierce (6)', () => {
    // rng déterministe : cherche une seed à 6 et une sans
    const withSix = du.enGardeRoll(mulberry32(3))
    expect(withSix.dice).toHaveLength(4)
    expect(withSix.disarm).toBe(withSix.dice.some(d => d === 6))
  })

  it('Disarm stack 1 : la 2e infliction échoue silencieusement', () => {
    const p = createInitialPlayer('hh')
    expect(du.inflictDisarm(p)).toBe(1)
    expect(du.inflictDisarm(p)).toBe(0)
    expect(p.tokens.disarm).toBe(1)
  })
})

describe('duelist solveur: getCandidates (patterns du board)', () => {
  const names = (dice: number[], fw = 0, gb = 0, dis = false, bonus = true, ups: string[] = []) =>
    getCandidates(dice, fw, gb, dis, bonus, ups).map(([n]) => n)

  it('matche les patterns vérifiés', () => {
    expect(names([1, 1, 1, 4, 6])).toContain('Blade Flurry 3A (AAA)')
    expect(names([1, 1, 4, 4, 6])).toContain('Balestra (AABB)')
    expect(names([1, 1, 6, 6, 4])).toContain('Feint Attack (AACC)')
    expect(names([6, 4, 4, 4, 1])).toContain('En Garde (CBBB)')
    expect(names([1, 2, 3, 4, 4])).toContain('Strike (4-straight)')
    expect(names([1, 2, 3, 4, 5])).toContain('Strike (5-straight)')
    expect(names([6, 6, 6, 6, 1])).toContain('Bladestorm (CCCC)')
    expect(names([6, 6, 6, 6, 6])).toContain('Master of the Blade! (CCCCC)')
  })

  it('les alts sont gatés par leur upgrade', () => {
    expect(names([4, 4, 4, 1, 2])).not.toContain('Fancy Feet (BBB)')
    expect(names([4, 4, 4, 1, 2], 0, 0, false, true, ['balestra-ii'])).toContain('Fancy Feet (BBB)')
    expect(names([6, 6, 6, 1, 2])).not.toContain('Bladewind (CCC)')
    expect(names([6, 6, 6, 1, 2], 0, 0, false, true, ['bladestorm-ii'])).toContain('Bladewind (CCC)')
  })

  it('le bonus offensif de la position finale est crédité (steps pris vers l\'avant)', () => {
    const val = (dice: number[], fw: number, bonus: boolean) =>
      getCandidates(dice, fw, 0, false, bonus).find(([n]) => n === 'Balestra (AABB)')![1]
    // depuis 0 avec 2 steps -> position +2 = +3 dmg vs bonus consommé
    expect(val([1, 1, 4, 4, 6], 0, true) - val([1, 1, 4, 4, 6], 0, false)).toBeCloseTo(3, 1)
  })

  it('Disarm déjà posé -> la valeur Disarm de Bladestorm tombe', () => {
    const v = (dis: boolean) => getCandidates([6, 6, 6, 6, 1], 0, 0, dis, true).find(([n]) => n.startsWith('Bladestorm'))![1]
    expect(v(false)).toBeGreaterThan(v(true))
  })
})

describe('duelist: parties complètes (smoke déterministe)', () => {
  it('du vs bw et du vs th se terminent sans exception', () => {
    for (const opp of ['bw', 'th'] as const) {
      for (let seed = 1; seed <= 3; seed++) {
        const r = runMatch('du', opp, seed, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
        expect(r.finalState.gameOver || r.turns >= 1).toBe(true)
      }
    }
  })

  it('les mécaniques du apparaissent dans les logs (Reposition, Retreat)', () => {
    const r = runMatch('du', 'bw', 1, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    const msgs = r.finalState.log.map(e => e.message).join('\n')
    expect(msgs).toMatch(/Reposition:/)
    expect(msgs).toMatch(/Retreat/)
  })
})
