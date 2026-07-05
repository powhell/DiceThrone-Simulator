// Forgemaster — règles moteur : Mine, Craft (chaînes), effets d'armure, Masterwork,
// et parties complètes fm vs hh / fm vs bw (greedy) sans crash ni timeout massif.
import { describe, it, expect } from 'vitest'
import { createInitialGameState, createInitialPlayer, runMatch } from '../../src/sim/match.js'
import { mine, craftOnce, armorEffects, masterworkOutcome, armorCount } from '../../src/sim/hero/fm.rules.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'

function fmPlayer() {
  const p = createInitialPlayer('fm', mulberry32(5))
  return p
}

describe('Mine (Forging Info Card)', () => {
  it('révèle le meilleur Ore du top 3 vers la Forge, le reste sous le deck', () => {
    const p = fmPlayer()
    p.deck = ['gold-ore', 'ultimanium-ore', 'six-it', 'samesies']
    p.forge = []
    const r = mine(p)
    expect(r.revealed).toEqual(['ultimanium-ore'])
    expect(p.forge).toEqual(['ultimanium-ore'])
    expect(p.deck).toEqual(['samesies', 'gold-ore', 'six-it']) // restants dessous
    expect(r.cpGained).toBe(0)
  })
  it('aucun Ore vu -> +1 CP, cartes sous le deck', () => {
    const p = fmPlayer()
    const cp = p.cp
    p.deck = ['six-it', 'samesies', 'tip-it', 'gold-ore']
    const r = mine(p)
    expect(r.revealed).toEqual([])
    expect(p.cp).toBe(cp + 1)
    expect(p.deck).toEqual(['gold-ore', 'six-it', 'samesies', 'tip-it'])
  })
  it('revealAll (A Good Haul) : tous les Ore minés vont sur la Forge', () => {
    const p = fmPlayer()
    p.deck = ['gold-ore', 'diamond-ore', 'six-it']
    const r = mine(p, true)
    expect(r.revealed.sort()).toEqual(['diamond-ore', 'gold-ore'])
    expect(p.forge.length).toBe(2)
  })
})

describe('Crafting (chaînes de blueprints)', () => {
  it('2 Gold Ore -> Gold Shield en priorité, puis Gold Helmet', () => {
    const p = fmPlayer()
    p.forge = ['gold-ore', 'gold-ore', 'gold-ore', 'gold-ore']
    const c1 = craftOnce(p)!
    expect(c1.armorId).toBe('gold_shield')
    const c2 = craftOnce(p)!
    expect(c2.armorId).toBe('gold_helmet')
    expect(craftOnce(p)).toBeNull() // plus d'Ore
    expect(p.armor).toEqual({ helmet: 1, shield: 1 })
    expect(armorCount(p)).toBe(2)
    // les Ore consommés sont retournés sous le deck, pas défaussés
    expect(p.deck.filter(id => id === 'gold-ore').length).toBeGreaterThanOrEqual(4)
  })
  it('Diamond exige la pièce Gold ; Ultimanium exige la Diamond', () => {
    const p = fmPlayer()
    p.forge = ['diamond-ore', 'diamond-ore', 'ultimanium-ore']
    expect(craftOnce(p)).toBeNull() // rien de craftable sans pièce Gold
    p.armor.shield = 1
    expect(craftOnce(p)!.armorId).toBe('diamond_shield')
    expect(craftOnce(p)!.armorId).toBe('ultimanium_shield')
    expect(p.armor.shield).toBe(3)
  })
})

describe('Effets d\'armure', () => {
  it('matrice normal/undefendable/ultimate', () => {
    const p = fmPlayer()
    p.armor = { helmet: 2, shield: 2 }
    expect(armorEffects(p, 'normal')).toEqual({ prevented: 2, counter: 2 })
    expect(armorEffects(p, 'undefendable')).toEqual({ prevented: 0, counter: 0 }) // shield<3
    p.armor.shield = 3
    expect(armorEffects(p, 'undefendable')).toEqual({ prevented: 2, counter: 0 }) // Ultimanium
    expect(armorEffects(p, 'ultimate')).toEqual({ prevented: 0, counter: 0 })
  })
  it('Masterwork double : Forge = bouclier d\'abord, Anvil = les deux', () => {
    const p = fmPlayer()
    p.armor = { helmet: 3, shield: 2 }
    expect(armorEffects(p, 'normal', masterworkOutcome(4, p).doubling)).toEqual({ prevented: 4, counter: 3 })
    expect(armorEffects(p, 'normal', masterworkOutcome(6, p).doubling)).toEqual({ prevented: 4, counter: 6 })
    expect(masterworkOutcome(2, p).mines).toBe(true)
  })
})

describe('Parties complètes (greedy)', () => {
  for (const opp of ['hh', 'bw'] as const) {
    it(`fm vs ${opp}: 30 parties se terminent proprement`, () => {
      let fmWins = 0, oppWins = 0, timeouts = 0
      for (let seed = 1; seed <= 30; seed++) {
        const r = runMatch('fm', opp, seed, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
        if (!r.finalState.gameOver) timeouts++
        else if (r.winner === 0) fmWins++
        else if (r.winner === 1) oppWins++
      }
      expect(timeouts).toBe(0)
      // les deux camps gagnent au moins une fois — le perso n'est ni cassé ni inerte
      expect(fmWins).toBeGreaterThan(0)
      expect(oppWins).toBeGreaterThan(0)
    })
  }
})
