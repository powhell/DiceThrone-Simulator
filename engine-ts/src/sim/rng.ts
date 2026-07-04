// Seedable PRNG threaded explicitly through sim/ calls instead of Math.random(),
// so a (seed, policy) pair is fully reproducible — required for RL training later.
export type RNG = () => number

export function mulberry32(seed: number): RNG {
  let a = seed >>> 0
  return function rng(): number {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A mulberry32 whose internal state is exposed as `.state`, so it can be snapshotted and restored.
// The interactive UI uses this to drive interactive defense: the human's defense decisions during
// the AI's attack are gathered by resolving the attack on a CLONE (with a restored rng), showing
// the human, then re-resolving deterministically with their choice injected — no async needed.
export interface StatefulRNG { (): number; state: number }
export function mulberry32Stateful(seed: number): StatefulRNG {
  const rng = function (): number {
    rng.state = (rng.state + 0x6d2b79f5) | 0
    let t = Math.imul(rng.state ^ (rng.state >>> 15), 1 | rng.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  } as StatefulRNG
  rng.state = seed >>> 0
  return rng
}

export function rollDie(rng: RNG): number {
  return Math.floor(rng() * 6) + 1
}

export function rollDice(n: number, rng: RNG): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(rollDie(rng))
  return out
}

// Fisher-Yates, using the injected RNG so deck shuffles stay reproducible for a given seed.
export function shuffle<T>(arr: T[], rng: RNG): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
