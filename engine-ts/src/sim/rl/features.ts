// Turns a GameState into a fixed-size numeric feature vector, always from "self vs opponent"
// perspective (self = the player the value is being estimated FOR), so one network serves
// both seats and both hero matchups without needing per-hero/per-seat variants. Pure function,
// no dependency on network.ts/candidates.ts/lookahead.ts.
//
// v2 (2026-07-04): the v1 vector only encoded the COUNT of upgrades in play, which made the
// network structurally blind to WHICH upgrades are down — it could never learn that e.g. BW's
// Red Room Training II (the +1-global passive) matters more than another upgrade, and never
// learned to BUY upgrades at all (measured: HH played 0 of its 7 paid upgrades over 400 games).
// v2 adds:
//   - identity one-hot of upgrades IN PLAY, for both players (public information),
//   - identity one-hot of SELF's hand (a player knows their own hand; the opponent's hand stays
//     count-only — encoding it would leak hidden information and train a cheating evaluator),
//   - tokens read un-gated from the bag for both players (Transference!-style cards can move
//     tokens across heroes, so "a bw player can't hold dreadful" is no longer structurally true).
import type { GameState, PlayerState, HeroId } from '../types.js'
import { STARTING_HP, HEAL_CAP_ABOVE_STARTING, CP_CAP, MAX_HAND_SIZE } from '../data/config.js'
import { DREADFUL_CAP, GRIM_PURSUIT_CAP } from '../hero/hh.rules.js'
import { AGILITY_CAP, COVERT_OPS_CAP, TIME_BOMB_STACK_CAP } from '../hero/bw.rules.js'
import { heroTemplateFor } from '../data/load.js'
import { buildFullDeck } from '../match.js'
import { MAX_TURNS } from '../match.js'

const MAX_HP = STARTING_HP + HEAL_CAP_ABOVE_STARTING
const MAX_UPGRADES_IN_PLAY = 8 // generous upper bound (both kits have well under this many slots)
const MAX_UPGRADES_PLAYED_PER_TURN = 4 // generous upper bound for normalization only

// Stable per-hero indexes, derived once from the same data files the engine plays from (so the
// encoding can't drift from the source of truth). Order = declaration order in hero.json /
// common-cards.json, which is stable versioned data.
interface HeroEncoding {
  upgradeIds: string[] // kind==='upgrade' card ids, hero.json order
  deckIndex: Map<string, number> // cardId -> position in buildFullDeck(heroId)
  deckSize: number
}

function buildHeroEncoding(heroId: HeroId): HeroEncoding {
  const hero = heroTemplateFor(heroId)
  const upgradeIds = hero.cards.filter(c => c.kind === 'upgrade').map(c => c.id)
  const deck = buildFullDeck(heroId)
  return {
    upgradeIds,
    deckIndex: new Map(deck.map((id, i) => [id, i])),
    deckSize: deck.length,
  }
}

// nx (boss) exclu : jamais encodé pour le réseau (pas dans le pool self-play)
const ENCODINGS: Partial<Record<HeroId, HeroEncoding>> & Record<'hh' | 'bw' | 'fm', HeroEncoding> = { hh: buildHeroEncoding('hh'), bw: buildHeroEncoding('bw'), fm: buildHeroEncoding('fm') }

// Both heroes' full decks must be the same size for the hand one-hot block to have a fixed
// width. True today (14 hero cards + 17 common = 31 for both); if a future hero breaks this,
// HAND_ONEHOT_SIZE must become the max and shorter decks zero-pad.
export const UPGRADE_ONEHOT_SIZE = 8
export const HAND_ONEHOT_SIZE = Math.max(ENCODINGS.hh.deckSize, ENCODINGS.bw.deckSize, ENCODINGS.fm.deckSize)

// One-hot over the hero's upgrade card list, padded to UPGRADE_ONEHOT_SIZE. Slot i means "the
// i-th upgrade card of THIS hero's kit is in play" — hero-dependent semantics, which the
// network can disambiguate via the isHH/isBW flags in the same player block.
function encodeUpgradesInPlay(p: PlayerState): number[] {
  const enc = ENCODINGS[p.heroId] ?? ENCODINGS.hh // nx (boss) jamais encodé en pratique
  const out = new Array<number>(UPGRADE_ONEHOT_SIZE).fill(0)
  for (const id of p.upgradesInPlay) {
    const idx = enc.upgradeIds.indexOf(id)
    if (idx >= 0 && idx < UPGRADE_ONEHOT_SIZE) out[idx] = 1
  }
  return out
}

// One-hot over the hero's full deck: which exact cards this player is holding. Only ever
// emitted for SELF (own hand is known information; the opponent's is hidden).
function encodeHand(p: PlayerState): number[] {
  const enc = ENCODINGS[p.heroId] ?? ENCODINGS.hh
  const out = new Array<number>(HAND_ONEHOT_SIZE).fill(0)
  for (const id of p.hand) {
    const idx = enc.deckIndex.get(id)
    if (idx !== undefined) out[idx] = 1
  }
  return out
}

// Per-player fields shared by both self and opponent encodings.
function encodePlayer(p: PlayerState): number[] {
  const deckSize = (ENCODINGS[p.heroId] ?? ENCODINGS.hh).deckSize
  const isHH = p.heroId === 'hh' ? 1 : 0
  const isBW = p.heroId === 'bw' ? 1 : 0
  const isFM = p.heroId === 'fm' ? 1 : 0

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
    isFM,
    // Forgemaster : la Forge et les armures sont SON état stratégique central — sans ces
    // features le réseau ne peut pas valoriser un état fm (zéro pour les autres héros).
    p.forge.filter(id => id === 'gold-ore').length / 9,
    p.forge.filter(id => id === 'diamond-ore').length / 6,
    p.forge.filter(id => id === 'ultimanium-ore').length,
    p.armor.helmet / 3,
    p.armor.shield / 3,
    // Tokens read straight from the generic bag for BOTH heroes (v2: un-gated). Cross-player
    // token transfer cards mean any player can end up holding any bag token; gating by hero
    // hid that from the network.
    p.tokens.dreadful / DREADFUL_CAP,
    p.tokens.grimPursuit / GRIM_PURSUIT_CAP,
    p.tokens.head,
    p.tokens.agility / AGILITY_CAP,
    p.tokens.covertOps / COVERT_OPS_CAP,
    ...encodeUpgradesInPlay(p),
  ]
}

export function encodeState(state: GameState, forPlayerIdx: 0 | 1): number[] {
  const self = state.players[forPlayerIdx]
  const opp = state.players[(1 - forPlayerIdx) as 0 | 1]
  return [
    state.turnNumber / MAX_TURNS,
    ...encodePlayer(self),
    ...encodeHand(self),
    ...encodePlayer(opp),
  ]
}

const PLAYER_BLOCK_SIZE = 21 + UPGRADE_ONEHOT_SIZE // 15 + isFM + 3 ore Forge + 2 armures (2026-07-05)
export const FEATURE_COUNT = 1 + (PLAYER_BLOCK_SIZE + HAND_ONEHOT_SIZE) + PLAYER_BLOCK_SIZE
