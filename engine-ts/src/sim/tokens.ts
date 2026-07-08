import type { Tokens, PlayerState, TransferableToken } from './types.js'

// The status-effect tokens the cross-player cards (Transference!/GTOH/What Status Effects?) act on.
// covertOps is excluded (verified token def: "may not be transferred or removed"); the Haunted Head
// has its own card (Rolling Pumpkin!). Time Bomb is here but is positional (PlayerState.timeBombs).
export const TRANSFERABLE_TOKENS: TransferableToken[] = ['dreadful', 'grimPursuit', 'agility', 'timeBomb']

// How many of a transferable token a player holds — timeBomb is positional (array length), the rest
// are bag counts.
export function countToken(p: PlayerState, kind: TransferableToken): number {
  return kind === 'timeBomb' ? p.timeBombs.length : p.tokens[kind]
}

// A fresh, empty token bag: every kind present and zero, so `tokens.dreadful += 1` needs no guard.
// Hero-specific starting tokens (HH's Haunted Head, BW's starting Covert Ops) are layered on top by
// the hero createInitial* helpers (hero/hh.rules.ts, hero/bw.rules.ts).
export function emptyBag(): Tokens {
  return { dreadful: 0, grimPursuit: 0, agility: 0, covertOps: 0, head: 0, feather: 0, hex: 0, nevermore: 0, shapeShift: 0, regen2: 0, regen1: 0, wound: 0, electrokinesis: 0, guardBreak: 0, combo: 0, webbed: 0, invisibility: 0, fireMastery: 0, burn: 0, knockdown: 0, stun: 0, disarm: 0 }
}

// The Haunted Head is a 0-or-1 token (HH's, but it can move onto an opponent). Read it by name so
// call sites don't poke `.head` directly and can stay hero-agnostic.
export function hasHead(p: PlayerState): boolean {
  return p.tokens.head > 0
}
