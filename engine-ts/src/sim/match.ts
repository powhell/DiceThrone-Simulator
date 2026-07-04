import type { GameState, HeroId, PlayerState } from './types.js'
import type { Policy } from './policy.js'
import type { RNG } from './rng.js'
import { mulberry32, shuffle } from './rng.js'
import { playTurn } from './turn.js'
import { createInitialHHTokens } from './hero/hh.rules.js'
import { createInitialBWTokens } from './hero/bw.rules.js'
import { STARTING_HP, STARTING_CP, STARTING_HAND_SIZE } from './data/config.js'
import { heroTemplateFor, commonCards } from './data/load.js'

// One copy of every unique card (hero-specific + common) — confirmed by the user against the
// physical decks: no duplicate copies, and the printed "~32 cards" count includes one
// tournament-banned card intentionally left out of hero.json/common-cards.json.
export function buildFullDeck(heroId: HeroId): string[] {
  const hero = heroTemplateFor(heroId)
  return [...hero.cards.map(c => c.id), ...commonCards.cards.map(c => c.id)]
}

// rng is optional so unit tests that don't care about deck/hand contents (most of
// tests/sim/{hh,bw}.rules.test.ts) can keep calling this without threading an RNG through.
// isFirstPlayer defaults to true (no setup bonus) so those same single-player unit tests are
// unaffected by the rule below.
export function createInitialPlayer(heroId: HeroId, rng?: RNG, isFirstPlayer = true): PlayerState {
  let deck: string[] = []
  let hand: string[] = []
  if (rng) {
    deck = shuffle(buildFullDeck(heroId), rng)
    hand = deck.splice(0, STARTING_HAND_SIZE)
  }
  const tokens = heroId === 'hh' ? createInitialHHTokens(true) : createInitialBWTokens()
  // Verified leaflet setup rule (HH "Hero Setup"): "Begin the game with the Haunted Head on
  // your Hero Board. If you are NOT the first player to begin the game, gain 1 Dreadful." No
  // BW equivalent (she has no Dreadful token) — this only applies to hh going second.
  if (heroId === 'hh' && !isFirstPlayer) {
    tokens.dreadful += 1
  }
  return {
    heroId,
    hp: STARTING_HP,
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
