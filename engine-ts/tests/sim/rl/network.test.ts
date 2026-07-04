import { describe, it, expect } from 'vitest'
import { createNetwork, forward, trainStep, toJSON, fromJSON, averageNetworks } from '../../../src/sim/rl/network.js'
import { mulberry32 } from '../../../src/sim/rng.js'

// With a batch of exactly one sample and learningRate=1, trainStep's weight update IS the raw
// analytic gradient (w_after = w_before - 1 * grad), so `before - after` recovers it exactly —
// letting us compare against a numerical finite-difference gradient without needing a separate
// gradient-exposing API. This is the standard "gradient checking" technique for verifying
// hand-rolled backprop.
function lossOf(net: ReturnType<typeof createNetwork>, input: number[], target: number): number {
  const pred = forward(net, [input])[0]
  return (pred - target) ** 2
}

describe('network: gradient check (hand-rolled backprop vs numerical finite differences)', () => {
  it('every weight and bias gradient matches its finite-difference approximation', () => {
    const rng = mulberry32(7)
    const before = createNetwork([4, 5, 3, 1], rng)
    const input = [0.3, -0.5, 0.8, 0.1]
    const target = 0.6

    const after = structuredClone(before)
    trainStep(after, [input], [target], 1) // lr=1 => analytic grad = before - after

    const h = 1e-4
    for (let l = 0; l < before.layers.length; l++) {
      for (let i = 0; i < before.layers[l].W.length; i++) {
        for (let j = 0; j < before.layers[l].W[i].length; j++) {
          const analyticGrad = before.layers[l].W[i][j] - after.layers[l].W[i][j]

          const plus = structuredClone(before)
          plus.layers[l].W[i][j] += h
          const minus = structuredClone(before)
          minus.layers[l].W[i][j] -= h
          const numericGrad = (lossOf(plus, input, target) - lossOf(minus, input, target)) / (2 * h)

          expect(analyticGrad).toBeCloseTo(numericGrad, 3)
        }
        // Bias gradient, same technique.
        const analyticBiasGrad = before.layers[l].b[i] - after.layers[l].b[i]
        const plusB = structuredClone(before)
        plusB.layers[l].b[i] += h
        const minusB = structuredClone(before)
        minusB.layers[l].b[i] -= h
        const numericBiasGrad = (lossOf(plusB, input, target) - lossOf(minusB, input, target)) / (2 * h)
        expect(analyticBiasGrad).toBeCloseTo(numericBiasGrad, 3)
      }
    }
  })

  it('gradient check also holds for a batch of several samples', () => {
    const rng = mulberry32(8)
    const before = createNetwork([3, 4, 1], rng)
    const batch = [[0.1, 0.2, 0.3], [-0.4, 0.5, -0.6], [0.9, -0.1, 0.2]]
    const targets = [0.5, -0.3, 0.1]

    const after = structuredClone(before)
    trainStep(after, batch, targets, 1)

    const batchLoss = (net: ReturnType<typeof createNetwork>) => {
      const preds = forward(net, batch)
      return preds.reduce((sum, p, i) => sum + (p - targets[i]) ** 2, 0) / batch.length
    }

    const h = 1e-4
    // Spot-check a handful of weights rather than every single one (already fully covered
    // above for the single-sample case) — this test's job is just to confirm batching itself
    // (the /n averaging) doesn't break the gradient direction.
    const l = 0, i = 0, j = 0
    const analyticGrad = before.layers[l].W[i][j] - after.layers[l].W[i][j]
    const plus = structuredClone(before)
    plus.layers[l].W[i][j] += h
    const minus = structuredClone(before)
    minus.layers[l].W[i][j] -= h
    const numericGrad = (batchLoss(plus) - batchLoss(minus)) / (2 * h)
    expect(analyticGrad).toBeCloseTo(numericGrad, 3)
  })
})

describe('network: training reduces loss', () => {
  it('repeated trainStep calls on a fixed example drive the loss toward zero', () => {
    const rng = mulberry32(9)
    const net = createNetwork([4, 6, 1], rng)
    const input = [0.2, -0.3, 0.5, 0.1]
    const target = 0.7

    const lossBefore = lossOf(net, input, target)
    for (let i = 0; i < 200; i++) trainStep(net, [input], [target], 0.1)
    const lossAfter = lossOf(net, input, target)

    expect(lossAfter).toBeLessThan(lossBefore)
    expect(lossAfter).toBeLessThan(0.01)
  })
})

describe('network: serialization', () => {
  it('round-trips through toJSON/fromJSON with identical predictions', () => {
    const rng = mulberry32(10)
    const net = createNetwork([4, 5, 1], rng)
    const input = [0.1, 0.2, 0.3, 0.4]
    const before = forward(net, [input])[0]

    const restored = fromJSON(toJSON(net))
    const after = forward(restored, [input])[0]

    expect(after).toBeCloseTo(before, 10)
  })
})

describe('averageNetworks', () => {
  it('averages each corresponding weight and bias element-wise', () => {
    const base = createNetwork([3, 2, 1], mulberry32(1))
    const a = structuredClone(base)
    const b = structuredClone(base)
    a.layers[0].W[0][0] = 1
    b.layers[0].W[0][0] = 3
    a.layers[0].b[0] = 2
    b.layers[0].b[0] = 4

    const avg = averageNetworks([a, b])
    expect(avg.layers[0].W[0][0]).toBeCloseTo(2) // (1+3)/2
    expect(avg.layers[0].b[0]).toBeCloseTo(3) // (2+4)/2
  })

  it('averaging a single network returns it unchanged', () => {
    const net = createNetwork([3, 2, 1], mulberry32(2))
    const avg = averageNetworks([net])
    const input = [0.1, 0.2, 0.3]
    expect(forward(avg, [input])[0]).toBeCloseTo(forward(net, [input])[0], 10)
  })

  it('does not mutate any of the input networks', () => {
    const a = createNetwork([3, 2, 1], mulberry32(3))
    const b = createNetwork([3, 2, 1], mulberry32(4))
    const aBefore = toJSON(a)
    const bBefore = toJSON(b)
    averageNetworks([a, b])
    expect(toJSON(a)).toBe(aBefore)
    expect(toJSON(b)).toBe(bBefore)
  })
})
