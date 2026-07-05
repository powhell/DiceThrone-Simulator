// Marginal dmg-equivalent value of gaining the Nth Dreadful token.
// Index = current token count before gain.
// CALIBRÉ 2026-07-05 (calibration/resultats_v2_complets_20260705.txt, 57,6k parties,
// réseau self-play des 2 côtés) : mesuré [1.93, 0.91, 0.91, 1.06, -0.14] ±0.4 — l'ancien
// [3,3,3,5,0.5] (rétro-calibré sur le guide BGG) surévaluait ~3x et le "pic Terrorize" au
// 4e jeton n'existe pas dans les parties réelles. Le 5e arrondi à 0.
const MARGINAL_VALUE = [1.9, 0.9, 0.9, 1.1, 0.0]

export function dreadfulValueOfGaining(current: number, gained: number): number {
  let total = 0.0
  for (let i = 0; i < gained; i++) {
    const idx = current + i
    if (idx >= MARGINAL_VALUE.length) break
    total += MARGINAL_VALUE[idx]
  }
  return total
}
