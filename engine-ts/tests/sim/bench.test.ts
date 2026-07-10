import { describe, it, expect } from 'vitest'
import { benchStrength, wilson } from '../../src/sim/bench.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'

// Pas de clearCache ici : le banc est un consommateur pur du moteur, partager le cache DP
// entre tests est réaliste (et évite ~50 s de warmup par test).

describe('benchStrength (Phase 0 — la métrique de force du plan strong AI)', () => {
  it('joue le nombre demandé de parties et renvoie winrate + intervalle de confiance', () => {
    const r = benchStrength(greedyHighestDamagePolicy, greedyHighestDamagePolicy, {
      gamesPerMatchup: 4,
      matchups: [['hh', 'bw']],
      seed: 42,
    })
    expect(r.games).toBe(4)
    expect(r.aWins + r.bWins + r.draws + r.timeouts).toBe(4)
    expect(r.winrate).toBeGreaterThanOrEqual(0)
    expect(r.winrate).toBeLessThanOrEqual(1)
    const [lo, hi] = r.ci
    expect(lo).toBeGreaterThanOrEqual(0)
    expect(hi).toBeLessThanOrEqual(1)
    expect(lo).toBeLessThanOrEqual(r.winrate)
    expect(hi).toBeGreaterThanOrEqual(r.winrate)
  })

  it('est reproductible : même graine, mêmes agents → résultat identique', () => {
    const opts = { gamesPerMatchup: 2, matchups: [['hh', 'bw']] as Array<['hh', 'bw']>, seed: 123 }
    const r1 = benchStrength(greedyHighestDamagePolicy, greedyHighestDamagePolicy, opts)
    const r2 = benchStrength(greedyHighestDamagePolicy, greedyHighestDamagePolicy, opts)
    expect(r2).toEqual(r1)
  })

  it('est symétrique : échanger A et B inverse exactement les comptes', () => {
    // Un agent volontairement affaibli (active toujours l'habileté au dégât MINIMUM) pour que
    // les deux camps aient des résultats différents — sinon la symétrie serait triviale.
    const weakest: Policy = {
      ...greedyHighestDamagePolicy,
      chooseAbility(_state, _playerIdx, candidates) {
        let worst = candidates[0]
        for (const c of candidates) {
          if ((c.baseDamage ?? Infinity) < (worst.baseDamage ?? Infinity)) worst = c
        }
        return worst.name
      },
    }
    const opts = { gamesPerMatchup: 2, matchups: [['hh', 'bw']] as Array<['hh', 'bw']>, seed: 77 }
    const ab = benchStrength(greedyHighestDamagePolicy, weakest, opts)
    const ba = benchStrength(weakest, greedyHighestDamagePolicy, opts)
    expect(ba.aWins).toBe(ab.bWins)
    expect(ba.bWins).toBe(ab.aWins)
    expect(ba.draws).toBe(ab.draws)
    expect(ba.timeouts).toBe(ab.timeouts)
  })
})

describe('wilson (intervalle de confiance à 95 %)', () => {
  // Valeurs attendues calculées indépendamment avec la formule de Wilson (exemples standard).
  it('8 victoires sur 10 → [0.4902, 0.9433]', () => {
    const [lo, hi] = wilson(8, 10)
    expect(lo).toBeCloseTo(0.4902, 3)
    expect(hi).toBeCloseTo(0.9433, 3)
  })

  it('90 victoires sur 100 → [0.8254, 0.9448] — exclut 50 %, le critère de gating Phase 2', () => {
    const [lo, hi] = wilson(90, 100)
    expect(lo).toBeCloseTo(0.8254, 3)
    expect(hi).toBeCloseTo(0.9448, 3)
    expect(lo).toBeGreaterThan(0.5)
  })

  it('aucune partie décisive → [0, 1] (aucune information)', () => {
    expect(wilson(0, 0)).toEqual([0, 1])
  })
})
