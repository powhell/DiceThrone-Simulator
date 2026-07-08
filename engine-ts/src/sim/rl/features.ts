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
//
// v3 (2026-07-06) : les 8 héros (rv/dr/th/sm/py ajoutés) — one-hot d'identité à 8, encodages
// de deck/upgrades pour tous, TOUS les jetons du bag (feather/hex/nevermore/shapeShift/regen/
// wound/EK/GB/combo/webbed/invisibility/fireMastery/burn/knockdown/stun), forme Druid,
// Mjölnir, cadran Nevermore, cap Fire Mastery. CHANGEMENT DE LAYOUT : les anciens poids
// (v2, hh/bw/fm) sont incompatibles — re-train from scratch.
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
// v4 (2026-07-08) : Duelist (du) + Sun Elf (se) — CHANGEMENT DE LAYOUT, re-train from scratch.
const HERO_IDS = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se'] as const
const ENCODINGS: Partial<Record<HeroId, HeroEncoding>> & Record<'hh' | 'bw' | 'fm', HeroEncoding> =
  Object.fromEntries(HERO_IDS.map(h => [h, buildHeroEncoding(h)])) as any

// Largeurs dérivées des kits réels (le padding gère les decks/kits plus courts).
export const UPGRADE_ONEHOT_SIZE = Math.max(...HERO_IDS.map(h => ENCODINGS[h]!.upgradeIds.length)) // py = 10
export const HAND_ONEHOT_SIZE = Math.max(...HERO_IDS.map(h => ENCODINGS[h]!.deckSize))

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

  return [
    p.hp / MAX_HP,
    p.cp / CP_CAP,
    p.hand.length / MAX_HAND_SIZE,
    p.deck.length / deckSize,
    p.discard.length / deckSize,
    p.upgradesInPlay.length / MAX_UPGRADES_IN_PLAY,
    p.timeBombs.length / TIME_BOMB_STACK_CAP,
    p.upgradesPlayedThisTurn / MAX_UPGRADES_PLAYED_PER_TURN,
    // v3 : identité à 8 héros (remplace isHH/isBW/isFM)
    ...HERO_IDS.map(h => (p.heroId === h ? 1 : 0)),
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
    // v3 : jetons des 5 nouveaux héros (normalisés à leur cap)
    (p.tokens.feather ?? 0) / 5,
    p.tokens.hex ?? 0,
    p.tokens.nevermore ?? 0,
    (p.nevermoreDial ?? 0) / 3,
    (p.tokens.shapeShift ?? 0) / 2,
    (p.tokens.regen2 ?? 0) / 2,
    (p.tokens.regen1 ?? 0) / 2,
    (p.tokens.wound ?? 0) / 2,
    (p.tokens.electrokinesis ?? 0) / 4,
    (p.tokens.guardBreak ?? 0) / 2,
    p.tokens.combo ?? 0,
    p.tokens.webbed ?? 0,
    p.tokens.invisibility ?? 0,
    (p.tokens.fireMastery ?? 0) / 7,
    p.tokens.burn ?? 0,
    p.tokens.knockdown ?? 0,
    p.tokens.stun ?? 0,
    (p.fmCapBonus ?? 0) / 2,
    // v4 : jetons Duelist / Sun Elf
    p.tokens.disarm ?? 0,
    p.tokens.chargedGem ?? 0,
    p.tokens.sunMarked ?? 0,
    // Druid : forme (3 one-hot) ; Thor : Mjölnir chez l'adversaire
    p.form === 'druid' ? 1 : 0,
    p.form === 'cat' ? 1 : 0,
    p.form === 'bear' ? 1 : 0,
    p.mjolnirAway === true ? 1 : 0,
    // v4 : Duelist — piste Footwork (-2..+2 normalisée) + bonus du tour dispo ;
    // Sun Elf — cadran (0-5 normalisé) + face DAWN.
    (p.footwork ?? 0) / 2,
    p.footworkBonusUsedThisTurn === true ? 1 : 0,
    (p.sunDial ?? 0) / 5,
    p.sunDialDawn === true ? 1 : 0,
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

// v4 : 8 scalaires + 10 identité + 5 forge/armures + 5 jetons v2 + 17 jetons v3 + fmCapBonus
// + 3 jetons v4 (disarm/chargedGem/sunMarked) + 3 formes + mjolnir + 4 états v4 (footwork,
// bonusUsed, sunDial, dawn) = 57, + upgrades one-hot.
export const PLAYER_BLOCK_SIZE = 57 + UPGRADE_ONEHOT_SIZE
export const FEATURE_COUNT = 1 + (PLAYER_BLOCK_SIZE + HAND_ONEHOT_SIZE) + PLAYER_BLOCK_SIZE
