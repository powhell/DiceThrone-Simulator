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
