// Combat Points are hero-agnostic (verified: official rulebook, "Combat Points" screenshot,
// characters/rules/Combat Points.png) — capped at 15 regardless of source (Income Phase,
// Discard Phase sells, ability effects, Terrorize, etc.).
import type { PlayerState } from './types.js'
import { CP_CAP } from './data/config.js'

export function grantCp(self: PlayerState, amount: number): void {
  self.cp = Math.min(CP_CAP, self.cp + Math.max(0, amount))
}
