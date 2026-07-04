// The pass-pass priority loop — the core of the interaction layer (Advanced Rules "Timing of
// Actions": players respond back and forth to a game state until all pass consecutively, then it
// locks). Deliberately decision-agnostic: callers supply `enumerate` (the legal WindowActions for
// a player at this point) and `apply` (mutate the state for a chosen action) closures, exactly
// like lookahead.ts's scoreCandidatesByReplay is agnostic to which decision it's scoring. This is
// what turn.ts's phase functions call wherever the rules open a response window.
//
// Pure w.r.t. game logic (knows nothing about cards/phases) — that lives in the closures — so it
// has no import cycle with turn.ts.
import type { GameState, WindowAction, WindowContext, DecisionRequest } from './types.js'
import type { RNG } from './rng.js'
import type { Policy } from './policy.js'

export type EnumerateFn = (state: GameState, playerIdx: 0 | 1, ctx: WindowContext) => WindowAction[]
export type ApplyFn = (state: GameState, playerIdx: 0 | 1, action: WindowAction, ctx: WindowContext, rng: RNG) => void

// Every non-pass action must consume a resource (a card leaves hand, CP is spent), so a window
// terminates on its own. This cap is a backstop against a bug where a policy repeatedly chooses an
// action the engine can't actually apply (hand/state never changes) — better to break than hang.
const MAX_WINDOW_ACTIONS = 100

// Participants are given in priority order: participants[0] has priority (the active player). Any
// action re-opens the window with priority back to participants[0] — the state changed, so
// everyone may respond again (this is what enforces "no going back / no playing chicken": you must
// declare everything before your opponent passes). The window closes only when every participant
// passes in an unbroken row (pass-pass). A single-participant window (e.g. Main Phase, active
// player only) degenerates to "act until you pass".
export function resolveResponseWindow(
  state: GameState,
  participants: (0 | 1)[],
  ctx: WindowContext,
  rng: RNG,
  policies: [Policy, Policy],
  enumerate: EnumerateFn,
  apply: ApplyFn,
): void {
  let passesInARow = 0
  let turn = 0
  let actionsTaken = 0
  while (passesInARow < participants.length) {
    const p = participants[turn % participants.length]
    const options = enumerate(state, p, ctx)
    // options always includes { kind: 'pass' }; when it's the ONLY option there's nothing to
    // decide, so skip the Policy call (also matches scoreCandidatesByReplay's single-candidate
    // short-circuit — no wasted network eval).
    const action: WindowAction = options.length === 1
      ? options[0]
      : policies[p].decide(state, p, { ctx, options } satisfies DecisionRequest)
    if (action.kind === 'pass') {
      passesInARow += 1
      turn += 1
    } else {
      apply(state, p, action, ctx, rng)
      passesInARow = 0
      turn = 0 // priority returns to the active player after any action
      if (++actionsTaken >= MAX_WINDOW_ACTIONS) break
    }
  }
}
