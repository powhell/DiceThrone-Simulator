import type { Tokens, PlayerState, TransferableToken } from './types.js'

// The status-effect tokens the cross-player cards (Transference!/GTOH/What Status Effects?) act on.
// User-caught (What Status Effects? injouable contre la régén du Druide) : l'ancienne liste
// datait de l'ère 2 persos. Désormais TOUS les jetons de statut, MOINS les exclusions des
// défs vérifiées (« Unique... Not transferable / may not be removed ») : covertOps,
// shapeShift, hex, combo, invisibility — et head (carte dédiée Rolling Pumpkin!).
// Time Bomb est positionnel (PlayerState.timeBombs).
export const TRANSFERABLE_TOKENS: TransferableToken[] = [
  'dreadful', 'grimPursuit', 'agility', 'timeBomb',
  'feather', 'nevermore', 'regen2', 'regen1', 'wound', 'electrokinesis', 'guardBreak',
  'webbed', 'fireMastery', 'burn', 'knockdown', 'stun',
  'disarm', 'chargedGem', 'sunMarked',
]

// stackCap de chaque jeton transférable (défs vérifiées des hero.json) — utilisé quand un
// jeton arrive chez un joueur par Transference! (le cap suit le JETON, pas le perso qui reçoit).
// regen1/regen2 partagent en plus un cap TOTAL de 2 (géré au point de réception).
export const TOKEN_CAPS: Record<Exclude<TransferableToken, 'timeBomb'>, number> = {
  dreadful: 5, grimPursuit: 3, agility: 2, feather: 5, nevermore: 1, regen2: 2, regen1: 2,
  wound: 2, electrokinesis: 4, guardBreak: 2, webbed: 1,
  fireMastery: 5, burn: 1, knockdown: 1, stun: 1, disarm: 1, chargedGem: 1, sunMarked: 1,
}

// How many of a transferable token a player holds — timeBomb is positional (array length), the rest
// are bag counts.
export function countToken(p: PlayerState, kind: TransferableToken): number {
  return kind === 'timeBomb' ? p.timeBombs.length : p.tokens[kind]
}

// A fresh, empty token bag: every kind present and zero, so `tokens.dreadful += 1` needs no guard.
// Hero-specific starting tokens (HH's Haunted Head, BW's starting Covert Ops) are layered on top by
// the hero createInitial* helpers (hero/hh.rules.ts, hero/bw.rules.ts).
export function emptyBag(): Tokens {
  return { dreadful: 0, grimPursuit: 0, agility: 0, covertOps: 0, head: 0, feather: 0, hex: 0, nevermore: 0, shapeShift: 0, regen2: 0, regen1: 0, wound: 0, electrokinesis: 0, guardBreak: 0, combo: 0, webbed: 0, invisibility: 0, fireMastery: 0, burn: 0, knockdown: 0, stun: 0, disarm: 0, chargedGem: 0, sunMarked: 0 }
}

// The Haunted Head is a 0-or-1 token (HH's, but it can move onto an opponent). Read it by name so
// call sites don't poke `.head` directly and can stay hero-agnostic.
export function hasHead(p: PlayerState): boolean {
  return p.tokens.head > 0
}
