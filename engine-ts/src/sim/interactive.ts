// Interactive human-vs-AI driver for the "play against the AI" UI.
//
// Deliberately reuses the SYNC engine primitives — no async conversion, no engine rewrite, and
// therefore no impact on the RL lookahead (which replays this same sync engine millions of times).
// The trick: a human only needs interactive control on THEIR OWN turn (which cards to play, which
// dice to keep, which matched ability to activate). The UI gathers each of those and calls the
// engine functions here step by step. The AI's whole turn runs through the normal playTurn.
//
// v1 simplifications (see STATUS_INTERFACE.md), all additive to fix later:
//  - the human's DEFENSE during the AI's attack is auto-resolved (greedy) — interactive defense
//    needs the async response-window bridge, deferred.
//  - the offensive "opponent alters your dice" window and the HH Headless-Mayhem / Terrorize choice
//    use sensible auto defaults for now.
import type {
  GameState, HeroId, WindowAction, WindowContext, AbilityCandidate,
} from './types.js'
import type { Policy } from './policy.js'
import type { RNG, StatefulRNG } from './rng.js'
import { rollDice, mulberry32Stateful } from './rng.js'
import { greedyHighestDamagePolicy } from './policy.js'
import { resolveMatchedAbilities } from './ability-resolver.js'
import {
  playUpkeepPhase, playIncomePhase, playDiscardPhase, playEndOfTurn,
  playMainPhase, playOffensiveRollPhase, resolveOffensiveAlterWindow, checkGameOver,
  enumerateWindowActions, applyWindowAction, resolveAbilityPhase, playTurn, oracleStateFor,
  applyRollManipulationCard,
} from './turn.js'
import type { RollManipulationChoice } from './policy.js'
import { createInitialGameState } from './match.js'
import { heroTemplateFor, cardById } from './data/load.js'
import { hhConfig } from '../characters/horseman/config.js'
import { bwConfig } from '../characters/black_widow/config.js'
import * as core from '../core/evaluator.js'

export interface HumanGame {
  state: GameState
  humanIdx: 0 | 1
  aiIdx: 0 | 1
  ai: Policy
  rng: RNG
  def?: DefenseSession   // live interactive-defense session during the AI's attack (see below)
}

export function newHumanGame(humanHero: HeroId, aiHero: HeroId, ai: Policy, rng: RNG, humanFirst = true): HumanGame {
  const state = humanFirst
    ? createInitialGameState(humanHero, aiHero, rng)
    : createInitialGameState(aiHero, humanHero, rng)
  const humanIdx: 0 | 1 = humanFirst ? 0 : 1
  return { state, humanIdx, aiIdx: (1 - humanIdx) as 0 | 1, ai, rng }
}

// --- The human's own turn, driven step by step by the UI ------------------------------------

// Upkeep + income. Mirrors the head of playTurn (upkeep -> income). v1 uses greedy's default for the
// HH Headless-Mayhem sub-choice; a UI prompt can be wired later.
export function beginHumanTurn(g: HumanGame, mayhem?: 'terrorize' | 'giveHead' | 'none'): void {
  g.state.turnNumber += 1
  // HH's Upkeep offers Headless Mayhem (Terrorize / move the Head / nothing). If the UI gathered the
  // human's choice, inject it; otherwise fall back to greedy's default.
  const policy = mayhem ? { ...greedyHighestDamagePolicy, chooseHeadlessMayhem: () => mayhem } : greedyHighestDamagePolicy
  playUpkeepPhase(g.state, g.humanIdx, g.rng, policy)
  if (g.state.gameOver) return
  playIncomePhase(g.state, g.humanIdx, g.rng)
}

// Can the human choose Terrorize this upkeep? (HH with >=4 Dreadful — the Terrorize threshold.)
export function humanCanTerrorize(g: HumanGame): boolean {
  const self = g.state.players[g.humanIdx]
  return self.heroId === 'hh' && self.tokens.dreadful >= 4
}

const mainCtx = (phase: 'main1' | 'main2'): WindowContext => ({ windowType: 'mainPhase', phase })

// The legal Main-Phase actions to offer the human as buttons (always includes { kind:'pass' }).
export function humanMainOptions(g: HumanGame, phase: 'main1' | 'main2'): WindowAction[] {
  return enumerateWindowActions(g.state, g.humanIdx, mainCtx(phase))
}
// Apply one chosen Main-Phase action (a card play, instant, token move…). The UI loops:
// show options -> human clicks -> applyMain -> repeat, until the human picks { kind:'pass' }.
export function humanApplyMain(g: HumanGame, action: WindowAction, phase: 'main1' | 'main2'): void {
  if (action.kind === 'pass') return
  applyWindowAction(g.state, g.humanIdx, action, mainCtx(phase), g.rng)
}

// Offensive Roll Phase, UI-controlled keeps (instead of the DP oracle the AI uses). First roll:
// prev=null. Subsequent rolls: pass the current dice + a keep-mask; unkept dice are rerolled.
export function rollOffense(g: HumanGame, prev: number[] | null, keep: boolean[]): number[] {
  if (!prev) return rollDice(5, g.rng).sort((a, b) => a - b)
  const kept = prev.filter((_, i) => keep[i])
  const rerolled = rollDice(5 - kept.length, g.rng)
  return [...kept, ...rerolled].sort((a, b) => a - b)
}

// Offensive dice-manipulation window on YOUR OWN turn: So Wild! / Twice As Wild! / Tip It! /
// Helping Hand! on your just-rolled dice to reshape them (e.g. toward an Ultimate). Mirrors the
// engine's resolveOffensiveAlterWindow but UI-driven. The dice are stashed on state.pendingRoll so
// the engine's enumerate/apply operate on them; endOffensiveAlter reads the final dice and clears it.
export function beginOffensiveAlter(g: HumanGame, dice: number[]): void {
  g.state.pendingRoll = { rollerIdx: g.humanIdx, dice: dice.slice() }
}
export function offensiveAlterOptions(g: HumanGame): WindowAction[] {
  return enumerateWindowActions(g.state, g.humanIdx, { windowType: 'offensiveRoll' })
}
export function applyOffensiveAlter(g: HumanGame, action: WindowAction): number[] {
  applyWindowAction(g.state, g.humanIdx, action, { windowType: 'offensiveRoll' }, g.rng)
  return g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : []
}
export function endOffensiveAlter(g: HumanGame): number[] {
  const d = g.state.pendingRoll ? g.state.pendingRoll.dice.slice() : []
  g.state.pendingRoll = null
  return d
}

// The abilities the human's final dice can activate (for the UI to present a choice).
export function matchedAbilities(g: HumanGame, dice: number[]): AbilityCandidate[] {
  const self = g.state.players[g.humanIdx]
  const opp = g.state.players[g.aiIdx]
  return resolveMatchedAbilities(self.heroId, dice, oracleStateFor(self, opp))
}

// Resolve the human's chosen attack. The chosen ability name is injected into a one-shot policy so
// the real resolveAbilityPhase (which also runs the AI's defense) picks it. Returns nothing; read
// g.state for the result. If dice match no ability it's a Whiff (handled inside resolveAbilityPhase).
export function humanAttack(g: HumanGame, dice: number[], abilityName: string, gpBonus = false, attackMods: string[] = []): void {
  // gpBonus: mode (b) Grim Pursuit pre-armed. attackMods: attack-modifier card ids the human
  // pre-armed in the UI (Cranial Assist!, Unescapable!, Subversion!, Thundering Hooves!) —
  // before this parameter the human hook always answered "none", making those 4 cards
  // unplayable on your own attacks (user-caught on Cranial Assist!).
  const humanPolicy: Policy = {
    ...greedyHighestDamagePolicy,
    chooseAbility: () => abilityName,
    chooseGrimPursuitSpend: () => gpBonus,
    chooseAttackModifierCards: (_s, _p, _d, eligible) => attackMods.filter(id => eligible.includes(id)),
  }
  const policies: [Policy, Policy] = g.humanIdx === 0 ? [humanPolicy, g.ai] : [g.ai, humanPolicy]
  resolveAbilityPhase(g.state, g.humanIdx, dice, g.rng, policies)
}

// The attack-modifier cards the human could arm for the attack being chosen (hand + CP +
// per-card conditions, same filter the engine applies at resolution time).
export function humanAttackModifierOptions(g: HumanGame): string[] {
  const self = g.state.players[g.humanIdx]
  const hero = heroTemplateFor(self.heroId)
  return ['unescapable', 'cranial-assist', 'subversion', 'thundering-hooves'].filter(id => {
    if (!self.hand.includes(id)) return false
    const card = cardById(hero, id)
    if (!card || self.cp < (card.cpCost ?? 0)) return false
    // 0 Grim Pursuit : Unescapable reste proposable si Thundering Hooves (armable dans la même
    // fenêtre, résolu en premier côté moteur) peut convertir du CP en GP (combo user-caught).
    if (id === 'unescapable' && self.tokens.grimPursuit < 1
      && !(self.hand.includes('thundering-hooves') && self.cp >= 2)) return false
    return true
  })
}

// Roll-manipulation card play for the HUMAN's manual roll (Six-It!/Samesies!/Try Try Again!/
// One More Time! — the roller-hook cards that only the AI's oracle path could reach before).
// The UI builds the choice (cardId + dieIndices + values); applyRollManipulationCard validates
// hand/CP and pays/discards. Returns the updated dice and any extra Roll Attempts granted.
export function humanPlayRollCard(
  g: HumanGame, choice: RollManipulationChoice, dice: number[],
): { dice: number[]; extraRollsGranted: number } {
  return applyRollManipulationCard(g.state, g.humanIdx, choice, dice, g.rng)
}

// Instants jouables HORS Main Phase (règle : un Instant s'interrompt n'importe quand). L'UI
// les offre pendant la phase de choix d'habileté — cas user : Rolling Pumpkin! pour donner la
// Tête à l'IA AVANT d'armer Cranial Assist! (+3 si l'adversaire a la Tête).
export function humanInstantOptions(g: HumanGame): WindowAction[] {
  return enumerateWindowActions(g.state, g.humanIdx, { windowType: 'mainPhase', phase: 'main1' })
    .filter(a => a.kind === 'playInstant' || a.kind === 'moveHead')
}
export function humanApplyInstant(g: HumanGame, action: WindowAction): void {
  applyWindowAction(g.state, g.humanIdx, action, { windowType: 'mainPhase', phase: 'main1' }, g.rng)
}

// Keep-advice for the HUMAN's roll, straight from the exact DP oracle (core/evaluator — the
// same optimal keep calculator the AI rolls with). Lets the UI coach flag reroll mistakes:
// "you kept X, the optimal keep was Y (EV a vs b)".
export function humanKeepAdvice(
  g: HumanGame, dice: number[], rollsRemaining: number,
): { kept: number[]; ev: number; keepAllEv: number; topOptions: core.KeepOption[] } {
  const self = g.state.players[g.humanIdx]
  const opp = g.state.players[g.aiIdx]
  const cfg: any = self.heroId === 'hh' ? hhConfig : bwConfig
  const r = core.calculateOptimalKeep(cfg, dice, rollsRemaining, oracleStateFor(self, opp) as any)
  const top = r.topOptions[0]
  // topOptions: the full ranked keep table (kept dice, EV, per-ability landing odds) so the UI
  // can show the coach's alternatives, not just the single best keep.
  return { kept: top.kept, ev: top.ev, keepAllEv: r.currentEv, topOptions: r.topOptions }
}

// Grim Pursuit mode (a) for the HUMAN's manual roll: spend 1 token for an additional Roll
// Attempt (once per turn — same rule the AI plays by). The UI grants itself one more reroll
// when this returns true.
export function humanSpendGrimPursuitReroll(g: HumanGame): boolean {
  const self = g.state.players[g.humanIdx]
  if (self.heroId !== 'hh' || self.tokens.grimPursuit < 1 || self.grimPursuitRerollUsedThisTurn) return false
  self.tokens.grimPursuit -= 1
  self.grimPursuitRerollUsedThisTurn = true
  g.state.log.push({ turn: g.state.turnNumber, playerIdx: g.humanIdx, phase: 'roll', message: 'Grim Pursuit (mode a): +1 additional Roll Attempt' })
  return true
}

// Discard to the hand limit (auto in v1) + end-of-turn bookkeeping, then hand priority to the AI.
export function endHumanTurn(g: HumanGame): void {
  if (!g.state.gameOver) {
    playDiscardPhase(g.state, g.humanIdx, greedyHighestDamagePolicy)
    playEndOfTurn(g.state, g.humanIdx)
  }
  g.state.activePlayerIdx = g.aiIdx
}

// --- The AI's whole turn, human defense auto-resolved (greedy). Kept for tests / a "fast" mode. --
export function runAiTurn(g: HumanGame): void {
  if (g.state.gameOver) return
  g.state.turnNumber += 1
  const humanDefense = greedyHighestDamagePolicy
  const policies: [Policy, Policy] = g.aiIdx === 0 ? [g.ai, humanDefense] : [humanDefense, g.ai]
  playTurn(g.state, g.aiIdx, g.rng, policies)
  g.state.activePlayerIdx = g.humanIdx
}

// --- The AI's turn with INTERACTIVE defense (v2b) --------------------------------------------
//
// The rules resolve a defense synchronously inside the AI's attack (resolveDefense's two response
// windows call the DEFENDER's Policy.decide). We can't pause a sync call for a UI click, and we
// won't make the whole engine async (it would infect the RL lookahead / training). Instead:
// DETERMINISTIC REPLAY. The sim rng is snapshotable, so we
//   1. run the AI's turn up to (not incl.) the attack, snapshot the rng,
//   2. PROBE the human's next legal defense decision by resolving the attack on a CLONE (restored
//      rng) with a policy that replays the choices made so far, records the next one, then passes,
//   3. show that decision to the human; on their pick, append to the script and re-probe,
//   4. when there are no more human decisions (or they pass), resolve the attack ONCE for real on
//      the actual state (rng still at the snapshot, so it reproduces the last probe exactly).
// The engine stays 100% synchronous and untouched; only this driver clones + replays.

export interface AiAttackInfo {
  abilityName: string | null   // null = the AI whiffed (no ability), so no attack lands
  incomingDamage: number       // base board damage, for display (actual may shift with modifiers)
  defendable: boolean
}
export interface DefensePrompt {
  ctx: WindowContext
  options: WindowAction[]       // legal actions incl. { kind:'pass' } — render each as a button
  remaining: number | null      // damage still to take at this point (defense window), else null
  defenseDice: number[] | null  // your defense (Hallowed/Sabotage) dice, if this is the roll window
}
interface DefenseSession {
  finalDice: number[]
  savedRng: number
  script: WindowAction[]
  attack: AiAttackInfo
}

// Human is the OPPONENT during the AI's turn; for windows we don't yet expose interactively
// (the AI's Main Phase, and altering the AI's offensive dice) the human simply passes.
const passPolicy: Policy = { ...greedyHighestDamagePolicy, decide: () => ({ kind: 'pass' }) as WindowAction }

function order(g: HumanGame, aiPol: Policy, humanPol: Policy): [Policy, Policy] {
  return g.aiIdx === 0 ? [aiPol, humanPol] : [humanPol, aiPol]
}

// The human's defense policy: replays `script` in order, then passes. If a `probe` is given, the
// FIRST un-scripted decision is captured (for the UI) instead of being auto-decided.
function defensePolicy(script: WindowAction[], probe?: { captured: DefensePrompt | null }): Policy {
  let i = 0
  return {
    ...greedyHighestDamagePolicy,
    decide(state, _p, req) {
      if (i < script.length) return script[i++]
      if (probe && !probe.captured) {
        probe.captured = {
          ctx: req.ctx,
          options: req.options,
          remaining: req.ctx.windowType === 'defense' ? (state.pendingAttack?.remaining ?? null) : null,
          defenseDice: state.pendingRoll ? state.pendingRoll.dice.slice() : null,
        }
      }
      i++
      return { kind: 'pass' } as WindowAction
    },
  }
}

function computeAttackInfo(g: HumanGame, dice: number[]): AiAttackInfo {
  const ai = g.state.players[g.aiIdx]
  const human = g.state.players[g.humanIdx]
  const cands = resolveMatchedAbilities(ai.heroId, dice, oracleStateFor(ai, human))
  if (cands.length === 0) return { abilityName: null, incomingDamage: 0, defendable: false }
  const name = cands.length === 1 ? cands[0].name : g.ai.chooseAbility(g.state, g.aiIdx, cands)
  const c = cands.find(x => x.name === name) ?? cands[0]
  return { abilityName: name, incomingDamage: c.baseDamage ?? 0, defendable: c.defendable ?? true }
}

// Step 1: run upkeep -> income -> main1 -> offensive roll -> (AI's) alter window, then stash the
// attack. Returns { done:true } if the AI's turn ended before any attack (game over on upkeep).
export function runAiTurnUpToAttack(g: HumanGame): { done: boolean; attack?: AiAttackInfo } {
  if (g.state.gameOver) return { done: true }
  g.state.turnNumber += 1
  playUpkeepPhase(g.state, g.aiIdx, g.rng, g.ai)
  if (checkGameOver(g.state)) return { done: true }
  playIncomePhase(g.state, g.aiIdx, g.rng)
  playMainPhase(g.state, g.aiIdx, 'main1', order(g, g.ai, passPolicy), g.rng)
  const dice = playOffensiveRollPhase(g.state, g.aiIdx, g.rng, g.ai)
  const finalDice = resolveOffensiveAlterWindow(g.state, g.aiIdx, dice, g.rng, order(g, g.ai, passPolicy))
  const savedRng = (g.rng as StatefulRNG).state
  const attack = computeAttackInfo(g, finalDice)
  g.def = { finalDice, savedRng, script: [], attack }
  return { done: false, attack }
}

// Step 2/3: probe the human's next defense decision (null if none left — undefendable, whiff, or
// the human has no legal option / has passed everything). Resolves the attack on a CLONE.
export function nextDefenseDecision(g: HumanGame): DefensePrompt | null {
  const d = g.def
  if (!d) return null
  const clone = structuredClone({ ...g.state, log: [] }) as GameState
  const cloneRng = mulberry32Stateful(0)
  cloneRng.state = d.savedRng
  const probe: { captured: DefensePrompt | null } = { captured: null }
  resolveAbilityPhase(clone, g.aiIdx, d.finalDice, cloneRng, order(g, g.ai, defensePolicy(d.script, probe)))
  return probe.captured
}

// The human picked a defensive action (a card / instant from a DefensePrompt's options). Record it;
// the caller then re-probes. (Pass = "stop defending" → caller skips straight to resolveAiAttack.)
export function chooseDefense(g: HumanGame, action: WindowAction): void {
  if (g.def) g.def.script.push(action)
}

// Step 4: resolve the attack for real on the actual state with the human's recorded script. The
// game rng is still at the snapshot (probes used clone rngs), so this reproduces the last probe.
export function resolveAiAttack(g: HumanGame): void {
  const d = g.def
  if (!d) return
  resolveAbilityPhase(g.state, g.aiIdx, d.finalDice, g.rng, order(g, g.ai, defensePolicy(d.script)))
}

// The AI's Main Phase 2 -> discard -> end of turn, then priority returns to the human.
export function finishAiTurn(g: HumanGame): void {
  if (!checkGameOver(g.state)) {
    playMainPhase(g.state, g.aiIdx, 'main2', order(g, g.ai, passPolicy), g.rng)
    playDiscardPhase(g.state, g.aiIdx, g.ai)
    playEndOfTurn(g.state, g.aiIdx)
  }
  g.def = undefined
  g.state.activePlayerIdx = g.humanIdx
}
