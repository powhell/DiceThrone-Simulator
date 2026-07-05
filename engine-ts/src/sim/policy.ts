// The decision-making boundary of the engine. Dice-keep decisions are NOT part of this
// interface — they're handled exactly and automatically by oracle.ts. A Policy only decides
// things the exact DP can't resolve: which matched ability to activate, whether/what to play
// with CP, and defense-roll choices. Scripted policies here validate the rules engine end to
// end (build-order step 5); a future RL agent implements this same interface.
import type { AbilityCandidate, GameState, WindowAction, DecisionRequest } from './types.js'
import { heroTemplateFor, cardById } from './data/load.js'

export interface Policy {
  // Black Widow only (Red Room Training passive) — called before each reroll decision during
  // the Offensive Roll Phase. Return card ids to play now, or [] to play nothing. Never called
  // for Headless Horseman (no mid-roll play mechanic).
  chooseMidRollCards(state: GameState, playerIdx: 0 | 1, dice: number[], rollsRemaining: number): string[]

  // Must return one of candidates[].name. Called only when candidates.length >= 1.
  chooseAbility(state: GameState, playerIdx: 0 | 1, candidates: AbilityCandidate[]): string

  // Unified decision entry point (plan Stage 2). Called by resolveResponseWindow / the phase
  // functions whenever the engine needs this player to pick among enumerated legal actions.
  // `request.options` always contains at least one action (a response window includes 'pass');
  // return exactly one of them. Migrating here incrementally: Main Phase card play already routes
  // through this; later stages move defense, attack-modifiers, ability activation, etc.
  decide(state: GameState, playerIdx: 0 | 1, request: DecisionRequest): WindowAction

  // Black Widow's Sabotage only for now (>=4 upgrades unlocks a reroll of all 3 dice).
  chooseSabotageReroll(state: GameState, defenderIdx: 0 | 1, dice: number[]): boolean

  // Naraxus Thundering Roar : 'discard 1 of their choice' — OPTIONNEL, defaut = cout min.
  chooseDiscardForRoar?(state: GameState, playerIdx: 0 | 1, hand: string[]): string

  // Forgemaster only (The Mines, Upkeep) — OPTIONNEL. top3 = les 3 cartes regardées.
  // 'skip' = ne pas miner ; 'cp' = ne rien révéler (+1 CP, légal même avec des Ore) ;
  // 'reveal' = révéler cet Ore vers The Forge. Absent -> heuristique (meilleur Ore).
  chooseFmMine?(state: GameState, playerIdx: 0 | 1, top3: string[]): { kind: 'skip' } | { kind: 'cp' } | { kind: 'reveal'; oreId: string }

  // Headless Horseman only, called during Upkeep Phase (Headless Mayhem passive).
  // 'terrorize' only offered when the player has >=4 Dreadful (see hh.rules.canTerrorize).
  // 'giveHead' only meaningful if the player currently holds their own Head.
  chooseHeadlessMayhem(state: GameState, playerIdx: 0 | 1, canTerrorize: boolean): 'terrorize' | 'giveHead' | 'none'

  // Discard Phase (verified: official rulebook): sell cards from hand until at or below
  // maxHandSize, gaining 1 CP per card sold (rulebook: "no matter how much it costs to
  // play"). Return the card ids to sell — must return at least (hand.length - maxHandSize)
  // ids when hand.length > maxHandSize (no other actions are legal during this phase).
  chooseCardsToDiscard(state: GameState, playerIdx: 0 | 1, maxHandSize: number): string[]

  // Headless Horseman's Horrify only, and only when NOT holding the Haunted Head (verified
  // card text: without the Head it's a choice between the two; with the Head you get both
  // automatically, no choice offered).
  chooseHorrifyBonus(state: GameState, playerIdx: 0 | 1): 'dreadful' | 'grimPursuit'

  // NOTE: "after being Attacked" cards (Not This Time!, Spirited Reprisal!, Recoil!, Elude!) are
  // no longer a dedicated hook — they're now offered as playCard options in the DRP5 'defense'
  // response window and chosen via decide() (plan Stage 3).

  // "Attack Modifier" Roll Phase Action cards played by the ATTACKER for their own current
  // attack (Unescapable!, Cranial Assist!, Subversion!, Thundering Hooves!) — called from
  // applyHHAbility/applyBWAbility right before the attack's dmg/defendability is finalized and
  // resolveDefense runs. `eligibleCardIds` is pre-filtered to cards the attacker holds and can
  // afford (Unescapable! additionally requires >=1 Grim Pursuit in hand-eligibility). Return
  // the subset (in play order) to play; [] to play none.
  chooseAttackModifierCards(state: GameState, playerIdx: 0 | 1, dmg: number, eligibleCardIds: string[]): string[]

  // Headless Horseman's Grim Pursuit spend, mode (b): "after attacking, roll 1 die and add that
  // many dmg as an Attack Modifier" (once per turn). Called from applyAttackModifiers when the
  // attacker holds >=1 Grim Pursuit and hasn't spent mode (b) this turn. Return true to spend 1
  // Grim Pursuit for the bonus. Optional — omit to never spend (scripted greedy default).
  chooseGrimPursuitSpend?(state: GameState, playerIdx: 0 | 1, dmg: number): boolean

  // Grim Pursuit mode (a): "spend 1 to perform an additional Roll Attempt during your Offensive
  // Roll Phase" (once per turn). Offered at the roll's FINAL window (rollsRemaining 0), when the
  // dice are otherwise final — return true to spend 1 Grim Pursuit and re-enter the keep/reroll
  // loop with one more attempt. Optional — omit to never spend (scripted greedy default).
  chooseGrimPursuitReroll?(state: GameState, playerIdx: 0 | 1, dice: number[]): boolean

  // Roll Phase Action cards that directly manipulate the roller's OWN current dice mid-roll
  // (Six-It!, So Wild!, Twice As Wild!, Samesies!, Try Try Again!, One More Time!) — called
  // once per DP keep/reroll iteration in oracle.ts's runOffensiveRoll, before the DP computes
  // its keep decision on the (possibly just-modified) dice. `eligibleCardIds` is pre-filtered
  // to cards the roller holds and can afford. For each returned choice: `dieIndices` are
  // positions into the CURRENT `dice` array passed to this call; `values` (parallel array) are
  // the new face values to set — used by Six-It!/So Wild!/Twice As Wild!/Samesies! (which
  // reads another die's current value out of `dice` itself to build its match), omitted for
  // Try Try Again! (rerolled fresh, not set to a chosen value) and One More Time! (grants an
  // extra Roll Attempt, doesn't touch dice directly).
  chooseRollManipulationCards(
    state: GameState, playerIdx: 0 | 1, dice: number[], rollsRemaining: number, eligibleCardIds: string[],
  ): RollManipulationChoice[]
}

export interface RollManipulationChoice {
  cardId: string
  dieIndices?: number[]
  values?: number[]
}

// Validates the turn/match state machine: picks the matched ability with the highest known
// base damage, never rerolls Sabotage. Plays every affordable Hero Upgrade card it's holding
// (permanent, so "greedy" here just means "always improve future turns if you can") — never
// plays Action cards, since evaluating whether one is worth its CP needs more than a base-
// damage heuristic.
export const greedyHighestDamagePolicy: Policy = {
  // Grim Pursuit (a) : E[bonus] = 5 dés x P(Fer)=2/6 ~ +1.67 dégâts pour 1 jeton. Un jeton
  // stocké ne vaut que par sa dépense (cap 3) : on dépense dès que l'attaque touche.
  chooseGrimPursuitSpend(state, playerIdx, dmg) { return dmg > 0 },
  chooseMidRollCards: () => [],
  // Scripted decision: in a Main Phase window, play the first affordable Hero Upgrade offered (the
  // engine re-enumerates after each play, so this plays every affordable upgrade one at a time —
  // same net result as the old chooseMainPhaseCards subset). Passes on every other window type,
  // including the DRP5 'defense' window (greedy never plays Action cards — same as the old
  // chooseDefensiveCards: () => []). Options are enumerated in hand order (enumerateWindowActions).
  decide(_state, _playerIdx, request): WindowAction {
    if (request.ctx.windowType === 'mainPhase') {
      const play = request.options.find(o => o.kind === 'playCard')
      if (play) return play
    }
    return { kind: 'pass' }
  },
  chooseSabotageReroll: () => false,
  chooseAbility(_state, _playerIdx, candidates) {
    let best = candidates[0]
    for (const c of candidates) {
      if ((c.baseDamage ?? -Infinity) > (best.baseDamage ?? -Infinity)) best = c
    }
    return best.name
  },
  chooseHeadlessMayhem: (_state, _playerIdx, canTerrorize) => (canTerrorize ? 'terrorize' : 'none'),
  chooseCardsToDiscard(state, playerIdx, maxHandSize) {
    const hand = state.players[playerIdx].hand
    const overflow = hand.length - maxHandSize
    return overflow > 0 ? hand.slice(0, overflow) : []
  },
  chooseHorrifyBonus: () => 'dreadful',
  chooseAttackModifierCards: () => [],
  chooseRollManipulationCards: () => [],
}
