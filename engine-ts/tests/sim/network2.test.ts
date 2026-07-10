import { describe, it, expect } from 'vitest'
// Le ROUGE de la Phase 4 tranche 2 : inference 2 têtes côté TS (contrat JSON v2 avec train.py).
import { fromJSON2, forward2 } from '../../src/sim/rl/network.js'
import { actionBucket, ACTION_SLOTS } from '../../src/sim/search/actionSpace.js'

describe('forward2 (réseau 2 têtes — tronc partagé, valeur tanh, logits politique)', () => {
  // Mini-réseau calculé À LA MAIN (littéraux indépendants, pas recalculés par le code testé) :
  // x=[1,-1] ; tronc W=[[0.5,0],[0,0.25]] b=[0,0] -> h=[tanh(0.5), tanh(-0.25)]=[0.4621, -0.2449]
  // valeur W=[[1,1]] b=[0.1] -> tanh(0.4621-0.2449+0.1)=tanh(0.3172)=0.3070
  // politique W=[[1,0],[0,1],[1,1]] b=[0,0,-0.1] -> logits BRUTS [0.4621, -0.2449, 0.1172]
  const json = JSON.stringify({
    v: 2, featDim: 2, actionSlots: 3,
    trunk: [{ W: [[0.5, 0], [0, 0.25]], b: [0, 0] }],
    valueHead: { W: [[1, 1]], b: [0.1] },
    policyHead: { W: [[1, 0], [0, 1], [1, 1]], b: [0, 0, -0.1] },
  })

  it('calcule la valeur (tanh) et les logits (bruts) attendus', () => {
    const net = fromJSON2(json)
    const { value, logits } = forward2(net, [1, -1])
    expect(value).toBeCloseTo(0.3070, 3)
    expect(logits).toHaveLength(3)
    expect(logits[0]).toBeCloseTo(0.4621, 3)
    expect(logits[1]).toBeCloseTo(-0.2449, 3)
    expect(logits[2]).toBeCloseTo(0.1172, 3)
  })

  it('rejette un vecteur d\'entrée de mauvaise taille', () => {
    const net = fromJSON2(json)
    expect(() => forward2(net, [1, 2, 3])).toThrow()
  })
})

describe('actionBucket (espace d\'actions haché pour la tête politique)', () => {
  it('est déterministe et dans [0, ACTION_SLOTS)', () => {
    const k = 'activateAbility:C-C-C-Combo (AACC)'
    const b = actionBucket(k)
    expect(actionBucket(k)).toBe(b)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThan(ACTION_SLOTS)
  })

  it('répartit des clés distinctes (pas tout dans le même bucket)', () => {
    const keys = Array.from({ length: 60 }, (_, i) => `window:{"cardId":"c${i}","kind":"playCard"}`)
    const buckets = new Set(keys.map(actionBucket))
    expect(buckets.size).toBeGreaterThan(40) // 60 clés dans 256 slots : collisions rares
  })
})
