// Turns a GameState into a fixed-size numeric feature vector, always from "self vs opponent"
// perspective (self = the player the value is being estimated FOR), so one network serves
// both seats and both hero matchups without needing per-hero/per-seat variants. Pure function,
// no dependency on network.ts/candidates.ts/lookahead.ts.
import type { GameState, PlayerState } from '../types.js'
import { STARTING_HP, HEAL_CAP_ABOVE_STARTING, CP_CAP, MAX_HAND_SIZE } from '../data/config.js'
import { DREADFUL_CAP, GRIM_PURSUIT_CAP } from '../hero/hh.rules.js'
import { AGILITY_CAP, COVERT_OPS_CAP, TIME_BOMB_STACK_CAP } from '../hero/bw.rules.js'
import { buildFullDeck } from '../match.js'
import { MAX_TURNS } from '../match.js'

const MAX_HP = STARTING_HP + HEAL_CAP_ABOVE_STARTING
// Rough normalizer for deck/discard pile sizes — exact full-deck size depends on hero, but
// both heroes' full decks (own cards + common cards) land in the same ballpark; recomputed
// from the real card data rather than hard-coded, so it can't silently drift from the source
// of truth in sim/data/characters/*.
const DECK_SIZE_HH = buildFullDeck('hh').length
const DECK_SIZE_BW = buildFullDeck('bw').length
const MAX_UPGRADES_IN_PLAY = 8 // generous upper bound (both kits have well under this many slots)
const MAX_UPGRADES_PLAYED_PER_TURN = 4 // generous upper bound for normalization only

function deckNormalizer(heroId: PlayerState['heroId']): number {
  return heroId === 'hh' ? DECK_SIZE_HH : DECK_SIZE_BW
}

// Per-player fields shared by both self and opponent encodings.
function encodePlayer(p: PlayerState): number[] {
  const deckSize = deckNormalizer(p.heroId)
  const isHH = p.heroId === 'hh' ? 1 : 0
  const isBW = p.heroId === 'bw' ? 1 : 0

  return [
    p.hp / MAX_HP,
    p.cp / CP_CAP,
    p.hand.length / MAX_HAND_SIZE,
    p.deck.length / deckSize,
    p.discard.length / deckSize,
    p.upgradesInPlay.length / MAX_UPGRADES_IN_PLAY,
    p.timeBombs.length / TIME_BOMB_STACK_CAP,
    p.upgradesPlayedThisTurn / MAX_UPGRADES_PLAYED_PER_TURN,
    isHH,
    isBW,
    // Hero-specific tokens. Read straight from the generic bag, but still gated by hero so the
    // vector keeps its fixed shape/semantics: a token a hero can't normally hold stays 0 (identical
    // encoding to the old HHTokens|BWTokens split, since only HH holds dreadful/grimPursuit/head and
    // only BW holds agility/covertOps until cross-player token transfer is wired in a later stage).
    isHH ? p.tokens.dreadful / DREADFUL_CAP : 0,
    isHH ? p.tokens.grimPursuit / GRIM_PURSUIT_CAP : 0,
    isHH ? p.tokens.head : 0,
    isBW ? p.tokens.agility / AGILITY_CAP : 0,
    isBW ? p.tokens.covertOps / COVERT_OPS_CAP : 0,
  ]
}

export function encodeState(state: GameState, forPlayerIdx: 0 | 1): number[] {
  const self = state.players[forPlayerIdx]
  const opp = state.players[(1 - forPlayerIdx) as 0 | 1]
  return [
    state.turnNumber / MAX_TURNS,
    ...encodePlayer(self),
    ...encodePlayer(opp),
  ]
}

export const FEATURE_COUNT = 1 + 15 * 2
