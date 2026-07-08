import type { GameState, HeroId, PlayerState } from './types.js'
import type { Policy } from './policy.js'
import type { RNG } from './rng.js'
import { mulberry32, shuffle } from './rng.js'
import { playTurn, playNaraxusTurn } from './turn.js'
import { createInitialHHTokens } from './hero/hh.rules.js'
import { createInitialBWTokens } from './hero/bw.rules.js'
import { createInitialFMTokens } from './hero/fm.rules.js'
import { createInitialNXTokens, NX_HP_BY_HEROES } from './hero/nx.rules.js'
import { createInitialRVTokens } from './hero/rv.rules.js'
import { createInitialDRTokens } from './hero/dr.rules.js'
import { createInitialTHTokens } from './hero/th.rules.js'
import { createInitialSMTokens } from './hero/sm.rules.js'
import { createInitialPYTokens } from './hero/py.rules.js'
import { createInitialDUTokens } from './hero/du.rules.js'
import { createInitialSETokens } from './hero/se.rules.js'
import { STARTING_HP, STARTING_CP, STARTING_HAND_SIZE } from './data/config.js'
import { heroTemplateFor, commonCards } from './data/load.js'

// Every card (hero-specific + common), honoring per-card copy counts. HH/BW decks have one
// copy of every unique card — confirmed by the user against the physical decks (the printed
// "~32 cards" count includes one tournament-banned card intentionally left out of
// hero.json/common-cards.json). The Forgemaster is the only hero with duplicates
// (CardTemplate.count: Gold Ore x9, Diamond Ore x6).
export function buildFullDeck(heroId: HeroId): string[] {
  const hero = heroTemplateFor(heroId)
  const out: string[] = []
  for (const c of hero.cards) for (let i = 0; i < (c.count ?? 1); i++) out.push(c.id)
  for (const c of commonCards.cards) for (let i = 0; i < (c.count ?? 1); i++) out.push(c.id)
  return out
}

// rng is optional so unit tests that don't care about deck/hand contents (most of
// tests/sim/{hh,bw}.rules.test.ts) can keep calling this without threading an RNG through.
// isFirstPlayer defaults to true (no setup bonus) so those same single-player unit tests are
// unaffected by the rule below.
export function createInitialPlayer(heroId: HeroId, rng?: RNG, isFirstPlayer = true): PlayerState {
  let deck: string[] = []
  let hand: string[] = []
  if (rng && heroId !== 'nx') {
    deck = shuffle(buildFullDeck(heroId), rng)
    hand = deck.splice(0, STARTING_HAND_SIZE)
  }
  const tokens = heroId === 'hh' ? createInitialHHTokens(true)
    : heroId === 'fm' ? createInitialFMTokens()
    : heroId === 'nx' ? createInitialNXTokens()
    : heroId === 'rv' ? createInitialRVTokens()
    : heroId === 'dr' ? createInitialDRTokens()
    : heroId === 'th' ? createInitialTHTokens()
    : heroId === 'sm' ? createInitialSMTokens()
    : heroId === 'py' ? createInitialPYTokens()
    : heroId === 'du' ? createInitialDUTokens()
    : heroId === 'se' ? createInitialSETokens()
    : createInitialBWTokens()
  // Verified leaflet setup rule (HH "Hero Setup"): "Begin the game with the Haunted Head on
  // your Hero Board. If you are NOT the first player to begin the game, gain 1 Dreadful." No
  // BW equivalent (she has no Dreadful token) — this only applies to hh going second.
  if (heroId === 'hh' && !isFirstPlayer) {
    tokens.dreadful += 1
  }
  return {
    heroId,
    // Naraxus (boss) : 65 PV en 1v1 (65/65/70/75 selon 1-4 héros, planche vérifiée), 0 carte.
    hp: heroId === 'nx' ? NX_HP_BY_HEROES[0] : STARTING_HP,
    cp: STARTING_CP,
    upgradesInPlay: [],
    hand,
    deck,
    discard: [],
    tokens,
    timeBombs: [],
    upgradesPlayedThisTurn: 0,
    grimPursuitBonusUsedThisTurn: false,
    covertOpsUsedThisTurn: false,
    grimPursuitRerollUsedThisTurn: false,
    minesDrawUsedThisTurn: false,
    hoardedDice: 0,
    nevermoreDial: 0,
    featherCapBonus: 0,
    form: heroId === 'dr' ? 'druid' : undefined,
    // Forgemaster zones (inert for other heroes). 1v1 setup: NO starting Armor (the leaflet's
    // "begin with any one Gold Armor" only applies with more than 1 opponent).
    forge: [],
    armor: { helmet: 0, shield: 0 },
  }
}

export function createInitialGameState(heroA: HeroId, heroB: HeroId, rng?: RNG): GameState {
  return {
    turnNumber: 0,
    activePlayerIdx: 0,
    players: [createInitialPlayer(heroA, rng, true), createInitialPlayer(heroB, rng, false)],
    log: [],
    winner: null,
    gameOver: false,
    pendingDamage: [0, 0],
    pendingAttack: null,
    pendingRoll: null,
    pendingDefenseRoll: null,
  }
}

export interface MatchResult {
  winner: 0 | 1 | null
  turns: number
  finalState: GameState
}

// Hard cap guards against an infinite-loop bug in the state machine (real Dice Throne
// matches don't run this long — hitting this is itself a signal something is broken).
export const MAX_TURNS = 200

// Match contre Naraxus (boss) : le boss (seat 1) joue TOUJOURS avant le heros (seat 0).
// hoard : le choix Dragon's Hoard du heros ('draw' = pioche 1, 'cp' = +2 CP).
export function runBossMatch(heroId: HeroId, seed: number, policy: Policy, hard = false, hoard: 'draw' | 'cp' = 'draw'): MatchResult {
  const rng = mulberry32(seed)
  const state = createInitialGameState(heroId, 'nx', rng)
  state.bossHard = hard
  const hero = state.players[0]
  if (hoard === 'draw') { const c = hero.deck.shift(); if (c) hero.hand.push(c) }
  else hero.cp += 2
  const policies: [Policy, Policy] = [policy, policy]
  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    playNaraxusTurn(state, 1, rng, policies)
    if (state.gameOver) break
    playTurn(state, 0, rng, policies)
  }
  return { winner: state.winner, turns: state.turnNumber, finalState: state }
}

export function runMatch(heroA: HeroId, heroB: HeroId, seed: number, policies: [Policy, Policy]): MatchResult {
  const rng = mulberry32(seed)
  const state = createInitialGameState(heroA, heroB, rng)

  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    playTurn(state, activeIdx, rng, policies)
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }

  return { winner: state.winner, turns: state.turnNumber, finalState: state }
}
