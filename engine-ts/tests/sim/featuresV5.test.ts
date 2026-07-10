import { describe, it, expect } from 'vitest'
import { mulberry32 } from '../../src/sim/rng.js'
import { createInitialGameState } from '../../src/sim/match.js'
import type { HeroId } from '../../src/sim/types.js'
// Le ROUGE de la Phase 4 : ce module n'existe pas encore.
import {
  encodeStateV5, FEATURE_COUNT_V5,
  HERO_SLOTS, UPGRADE_SLOTS, HAND_SLOTS, TOKEN_SLOTS,
  heroSlotsUsed, maxUpgradesUsed, maxDeckUsed, tokenSlotsUsed,
} from '../../src/sim/rl/featuresV5.js'

const HEROES: HeroId[] = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se']

describe('featuresV5 (Phase 4 — layout stable, ajouter un héros ne redimensionne plus)', () => {
  it('encode chaque duel des 10 héros en un vecteur de taille FIXE = FEATURE_COUNT_V5', () => {
    for (let i = 0; i < HEROES.length; i++) {
      const heroA = HEROES[i]
      const heroB = HEROES[(i + 1) % HEROES.length]
      const state = createInitialGameState(heroA, heroB, mulberry32(7))
      expect(encodeStateV5(state, 0)).toHaveLength(FEATURE_COUNT_V5)
      expect(encodeStateV5(state, 1)).toHaveLength(FEATURE_COUNT_V5)
    }
  })

  it('garde de la MARGE dans chaque bloc — la garantie « 11e héros sans redimensionner »', () => {
    // Un nouveau héros consomme : 1 slot d'identité, <= UPGRADE_SLOTS upgrades, <= HAND_SLOTS
    // cartes de deck, et ses jetons inédits prennent des slots libres du registre. Tant que ces
    // marges sont > 0, FEATURE_COUNT_V5 ne bouge pas.
    expect(heroSlotsUsed()).toBeLessThan(HERO_SLOTS)
    expect(maxUpgradesUsed()).toBeLessThan(UPGRADE_SLOTS)
    expect(maxDeckUsed()).toBeLessThanOrEqual(HAND_SLOTS)
    expect(tokenSlotsUsed()).toBeLessThan(TOKEN_SLOTS)
  })

  it('deux états différents produisent des vecteurs différents (le layout encode bien du signal)', () => {
    const a = createInitialGameState('sm', 'th', mulberry32(1))
    const b = createInitialGameState('sm', 'th', mulberry32(1))
    b.players[0].hp = 10
    b.players[0].tokens.combo = 1
    const va = encodeStateV5(a, 0)
    const vb = encodeStateV5(b, 0)
    expect(va).not.toEqual(vb)
  })

  it('perspective : encoder pour le joueur 0 ou 1 inverse les blocs self/opp', () => {
    const s = createInitialGameState('hh', 'bw', mulberry32(3))
    s.players[0].hp = 12
    s.players[1].hp = 44
    const v0 = encodeStateV5(s, 0)
    const v1 = encodeStateV5(s, 1)
    expect(v0).not.toEqual(v1)
    expect(v0).toHaveLength(v1.length)
  })
})
