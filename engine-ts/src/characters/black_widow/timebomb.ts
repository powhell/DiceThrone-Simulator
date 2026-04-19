// Marginal dmg-equivalent value of inflicting one Time Bomb on the opponent.
// Per BGG guide: ~70% chance of detonation × 4 dmg ≈ 2.8 at <6 upgrades;
// ≥6 upgrades → TB starts on 0:01 side → ~84% × 4 ≈ 3.36. Stack cap = 2.
const TB_VALUE_LOW = 2.8
const TB_VALUE_HIGH = 3.36
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
