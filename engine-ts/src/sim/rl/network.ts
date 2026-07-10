// A small hand-rolled MLP (no external ML dependency — see plan: this network is tiny enough
// that a library wouldn't help performance, and hand-rolling keeps training fully inspectable/
// testable like the rest of this codebase). Every layer uses tanh, including the output, so
// predictions land in [-1, 1] — matching the training targets (+1 win / -1 loss / 0 draw).
// Weight init uses the project's seedable RNG convention (rng.ts), never Math.random(), so a
// (seed, architecture) pair reproducibly gives the same starting weights.
import type { RNG } from '../rng.js'

export interface Layer {
  // W[i][j]: weight from input unit j to output unit i. b[i]: bias for output unit i.
  W: number[][]
  b: number[]
}

export interface Network {
  sizes: number[] // [inputSize, hidden1, hidden2, ..., outputSize] — outputSize is always 1
  layers: Layer[]
}

function tanh(x: number): number {
  return Math.tanh(x)
}

export function createNetwork(sizes: number[], rng: RNG): Network {
  const layers: Layer[] = []
  for (let l = 1; l < sizes.length; l++) {
    const fanIn = sizes[l - 1]
    const fanOut = sizes[l]
    // Small uniform init scaled by fan-in (Xavier-ish) — keeps initial activations from
    // saturating tanh, standard practice for a network this shape.
    const scale = 1 / Math.sqrt(fanIn)
    const W: number[][] = []
    for (let i = 0; i < fanOut; i++) {
      const row: number[] = []
      for (let j = 0; j < fanIn; j++) row.push((rng() * 2 - 1) * scale)
      W.push(row)
    }
    const b = new Array(fanOut).fill(0)
    layers.push({ W, b })
  }
  return { sizes, layers }
}

// One sample's forward pass, caching every layer's pre-activation-free output (tanh output —
// that's all backprop needs here since tanh'(z) = 1 - tanh(z)^2 = 1 - a^2) for backprop.
function forwardSampleCached(net: Network, input: number[]): number[][] {
  const activations: number[][] = [input]
  let a = input
  for (const layer of net.layers) {
    const next: number[] = []
    for (let i = 0; i < layer.W.length; i++) {
      let z = layer.b[i]
      const row = layer.W[i]
      for (let j = 0; j < row.length; j++) z += row[j] * a[j]
      next.push(tanh(z))
    }
    activations.push(next)
    a = next
  }
  return activations
}

// Batched forward pass — the API real callers use. Looping per-sample inside one function call
// (rather than one call per candidate) is what actually matters for candidate-scoring
// performance; the network is far too small for matrix-multiply vectorization to matter.
export function forward(net: Network, batch: number[][]): number[] {
  return batch.map(input => {
    const activations = forwardSampleCached(net, input)
    return activations[activations.length - 1][0]
  })
}

// Mini-batch gradient descent on MSE loss, averaged over the batch. Returns the batch's mean
// squared error (for logging training progress) before the update is applied.
export function trainStep(net: Network, batch: number[][], targets: number[], learningRate: number): number {
  const nLayers = net.layers.length
  const gradW: number[][][] = net.layers.map(l => l.W.map(row => row.map(() => 0)))
  const gradB: number[][] = net.layers.map(l => l.b.map(() => 0))
  let totalLoss = 0

  for (let s = 0; s < batch.length; s++) {
    const activations = forwardSampleCached(net, batch[s])
    const pred = activations[nLayers][0]
    const err = pred - targets[s]
    totalLoss += err * err

    // delta for the output layer: dLoss/dz = dLoss/da * tanh'(z), dLoss/da = 2*err (MSE, before
    // the 1/N batch averaging applied once at the end).
    let delta: number[] = [2 * err * (1 - pred * pred)]

    for (let l = nLayers - 1; l >= 0; l--) {
      const layer = net.layers[l]
      const prevActivation = activations[l]
      for (let i = 0; i < layer.W.length; i++) {
        gradB[l][i] += delta[i]
        const row = gradW[l][i]
        for (let j = 0; j < row.length; j++) row[j] += delta[i] * prevActivation[j]
      }
      if (l === 0) break
      // Propagate delta to the previous layer's activations, through this layer's weights,
      // then through the previous layer's own tanh derivative.
      const prevSize = prevActivation.length
      const nextDelta: number[] = new Array(prevSize).fill(0)
      for (let i = 0; i < layer.W.length; i++) {
        const row = layer.W[i]
        for (let j = 0; j < prevSize; j++) nextDelta[j] += delta[i] * row[j]
      }
      for (let j = 0; j < prevSize; j++) nextDelta[j] *= 1 - prevActivation[j] * prevActivation[j]
      delta = nextDelta
    }
  }

  const n = batch.length
  for (let l = 0; l < nLayers; l++) {
    const layer = net.layers[l]
    for (let i = 0; i < layer.W.length; i++) {
      layer.b[i] -= learningRate * (gradB[l][i] / n)
      const row = layer.W[i]
      const gRow = gradW[l][i]
      for (let j = 0; j < row.length; j++) row[j] -= learningRate * (gRow[j] / n)
    }
  }

  return totalLoss / n
}

export function toJSON(net: Network): string {
  return JSON.stringify(net)
}

export function fromJSON(json: string): Network {
  const parsed = JSON.parse(json) as Network
  return parsed
}

// Simple parameter averaging across N networks trained independently (in parallel) from the
// same starting checkpoint — the parallel training scheme's sync step (see trainParallel.ts).
// Assumes every network shares the same architecture (same `sizes`), which is always true here
// since every worker starts a round from the same canonical checkpoint.
export function averageNetworks(nets: Network[]): Network {
  if (nets.length === 0) throw new Error('averageNetworks: nets must be non-empty')
  const sizes = nets[0].sizes
  const layers: Layer[] = nets[0].layers.map((layer, l) => ({
    W: layer.W.map((row, i) => row.map((_, j) => nets.reduce((sum, n) => sum + n.layers[l].W[i][j], 0) / nets.length)),
    b: layer.b.map((_, i) => nets.reduce((sum, n) => sum + n.layers[l].b[i], 0) / nets.length),
  }))
  return { sizes, layers }
}

// ---- v2 : réseau 2 TÊTES (Phase 4 du PLAN_STRONG_AI) ---------------------------------------
// Tronc MLP partagé (tanh à chaque couche), tête VALEUR (tanh, scalaire [-1,1] — même sémantique
// que le v1) et tête POLITIQUE (logits BRUTS sur ACTION_SLOTS buckets ; le softmax se fait chez
// le consommateur, restreint aux coups légaux). Contrat JSON v2 avec rl-py/train.py — comme le
// v1, ne doit JAMAIS dériver (parité vérifiée par le mode parity2 de train.py + checkParity2).
export interface Network2 {
  v: 2
  featDim: number
  actionSlots: number
  trunk: Layer[]
  valueHead: Layer
  policyHead: Layer
}

export function fromJSON2(json: string): Network2 {
  const parsed = JSON.parse(json) as Network2
  if (parsed.v !== 2) throw new Error(`fromJSON2 : version ${(parsed as { v?: unknown }).v} != 2`)
  return parsed
}

function affine(layer: Layer, a: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i < layer.W.length; i++) {
    let z = layer.b[i]
    const row = layer.W[i]
    for (let j = 0; j < row.length; j++) z += row[j] * a[j]
    out.push(z)
  }
  return out
}

export function forward2(net: Network2, input: number[]): { value: number; logits: number[] } {
  if (input.length !== net.featDim) throw new Error(`forward2 : entrée ${input.length} != featDim ${net.featDim}`)
  let a = input
  for (const layer of net.trunk) a = affine(layer, a).map(tanh)
  const value = tanh(affine(net.valueHead, a)[0])
  const logits = affine(net.policyHead, a) // BRUTS — pas d'activation
  return { value, logits }
}
