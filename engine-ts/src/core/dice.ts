import type { CharacterConfig, Symbol } from './types.js'

export function faceToSymbol<S>(face: number, cfg: CharacterConfig<S>): Symbol {
  return cfg.faceToSymbol(face)
}

export function classifyDice<S>(dice: number[], cfg: CharacterConfig<S>): Record<Symbol, number> {
  const counts: Record<Symbol, number> = {}
  for (const face of dice) {
    const s = cfg.faceToSymbol(face)
    counts[s] = (counts[s] ?? 0) + 1
  }
  return counts
}

// Precompute all n-tuples of faces (1-6) for n = 0..5 at module load time.
// Total: 1 + 6 + 36 + 216 + 1296 + 7776 = 9331 arrays — negligible memory.
const OUTCOMES: ReadonlyArray<ReadonlyArray<number>>[] = []
for (let n = 0; n <= 5; n++) {
  if (n === 0) {
    OUTCOMES[n] = [[]]
    continue
  }
  const cur: number[][] = []
  for (const sub of OUTCOMES[n - 1]) {
    for (let face = 1; face <= 6; face++) {
      cur.push([face, ...sub])
    }
  }
  OUTCOMES[n] = cur
}

export function enumerateOutcomes(n: number): ReadonlyArray<ReadonlyArray<number>> {
  return OUTCOMES[n]
}
