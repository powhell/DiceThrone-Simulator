// Marginal dmg-equivalent value of gaining the Nth Dreadful token.
// Index = current token count before gain. Terrorize fires at token 4.
const MARGINAL_VALUE = [3.0, 3.0, 3.0, 5.0, 0.5]

export function dreadfulValueOfGaining(current: number, gained: number): number {
  let total = 0.0
  for (let i = 0; i < gained; i++) {
    const idx = current + i
    if (idx >= MARGINAL_VALUE.length) break
    total += MARGINAL_VALUE[idx]
  }
  return total
}
