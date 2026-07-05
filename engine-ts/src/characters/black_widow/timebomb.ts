// Marginal dmg-equivalent value of inflicting one Time Bomb on the opponent.
// Per BGG guide: ~70% chance of detonation × 4 dmg ≈ 2.8 at <6 upgrades;
// ≥6 upgrades → TB starts on 0:01 side → ~84% × 4 ≈ 3.36. Stack cap = 2.
// CALIBRÉ 2026-07-05 : TB mesurée 1.61±0.39 (vs 2.8 dérivée des probabilités brutes — la
// différence = désamorçages + timing + prévention en pratique). HIGH garde le ratio x1.2.
const TB_VALUE_LOW = 1.6
const TB_VALUE_HIGH = 1.9
const TB_STACK_CAP = 2

export function tbMarginalValue(upgrades: number, currentTB: number): number {
  if (currentTB >= TB_STACK_CAP) return 0
  return upgrades >= 6 ? TB_VALUE_HIGH : TB_VALUE_LOW
}

export function tbGainValue(upgrades: number, currentTB: number, gained: number): number {
  let total = 0
  for (let i = 0; i < gained; i++) {
    total += tbMarginalValue(upgrades, currentTB + i)
  }
  return total
}
