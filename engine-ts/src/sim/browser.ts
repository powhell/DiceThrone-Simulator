// Browser entry point for the "play against the AI" interface. Bundled by esbuild to
// static/game-engine.js (global `Game`). Re-exports the sim engine primitives the UI drives,
// the trained-network policy for the AI opponent, and the verified card/ability data for rendering.
// Deliberately does NOT import trainCore/train* (those pull in node:fs) — only the pure game path.
export {
  createInitialGameState, createInitialPlayer, buildFullDeck, runMatch, runBossMatch, MAX_TURNS,
} from './match.js'
export {
  playTurn, enumerateWindowActions, applyWindowAction, resolveAbilityPhase,
  finalizeDefenseRoll, resolveDefense, playCard, playUpkeepPhase, playDiscardPhase,
  applyAttackModifierCard, finalizePendingAttackDamage, oracleStateFor,
} from './turn.js'
export { resolveMatchedAbilities } from './ability-resolver.js'
export { runOffensiveRoll } from './oracle.js'
// Interactive human-vs-AI driver (the UI calls these step by step — see interactive.ts).
export {
  newHumanGame, beginHumanTurn, humanCanTerrorize, humanMainOptions, humanApplyMain,
  rollOffense, beginOffensiveAlter, offensiveAlterOptions, applyOffensiveAlter, endOffensiveAlter,
  matchedAbilities, humanAttack, humanSpendGrimPursuitReroll, humanPlayRollCard, humanKeepAdvice, humanAttackModifierOptions, humanInstantOptions, humanApplyInstant, humanMinePeek, humanForgeOre, humanCraftOptions, humanCraft, humanMinesDraw, humanScrap, humanScrapDie, humanDragonsHoard, humanSetRoarDiscard, humanFreeRerollDie, endHumanTurn, runAiTurn,
  runAiTurnUpToAttack, runAiTurnUpToAlter, humanAiAlterOptions, humanApplyAiAlter, finishAiAlter, nextDefenseDecision, chooseDefense, resolveAiAttack, finishAiTurn,
} from './interactive.js'
export { createValueGreedyPolicy } from './rl/valueGreedyPolicy.js'
export { fromJSON, toJSON, forward, createNetwork } from './rl/network.js'
export { greedyHighestDamagePolicy } from './policy.js'
export { mulberry32, mulberry32Stateful, shuffle, rollDice } from './rng.js'
export {
  heroTemplateFor, cardById, abilityByBoardName, resolvedAbilityByBoardName,
  hhHero, bwHero, commonCards,
} from './data/load.js'
export { emptyBag, hasHead, countToken, TRANSFERABLE_TOKENS } from './tokens.js'

// Re-export types for consumers that type-check against the bundle (stripped at build time).
export type { GameState, PlayerState, HeroId, WindowAction, WindowContext, DecisionRequest, AbilityCandidate } from './types.js'
export type { Policy } from './policy.js'
export type { Network } from './rl/network.js'
export type { HumanGame, AiAttackInfo, DefensePrompt } from './interactive.js'
