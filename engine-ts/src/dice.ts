export type Symbol = 'A' | 'B' | 'C'

export function faceToSymbol(face: number): Symbol {
  if (face <= 3) return 'A'
  if (face <= 5) return 'B'
  return 'C'
}

export function classifyDice(dice: number[]): { A: number; B: number; C: number } {
  const counts = { A: 0, B: 0, C: 0 }
  for (const face of dice) counts[faceToSymbol(face)]++
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
