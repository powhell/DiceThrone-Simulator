// Pure(ish) turn/phase step functions — see rng.ts for the "RNG threaded as an argument,
// never Math.random() directly" convention that keeps a (seed, policies) pair reproducible.
import type { GameState, PlayerState, HeroId, TokenKind, TransferableToken, TimeBombPosition, Phase, WindowAction, WindowContext } from './types.js'
import { hasHead, TRANSFERABLE_TOKENS, countToken } from './tokens.js'
import { resolveResponseWindow } from './decision.js'
import type { HHState } from '../characters/horseman/config.js'
import type { BWState } from '../characters/black_widow/config.js'
import type { FMState } from '../characters/forgemaster/config.js'
import type { RNG } from './rng.js'
import { shuffle, rollDie } from './rng.js'
import type { Policy, RollManipulationChoice } from './policy.js'
import type { RollStep, RollStepUpdate } from './oracle.js'
import { runOffensiveRoll } from './oracle.js'
import { resolveMatchedAbilities } from './ability-resolver.js'
import type { CardTemplate, HeroTemplate } from './data/schema.js'
import { heroTemplateFor, resolvedAbilityByBoardName, cardById } from './data/load.js'
import * as hh from './hero/hh.rules.js'
import * as bw from './hero/bw.rules.js'
import * as fm from './hero/fm.rules.js'
import * as nx from './hero/nx.rules.js'
import { CP_INCOME_PER_TURN, MAX_HAND_SIZE } from './data/config.js'
import { grantCp } from './cp.js'

function log(state: GameState, playerIdx: 0 | 1, phase: Phase, message: string): void {
  state.log.push({ turn: state.turnNumber, playerIdx, phase, message })
}

// Exported for the interactive UI driver (interactive.ts) and the RL roll-manipulation scorer
// (valueGreedyPolicy), which rolls a candidate's modified dice forward via completeOffensiveRoll.
// Perte moyenne d'une attaque DEFENDABLE contre CET adversaire, dans SON etat actuel :
// prevention attendue + contre-degats attendus de sa defense (esperances des regles
// verifiees, voir calibration/analysis_data.json). C'est la prime des attaques
// indefendables (user-caught : Reap/Horrify/ults n'etaient pas creditees).
export function defenseTaxFor(opponent: PlayerState): number {
  if (opponent.heroId === 'bw') {
    // Sabotage 3 des : contre 1.5, prevenus 0.5 (Sabotage II, 4 des : 2.0 / 0.67)
    return opponent.upgradesInPlay.includes('sabotage-ii') ? 2.67 : 2.0
  }
  if (opponent.heroId === 'nx') {
    // Dragon Scales : E[prevention] = (1 + 4x3 + 5)/6 = 3.0 (aucun contre-degat)
    return 3.0
  }
  if (opponent.heroId === 'hh') {
    // Hallowed Reckoning : min(1+Dreadful, 5) des - contre 0.5/de, prevenus E[floor(B/2)]
    const dice = Math.min(1 + opponent.tokens.dreadful, 5)
    const PREV = [0, 0, 0.11, 0.26, 0.42, 0.58]
    return 0.5 * dice + PREV[dice]
  }
  // fm : contre casque + prevention bouclier, x1.33 pour le doublement Masterwork attendu
  const HELM = [0, 1, 2, 3], SHIELD = [0, 1, 2, 2]
  return (HELM[opponent.armor.helmet] + SHIELD[opponent.armor.shield]) * 1.33
}

export function oracleStateFor(player: PlayerState, opponent: PlayerState): HHState | BWState | FMState {
  if (player.heroId === 'hh') {
    const t = player.tokens
    return { dreadful: t.dreadful, hasHead: t.head > 0, upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent) }
  }
  if (player.heroId === 'fm') {
    return { armorCount: fm.armorCount(player), upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent) }
  }
  // opponent.timeBombs is on PlayerState directly (Time Bomb is hero-agnostic — it's
  // inflicted BY Black Widow but stacks on whichever opponent she's hitting).
  return { upgrades: player.upgradesInPlay.length, tbOnOpp: opponent.timeBombs.length, upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent) }
}

export function checkGameOver(state: GameState): boolean {
  const [p0, p1] = state.players
  // Mutual kill = draw (Advanced Rules, DRP6 note: "If all remaining players are simultaneously
  // reduced to 0 health, the game is a draw"). winner stays null for a draw, so gameOver is what
  // makes it terminal (loops gate on !gameOver, never on winner === null — see types.ts).
  if (p0.hp <= 0 && p1.hp <= 0) { state.winner = null; state.gameOver = true; return true }
  if (p0.hp <= 0) { state.winner = 1; state.gameOver = true; return true }
  if (p1.hp <= 0) { state.winner = 0; state.gameOver = true; return true }
  return false
}

// Golden Rule #4 (Advanced Rules): an attack's damage is accumulated and applied SIMULTANEOUSLY
// at the conclusion of its resolution — so an Attack and the Defender's counter-damage that are
// BOTH lethal resolve as a mutual kill (a draw), not "whoever's hp was subtracted first wins".
// queueDamage accumulates onto state.pendingDamage; flushDamage applies it all at once at the end
// of the attack-resolution unit (resolveDefense, or the undefendable branches of applyHHAbility/
// applyBWAbility). Single-source damage that can never co-occur with a counter-source (Terrorize
// and Time-Bomb upkeep — mutually exclusive hero branches; Main-Phase action cards) stays inline.
function queueDamage(state: GameState, targetIdx: 0 | 1, amount: number): void {
  if (amount > 0) state.pendingDamage[targetIdx] += amount
}

function flushDamage(state: GameState): void {
  state.players[0].hp -= state.pendingDamage[0]
  state.players[1].hp -= state.pendingDamage[1]
  state.pendingDamage = [0, 0]
}

// DRP6: conclude a Defensive Roll Phase. Queues the defender's still-unprevented damage (held in
// state.pendingAttack, whittled by the DRP5 window) alongside any counter-damage already queued
// during the defense roll, then applies it all SIMULTANEOUSLY (Golden Rule #4). Exported because
// the RL policy replays it on a clone to score defensive-card options — those only reduce
// pendingAttack.remaining, so the HP payoff isn't visible until this runs. Clears pendingAttack;
// a no-op flush is fine when pendingAttack is null.
export function finalizePendingAttackDamage(state: GameState): void {
  const pa = state.pendingAttack
  if (pa) {
    queueDamage(state, pa.defenderIdx, pa.remaining)
    state.pendingAttack = null
  }
  flushDamage(state)
}

export function playUpkeepPhase(state: GameState, playerIdx: 0 | 1, rng: RNG, policy: Policy): void {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  self.upgradesPlayedThisTurn = 0
  self.grimPursuitBonusUsedThisTurn = false
  self.covertOpsUsedThisTurn = false
  self.grimPursuitRerollUsedThisTurn = false
  self.minesDrawUsedThisTurn = false
  self.hoardedDice = 0

  if (self.heroId === 'hh') {
    const eligible = hh.canTerrorize(self)
    const choice = policy.chooseHeadlessMayhem(state, playerIdx, eligible)
    if (choice === 'terrorize' && eligible) {
      // resolveTerrorize sets self.head = 1; the head is unique, so reclaiming it must also
      // clear the opponent's copy (they may be holding it after a giveHead / Rolling Pumpkin!).
      opp.tokens.head = 0
      const r = hh.resolveTerrorize(self)
      opp.hp -= r.damageToOpponent
      log(state, playerIdx, 'upkeep', `Terrorize: ${r.damageToOpponent} dmg to opponent, +${r.cpGained} CP, reclaimed Head`)
    } else if (choice === 'giveHead') {
      // Bug fixed 2026-07-04 (user report: "the head goes to the opponent but no token shows"):
      // this cleared self.head without ever GIVING it — the head vanished from the game, so
      // "opponent holds the Head" effects (Cranial Assist!, the head feature the network sees)
      // could never trigger.
      self.tokens.head = 0
      opp.tokens.head = 1
      log(state, playerIdx, 'upkeep', 'Gave the Haunted Head to the opponent')
    }
  }

  if (self.heroId === 'fm') {
    // The Mines (vérifié board): "During your Upkeep Phase, you may Mine your deck." Le choix
    // (révéler quel Ore / ne rien révéler pour +1 CP / ne pas miner) passe par le hook optionnel
    // chooseFmMine — défaut : miner et révéler le meilleur Ore (jamais préférer le CP).
    // TODO(user): le "3 CP -> pioche 1, 1x/tour" n'est pas encore modélisé.
    const top3 = fm.minePeek(self)
    const choice = policy.chooseFmMine?.(state, playerIdx, top3)
    if (choice?.kind === 'skip') {
      log(state, playerIdx, 'upkeep', 'The Mines: chose not to mine')
    } else {
      const r = choice?.kind === 'cp' ? fm.mineResolve(self, [])
        : choice?.kind === 'reveal' ? fm.mineResolve(self, [choice.oreId])
        : fm.mine(self)
      log(state, playerIdx, 'upkeep', `The Mines: mined — ${r.revealed.length ? `revealed ${r.revealed.join(',')} to The Forge` : `no reveal, +${r.cpGained} CP`}`)
    }
  }

  // Time Bombs tick at the start of ANY carrier's turn, whatever their hero. They're inflicted on
  // the OPPONENT, so the carrier is usually NOT the BW who placed them (e.g. an HH victim). This
  // used to be nested in a BW-only else branch, so bombs sitting on an HH player never ticked —
  // placed and forgotten. Now hero-independent. Empty timeBombs -> no roll, so heroes never hit by
  // a bomb (e.g. HH vs HH) are unaffected. tickTimeBombsUpkeep applies its own undefendable
  // self-damage; playTurn's checkGameOver right after this catches a lethal detonation.
  const tb = bw.tickTimeBombsUpkeep(self, rng)
  // Logged whenever ANY bomb rolled — the old guard (only damage/defuse) silenced the most
  // common outcome, a plain ADVANCE: the player never saw his bomb roll (reported 3 times).
  if (tb.rolls.length > 0) {
    log(state, playerIdx, 'upkeep', `Time Bomb upkeep: rolls [${tb.rolls.join(',')}], ${tb.selfDamage} self-dmg, ${tb.defused} defused`)
  }
}

// Verified (official rulebook, Income Phase): gain 1 CP (capped at 15) and draw 1 card from
// the deck (reshuffling the discard pile into a fresh deck if it runs out). The Start Player
// skips their first Income Phase entirely (no CP, no draw) — that's always player 0's turn 1,
// since match.ts always gives the first turn to player 0.
export function playIncomePhase(state: GameState, playerIdx: 0 | 1, rng: RNG): void {
  // Mode boss (planche verifiee) : le Start Player ne saute PAS son income, Naraxus joue premier.
  const bossMode = state.players.some(p => p.heroId === 'nx')
  if (!bossMode && playerIdx === 0 && state.turnNumber === 1) {
    log(state, playerIdx, 'income', 'Start Player skips their first Income Phase')
    return
  }
  const self = state.players[playerIdx]
  grantCp(self, CP_INCOME_PER_TURN)
  drawCards(self, 1, rng)
  log(state, playerIdx, 'income', `+${CP_INCOME_PER_TURN} CP, drew 1 card (hand=${self.hand.length})`)
}

export function drawCards(self: PlayerState, count: number, rng: RNG): void {
  for (let i = 0; i < count; i++) {
    if (self.deck.length === 0) {
      if (self.discard.length === 0) return
      self.deck = shuffle(self.discard, rng)
      self.discard = []
    }
    self.hand.push(self.deck.shift()!)
  }
}

// Verified (official rulebook, Discard Phase): sell cards from hand until at or below
// MAX_HAND_SIZE, +1 CP per card sold regardless of its play cost. No other actions are legal
// during this phase.
export function playDiscardPhase(state: GameState, playerIdx: 0 | 1, policy: Policy): void {
  const self = state.players[playerIdx]
  const toSell = policy.chooseCardsToDiscard(state, playerIdx, MAX_HAND_SIZE)
  for (const cardId of toSell) {
    const idx = self.hand.indexOf(cardId)
    if (idx === -1) continue
    self.hand.splice(idx, 1)
    self.discard.push(cardId)
    grantCp(self, 1)
  }
  if (toSell.length > 0) {
    log(state, playerIdx, 'discard', `Sold ${toSell.length} card(s) for +${toSell.length} CP (hand=${self.hand.length})`)
  }
}

// Dispatches a card id from `chooseMainPhaseCards`/`chooseMidRollCards` to the mechanical
// effect (CP cost, hand/upgradesInPlay/discard movement). See CardTemplate.actionTiming and
// .upgradeSlot in schema.ts for the rules this implements (verified official rulebook,
// characters/rules/{Hero Upgrades,Action Cards}.png, 2026-07-01).
export function playCard(state: GameState, playerIdx: 0 | 1, phase: Phase, cardId: string, rng: RNG): void {
  const self = state.players[playerIdx]
  if (!self.hand.includes(cardId)) {
    log(state, playerIdx, phase, `Card "${cardId}" not in hand, skipped`)
    return
  }
  const hero = heroTemplateFor(self.heroId)
  const card = cardById(hero, cardId)
  if (!card) {
    log(state, playerIdx, phase, `Unknown card "${cardId}", skipped`)
    return
  }
  if (!isCardPlayableNow(card, phase, self.heroId)) {
    log(state, playerIdx, phase, `TODO(user): ${card.name} (${card.actionTiming ?? 'Roll Phase Action, dice manipulation'}) not wired for phase "${phase}" — skipped`)
    return
  }

  if (card.kind === 'upgrade') playUpgradeCard(state, playerIdx, phase, card, hero, rng)
  else playActionCard(state, playerIdx, phase, card, rng)
}

// Hero Upgrade cards are only playable during Main Phase (1) or (2) — except for Black
// Widow, whose Red Room Training passive lets her play them during any Roll Phase too.
// Instant Action cards are technically legal "at any time" per the rulebook; this engine
// only offers them at the same decision points (Main Phase, and Roll Phase for bw) rather
// than modeling true interrupt timing (TODO(user)). Main Phase Action cards are restricted
// to Main Phase (1)/(2). Roll Phase Action cards (dice manipulation, extra rolls, attack
// modifiers, "play after being Attacked" prevention) never go through this dispatcher at all —
// they're offered directly by their own decision points (oracle.ts's beforeReroll hook via
// eligibleRollManipulationCardIds/applyRollManipulationCard, applyAttackModifiers, and
// resolveDefense's eligibleDefensiveCardIds/applyDefensiveCard). Not yet wired: Helping Hand!
// (needs opponent-interrupt timing, same not-yet-modeled category as Instant Action cards
// above) and Better D! (needs a "Defensive Roll Phase" reroll step that doesn't exist —
// defense here is a single deterministic dice roll, see resolveDefense).
function isCardPlayableNow(card: CardTemplate, phase: Phase, heroId: HeroId): boolean {
  if (card.kind === 'upgrade') return phase === 'main1' || phase === 'main2' || (phase === 'roll' && heroId === 'bw')
  if (card.actionTiming === 'instant') return true
  if (card.actionTiming === 'mainPhase') return phase === 'main1' || phase === 'main2'
  return false
}

// Moves an upgrade from hand into play, replacing any card already in its slot (level II over base).
// Returns the replaced card's id (if any). Shared by the CP path and the free Covert Ops path.
function placeUpgradeIntoPlay(self: PlayerState, card: CardTemplate, hero: HeroTemplate): string | undefined {
  const existingId = self.upgradesInPlay.find(id => cardById(hero, id)?.upgradeSlot === card.upgradeSlot)
  self.hand.splice(self.hand.indexOf(card.id), 1)
  if (existingId) self.upgradesInPlay = self.upgradesInPlay.filter(id => id !== existingId)
  self.upgradesInPlay.push(card.id)
  self.upgradesPlayedThisTurn += 1
  return existingId
}

// Red Room Training II (texte vérifié) : "Whenever you play an Ability Upgrade card, draw 1
// (excluding this card)". Jamais câblé avant (user-caught). Appelé par les DEUX chemins de
// pose (CP et Covert Ops), APRÈS placeUpgradeIntoPlay — donc poser RRT II lui-même ne pioche
// pas (la carte s'exclut), mais tout upgrade suivant si.
function rrtIIDrawOnUpgrade(state: GameState, playerIdx: 0 | 1, playedCardId: string, rng: RNG): void {
  const self = state.players[playerIdx]
  if (playedCardId === 'red-room-training-ii') return
  if (!self.upgradesInPlay.includes('red-room-training-ii')) return
  drawCards(self, 1, rng)
  log(state, playerIdx, 'main1', 'Red Room Training II: drew 1 (upgrade played)')
}

function playUpgradeCard(state: GameState, playerIdx: 0 | 1, phase: Phase, card: CardTemplate, hero: HeroTemplate, rng: RNG): void {
  const self = state.players[playerIdx]
  if (!card.upgradeSlot) {
    log(state, playerIdx, phase, `TODO(user): ${card.name} has no upgradeSlot data yet, skipped`)
    return
  }
  // Verified rulebook: upgrading an already-upgraded slot (e.g. level II -> III) only costs
  // the difference in CP, and replaces the old card in upgradesInPlay (not a second copy).
  const existingId = self.upgradesInPlay.find(id => cardById(hero, id)?.upgradeSlot === card.upgradeSlot)
  const existingCard = existingId ? cardById(hero, existingId) : undefined
  const fullCost = card.cpCost ?? 0
  const cost = existingCard ? Math.max(0, fullCost - (existingCard.cpCost ?? 0)) : fullCost
  if (self.cp < cost) {
    log(state, playerIdx, phase, `Not enough CP to play ${card.name} (needs ${cost}, have ${self.cp})`)
    return
  }
  self.cp -= cost
  placeUpgradeIntoPlay(self, card, hero)
  rrtIIDrawOnUpgrade(state, playerIdx, card.id, rng)
  log(state, playerIdx, phase, `Played upgrade ${card.name} for ${cost} CP${existingCard ? ` (upgraded from ${existingCard.name})` : ''}`)
}

// Covert Ops (Black Widow, verified token def): "Spend once per turn during your Main Phase to put
// an Ability Upgrade from your hand into play" — for FREE (no CP). This is BW's ramp engine toward
// the 4-upgrade (Sabotage reroll) and 5-upgrade (+1 dmg to all Attacks) power thresholds. Guarded so
// an illegal call (no token, already used this turn, card no longer in hand) is a harmless no-op.
function applyCovertOpsUpgrade(state: GameState, playerIdx: 0 | 1, cardId: string): void {
  const self = state.players[playerIdx]
  const hero = heroTemplateFor(self.heroId)
  const card = cardById(hero, cardId)
  if (!card || card.kind !== 'upgrade' || !card.upgradeSlot) return
  if (self.tokens.covertOps <= 0 || self.covertOpsUsedThisTurn || !self.hand.includes(cardId)) return
  self.tokens.covertOps -= 1
  self.covertOpsUsedThisTurn = true
  const existingId = placeUpgradeIntoPlay(self, card, hero)
  log(state, playerIdx, 'main1', `Covert Ops: put ${card.name} into play free${existingId ? ` (upgraded from ${cardById(hero, existingId)?.name})` : ''}`)
}

function grantTokenToSelf(self: PlayerState, kind: TokenKind, amount: number): void {
  switch (kind) {
    case 'dreadful': hh.grantDreadful(self, amount); break
    case 'grimPursuit': hh.grantGrimPursuit(self, amount); break
    case 'agility': bw.grantAgility(self, amount); break
    case 'covertOps': bw.grantCovertOps(self, amount); break
    case 'timeBomb': break // no current card data grants Time Bomb to oneself
  }
}

function playActionCard(state: GameState, playerIdx: 0 | 1, phase: Phase, card: CardTemplate, rng: RNG): void {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const cost = card.cpCost ?? 0
  if (self.cp < cost) {
    log(state, playerIdx, phase, `Not enough CP to play ${card.name} (needs ${cost}, have ${self.cp})`)
    return
  }
  self.cp -= cost
  self.hand.splice(self.hand.indexOf(card.id), 1)
  self.discard.push(card.id)

  // Self-buff Action cards whose effect is conditional/random rather than a plain structured grant.
  if (card.id === 'dancing-pumpkin') {
    if (hasHead(self)) { hh.grantDreadful(self, 2); log(state, playerIdx, phase, 'Dancing Pumpkin!: +2 Dreadful (Haunted Head)') }
    else { hh.grantGrimPursuit(self, 2); log(state, playerIdx, phase, 'Dancing Pumpkin!: +2 Grim Pursuit') }
    return
  }
  if (card.id === 'vegas-baby') {
    const v = rollDie(rng)
    const gain = Math.ceil(v / 2)
    grantCp(self, gain)
    log(state, playerIdx, phase, `Vegas Baby!: rolled ${v}, +${gain} CP`)
    return
  }
  if (card.id === 'undercover-mission') {
    // "A chosen opponent gains Time Bomb. If you have >=4 Ability Upgrades in play, gain Agility."
    const n = bw.inflictTimeBomb(opp, self.upgradesInPlay.length, 1)
    const gotAgility = self.upgradesInPlay.length >= 4
    if (gotAgility) bw.grantAgility(self, 1)
    log(state, playerIdx, phase, `Undercover Mission!: ${n} Time Bomb inflicted${gotAgility ? ', +1 Agility (>=4 upgrades)' : ''}`)
    return
  }
  if (card.id === 'cunning') {
    // "Look at the top 5 cards of your deck. Reveal all Ability Upgrades to your opponent and add
    // them to your hand. Put all remaining cards back in any order." No decision (takes ALL
    // upgrades); "reveal to opponent" has no mechanical effect in this 1v1 (no hidden info modeled).
    // The remaining non-upgrades go back on top (any order is legal — we keep their relative order).
    const heroT = heroTemplateFor(self.heroId)
    const top = self.deck.slice(0, 5)
    const upgrades = top.filter(id => cardById(heroT, id)?.kind === 'upgrade')
    const rest = top.filter(id => cardById(heroT, id)?.kind !== 'upgrade')
    self.hand.push(...upgrades)
    self.deck = [...rest, ...self.deck.slice(5)]
    log(state, playerIdx, phase, `Cunning!: took ${upgrades.length} Ability Upgrade(s) to hand from the top 5`)
    return
  }

  const eff = card.effect
  if (!eff) {
    log(state, playerIdx, phase, `Played ${card.name} for ${cost} CP — TODO(user): effect not structured yet, no game-state change applied`)
    return
  }

  const parts: string[] = []
  if (eff.cpGain) { grantCp(self, eff.cpGain); parts.push(`+${eff.cpGain} CP`) }
  if (eff.cardDraw) { drawCards(self, eff.cardDraw, rng); parts.push(`drew ${eff.cardDraw}`) }
  if (eff.damage) { opp.hp -= eff.damage; parts.push(`${eff.damage} dmg to opponent`) }
  if (eff.tokensGrantedToSelf) {
    for (const [kind, amount] of Object.entries(eff.tokensGrantedToSelf)) {
      if (amount) { grantTokenToSelf(self, kind as TokenKind, amount); parts.push(`+${amount} ${kind}`) }
    }
  }
  if (eff.tokensInflictedOnOpponent?.timeBomb && self.heroId === 'bw') {
    const n = bw.inflictTimeBomb(opp, self.upgradesInPlay.length, eff.tokensInflictedOnOpponent.timeBomb)
    if (n > 0) parts.push(`${n} TB inflicted`)
  }
  log(state, playerIdx, phase, `Played ${card.name} for ${cost} CP (${parts.length > 0 ? parts.join(', ') : 'no effect'})`)
}

export function playOffensiveRollPhase(state: GameState, playerIdx: 0 | 1, rng: RNG, policy: Policy): number[] {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]

  const beforeReroll = (step: RollStep): RollStepUpdate => {
    if (self.heroId === 'bw') {
      const cardIds = policy.chooseMidRollCards(state, playerIdx, step.dice, step.rollsRemaining)
      for (const id of cardIds) playCard(state, playerIdx, 'roll', id, rng)
    }

    let dice = step.dice
    let extraRollsGranted = 0
    const eligible = eligibleRollManipulationCardIds(self)
    if (eligible.length > 0) {
      const choices = policy.chooseRollManipulationCards(state, playerIdx, dice, step.rollsRemaining, eligible)
      for (const choice of choices) {
        const r = applyRollManipulationCard(state, playerIdx, choice, dice, rng)
        dice = r.dice
        extraRollsGranted += r.extraRollsGranted
      }
    }

    // Grim Pursuit mode (a) (verified token def): spend 1 to perform an additional Roll
    // Attempt, once per turn. Offered at the FINAL window (rollsRemaining 0 — the roll is
    // otherwise over), the only moment the choice is informative.
    if (
      step.rollsRemaining === 0 && self.heroId === 'hh' && self.tokens.grimPursuit >= 1
      && !self.grimPursuitRerollUsedThisTurn
      && policy.chooseGrimPursuitReroll?.(state, playerIdx, dice)
    ) {
      hh.spendGrimPursuit(self, 1)
      self.grimPursuitRerollUsedThisTurn = true
      extraRollsGranted += 1
      log(state, playerIdx, 'roll', 'Grim Pursuit (mode a): +1 additional Roll Attempt')
    }

    return { oracleState: oracleStateFor(self, opp), dice, extraRollsGranted }
  }

  const finalDice = runOffensiveRoll(self.heroId, oracleStateFor(self, opp), rng, beforeReroll)
  log(state, playerIdx, 'roll', `Final dice: ${finalDice.join(',')}`)
  return finalDice
}

// ORP2: after the Offensive Roll, the rules open a response window to alter the just-rolled dice
// BEFORE an ability is matched — the opponent may break the roller's combo (Helping Hand! reroll,
// Tip It! ±1) and either player may Tip It!. Returns the (possibly altered) dice; the caller feeds
// them to resolveAbilityPhase, so the roller re-decides on whatever the dice became (the engine's
// re-match). Active player (the roller) has priority. The oracle already exhausted the roller's
// Roll Attempts, so "re-decide" here means re-match an ability, not re-roll — noted as a known
// simplification (a resumable offensive roll for post-alteration re-rolls is future work).
export function resolveOffensiveAlterWindow(state: GameState, rollerIdx: 0 | 1, dice: number[], rng: RNG, policies: [Policy, Policy]): number[] {
  const oppIdx = (1 - rollerIdx) as 0 | 1
  state.pendingRoll = { rollerIdx, dice: [...dice] }
  resolveResponseWindow(state, [rollerIdx, oppIdx], { windowType: 'offensiveRoll' }, rng, policies, enumerateWindowActions, applyWindowAction)
  const finalDice = state.pendingRoll.dice
  state.pendingRoll = null
  if (finalDice.join(',') !== dice.join(',')) log(state, rollerIdx, 'roll', `Dice after alteration: ${finalDice.join(',')}`)
  return finalDice
}

// Roll Phase Action cards that directly manipulate the roller's own dice mid-roll. Helping
// Hand! ("force an opponent to re-roll one of their dice") and Better D! ("additional Roll
// Attempt during your Defensive Roll Phase") are NOT included — both need timing/interrupt
// infrastructure this engine doesn't have yet (Helping Hand! is played by the OPPONENT of
// whoever is currently rolling, the same not-yet-modeled cross-player interrupt category as
// "instant" cards per isCardPlayableNow's TODO; Better D! needs a "Defensive Roll Phase" with
// its own keep/reroll decision, but defense here is a single deterministic dice roll with no
// reroll step at all — see resolveDefense/hh.resolveHallowedReckoning/bw.resolveSabotage).
const ROLL_MANIPULATION_CARD_IDS = ['one-more-time', 'try-try-again', 'six-it', 'so-wild', 'twice-as-wild', 'samesies']

function eligibleRollManipulationCardIds(self: PlayerState): string[] {
  const hero = heroTemplateFor(self.heroId)
  return ROLL_MANIPULATION_CARD_IDS.filter(id => self.hand.includes(id) && self.cp >= (cardById(hero, id)?.cpCost ?? 0))
}

// Exported for the RL policy's roll-manipulation scorer (valueGreedyPolicy), which replays a
// candidate card play on a cloned state before rolling the modified dice forward.
export function applyRollManipulationCard(
  state: GameState, playerIdx: 0 | 1, choice: RollManipulationChoice, dice: number[], rng: RNG,
): { dice: number[]; extraRollsGranted: number } {
  const self = state.players[playerIdx]
  const hero = heroTemplateFor(self.heroId)
  const card = cardById(hero, choice.cardId)
  if (!card || !self.hand.includes(choice.cardId) || self.cp < (card.cpCost ?? 0)) return { dice, extraRollsGranted: 0 }
  self.cp -= card.cpCost ?? 0
  self.hand.splice(self.hand.indexOf(choice.cardId), 1)
  self.discard.push(choice.cardId)

  if (choice.cardId === 'one-more-time') {
    log(state, playerIdx, 'roll', 'One More Time!: +1 additional Roll Attempt')
    return { dice, extraRollsGranted: 1 }
  }

  const newDice = dice.slice()
  const indices = choice.dieIndices ?? []
  if (choice.cardId === 'try-try-again') {
    for (const i of indices) newDice[i] = rollDie(rng)
    log(state, playerIdx, 'roll', `Try, Try Again!: rerolled ${indices.length} dice`)
    return { dice: newDice, extraRollsGranted: 0 }
  }

  // six-it / so-wild / twice-as-wild / samesies: direct value sets (Policy already resolved
  // Samesies!'s "match another die" into a concrete value in `values`).
  const values = choice.values ?? []
  indices.forEach((i, k) => { newDice[i] = values[k] })
  log(state, playerIdx, 'roll', `${card.name}: set ${indices.length} dice to [${values.join(',')}]`)
  return { dice: newDice, extraRollsGranted: 0 }
}

// Main Phase card play is now a response window (plan Stage 2). Single participant for now — the
// active player only (Main Phase Actions/Upgrades are your-turn-only). When the interrupt layer
// lands (later stages), the opponent's Instant-Action interrupts become extra participants here
// without changing this call site. Behaviour matches the old chooseMainPhaseCards for greedy:
// the window re-enumerates after each play, so every affordable upgrade still gets played.
export function playMainPhase(state: GameState, playerIdx: 0 | 1, phase: 'main1' | 'main2', policies: [Policy, Policy], rng: RNG): void {
  // Two participants now: the active player (upgrades/Main-Phase Actions/cross-player cards) and the
  // opponent, present to interrupt with Instant Actions. The opponent only ever gets Instant/pass
  // options here (enumerateWindowActions gates the turn-only plays on state.activePlayerIdx), so a
  // scripted greedy opponent just passes — behaviour for greedy is unchanged.
  const oppIdx = (1 - playerIdx) as 0 | 1
  const self = state.players[playerIdx]
  if (self.heroId === 'fm') {
    // The Forge (vérifié board): "During your Main Phase, you may place any number of ORE from
    // your hand on to this Passive Ability." v1 auto : tout Ore en main va sur la Forge (en main
    // il est mort — ni jouable ni utile, sauf vente à 1 CP que l'heuristique ne préfère jamais).
    const ores = self.hand.filter(fm.isOre)
    if (ores.length) {
      self.hand = self.hand.filter(id => !fm.isOre(id))
      self.forge.push(...ores)
      log(state, playerIdx, phase, `The Forge: placed ${ores.join(',')} from hand`)
    }
    // Crafting (vérifié Forging Info Card) : v1 auto-greedy, crafte tant qu'un blueprint passe.
    // TODO(user): décision de Policy (craft vs garder l'Ore pour le Scrap).
    for (let c = fm.craftOnce(self); c; c = fm.craftOnce(self)) {
      log(state, playerIdx, phase, `Crafted ${c.armorId} (tier ${c.tier} ${c.slot})`)
    }
  }
  resolveResponseWindow(state, [playerIdx, oppIdx], { windowType: 'mainPhase', phase }, rng, policies, enumerateWindowActions, applyWindowAction)
}

// Instant Action self-buffs: structured-effect cards a player may play in ANY window to help
// themselves (hero-gated automatically — dark-surprise is HH's, assemble is BW's; the rest common).
const INSTANT_SELFBUFF_IDS = ['getting-paid', 'double-up', 'triple-up', 'dark-surprise', 'assemble']
// Main Phase Action cards (not Instant-timed, so only in your own Main Phase), other than the
// cross-player status cards (handled separately) and Hero Upgrades: Dancing Pumpkin! (HH), Vegas
// Baby!, Undercover Mission! + Cunning! (BW). All resolve via playActionCard.
const MAIN_PHASE_ACTION_IDS = ['dancing-pumpkin', 'vegas-baby', 'undercover-mission', 'cunning']

// Whether either player currently holds any transferable status effect (for gating What Status
// Effects? / the head-move enumeration).
function anyoneHasHead(state: GameState): boolean {
  return state.players[0].tokens.head > 0 || state.players[1].tokens.head > 0
}
function hasAnyTransferable(p: PlayerState): boolean {
  return TRANSFERABLE_TOKENS.some(k => countToken(p, k) > 0)
}

// Cross-player status-effect cards (Transference!, Get That Outta Here!, What Status Effects?),
// offered to the active player in their Main Phase. covertOps/head are excluded (see TRANSFERABLE_
// TOKENS / Rolling Pumpkin!). In 1v1 the "other chosen player" for a transfer is just 1 - from.
function pushCrossPlayerOptions(state: GameState, canAfford: (id: string) => boolean, options: WindowAction[]): void {
  if (canAfford('transference')) {
    for (const from of [0, 1] as const) {
      const to = (1 - from) as 0 | 1
      for (const k of TRANSFERABLE_TOKENS) {
        if (countToken(state.players[from], k) > 0) {
          options.push({ kind: 'transferToken', cardId: 'transference', tokenKind: k, fromIdx: from, toIdx: to })
        }
      }
    }
  }
  if (canAfford('get-that-outta-here')) {
    for (const t of [0, 1] as const) {
      for (const k of TRANSFERABLE_TOKENS) {
        if (countToken(state.players[t], k) > 0) {
          options.push({ kind: 'removeToken', cardId: 'get-that-outta-here', tokenKind: k, targetIdx: t })
        }
      }
    }
  }
  if (canAfford('what-status-effects')) {
    for (const t of [0, 1] as const) {
      if (hasAnyTransferable(state.players[t])) options.push({ kind: 'removeAllTokens', cardId: 'what-status-effects', targetIdx: t })
    }
  }
}

// So Wild! (set 1 die to any value) / Twice As Wild! (set 2 dice) — either player may set the
// roller's in-progress dice to any value (user-confirmed "any die" includes the opponent's). Each
// card is one WindowAction carrying its full set of (dieIndex, value) assignments.
function pushSetDieOptions(dice: number[], canAfford: (id: string) => boolean, options: WindowAction[]): void {
  const values = [1, 2, 3, 4, 5, 6]
  // No-op assignments (setting a die to the value it already shows) waste the card for nothing:
  // never enumerate them (they flooded the UI and the RL scoring alike — user-reported the
  // "dé 1 (1→1)" buttons burying the useful Twice As Wild! combos).
  if (canAfford('so-wild')) {
    dice.forEach((cur, i) => { for (const v of values) if (v !== cur) options.push({ kind: 'setDie', cardId: 'so-wild', sets: [{ dieIndex: i, value: v }] }) })
  }
  if (canAfford('twice-as-wild')) {
    for (let i = 0; i < dice.length; i++) {
      for (let j = i + 1; j < dice.length; j++) {
        for (const vi of values) for (const vj of values) {
          if (vi === dice[i] && vj === dice[j]) continue // both unchanged = pure waste
          options.push({ kind: 'setDie', cardId: 'twice-as-wild', sets: [{ dieIndex: i, value: vi }, { dieIndex: j, value: vj }] })
        }
      }
    }
  }
}

// Legal actions offered in a response window. Always includes 'pass'. Instant self-buffs and Rolling
// Pumpkin! (head move) are offered in EVERY window to EVERY participant (Golden Rule: Instants
// interrupt anything). Main Phase adds the active player's Hero Upgrades + Main-Phase Actions +
// cross-player status cards. The roll windows add dice alteration (Tip It!/Helping Hand!/Better D!/
// So Wild!/Twice As Wild!). The defense window adds the defender's "after being Attacked" cards.
export function enumerateWindowActions(state: GameState, playerIdx: 0 | 1, ctx: WindowContext): WindowAction[] {
  const options: WindowAction[] = [{ kind: 'pass' }]
  const player = state.players[playerIdx]
  const hero = heroTemplateFor(player.heroId)
  const canAfford = (id: string): boolean =>
    player.hand.includes(id) && player.cp >= (cardById(hero, id)?.cpCost ?? 0)

  // Instant self-buffs — any window, any participant.
  for (const id of INSTANT_SELFBUFF_IDS) if (canAfford(id)) options.push({ kind: 'playInstant', cardId: id })
  // Rolling Pumpkin! — move the Haunted Head to a chosen player (only meaningful if a head exists).
  if (canAfford('rolling-pumpkin') && anyoneHasHead(state)) {
    for (const to of [0, 1] as const) options.push({ kind: 'moveHead', cardId: 'rolling-pumpkin', toIdx: to })
  }

  if (ctx.windowType === 'mainPhase') {
    // Hero Upgrades + Main-Phase Actions + cross-player status cards are your-turn-only (the active
    // player). The opponent, present in this window purely to interrupt with Instants, gets neither.
    if (playerIdx === state.activePlayerIdx) {
      for (const cardId of player.hand) {
        const card = cardById(hero, cardId)
        if (!card || card.kind !== 'upgrade' || card.cpCost == null) continue
        const existingId = player.upgradesInPlay.find(id => cardById(hero, id)?.upgradeSlot === card.upgradeSlot)
        const existingCost = existingId ? (cardById(hero, existingId)?.cpCost ?? 0) : 0
        const cost = Math.max(0, card.cpCost - existingCost)
        if (cost <= player.cp) options.push({ kind: 'playCard', cardId })
      }
      // Covert Ops (BW): spend 1 (once/turn) to put an upgrade into play for FREE — offered for
      // every placeable upgrade in hand, independent of CP. This is BW's upgrade-ramp engine.
      if (player.tokens.covertOps > 0 && !player.covertOpsUsedThisTurn) {
        for (const cardId of player.hand) {
          const card = cardById(hero, cardId)
          if (card?.kind === 'upgrade' && card.upgradeSlot) options.push({ kind: 'covertOpsUpgrade', cardId })
        }
        {
          options.push({ kind: 'covertOpsSearch' })
        }
      }
      for (const id of MAIN_PHASE_ACTION_IDS) if (canAfford(id)) options.push({ kind: 'playInstant', cardId: id })
      // Selling: any hand card may be sold for 1 CP during your Main Phases (user-confirmed
      // official rule — the Discard-phase sale is only the forced version of the same exchange).
      for (const cardId of player.hand) options.push({ kind: 'sellCard', cardId })
      pushCrossPlayerOptions(state, canAfford, options)
    }
  } else if (ctx.windowType === 'defense') {
    // DRP5: the defender's "after being Attacked" cards, while there's still damage to prevent.
    const pa = state.pendingAttack
    if (pa && pa.remaining > 0 && playerIdx === pa.defenderIdx) {
      for (const cardId of eligibleDefensiveCardIds(player, ctx.eludeEligible ?? false)) {
        options.push({ kind: 'playCard', cardId })
      }
    }
  } else if (ctx.windowType === 'offensiveRoll' || ctx.windowType === 'defenseRoll') {
    // ORP2 / DRP3: alter the roller's just-rolled dice (offense = attacker's dice, defense = the
    // defender's dice). Golden Rule: dice are always alterable by the opponent.
    const pr = state.pendingRoll
    if (pr) {
      // Tip It! — either player may nudge any of the roller's dice ±1.
      if (canAfford('tip-it')) {
        pr.dice.forEach((v, i) => {
          if (v < 6) options.push({ kind: 'alterDie', cardId: 'tip-it', dieIndex: i, delta: 1 })
          if (v > 1) options.push({ kind: 'alterDie', cardId: 'tip-it', dieIndex: i, delta: -1 })
        })
      }
      // Helping Hand! — only the roller's OPPONENT may force a reroll of one of the roller's dice.
      if (playerIdx !== pr.rollerIdx && canAfford('helping-hand')) {
        pr.dice.forEach((_, i) => options.push({ kind: 'rerollDie', cardId: 'helping-hand', dieIndex: i }))
      }
      // Better D! — defense roll only; the roller (defender) may reroll all their defense dice.
      if (ctx.windowType === 'defenseRoll' && playerIdx === pr.rollerIdx && canAfford('better-d')) {
        options.push({ kind: 'rerollAll', cardId: 'better-d' })
      }
      // So Wild! / Twice As Wild! — either player sets the roller's dice to chosen values.
      pushSetDieOptions(pr.dice, canAfford, options)
      // Six-It! / Samesies! / Try Try Again! — Roll Phase Actions on YOUR OWN dice, so
      // roller-only. They already fire via the roller's mid-roll hook during the OFFENSIVE
      // roll; these windows extend them to the post-roll alter windows INCLUDING the defense
      // roll (user-caught: had Samesies! + CP on a defense roll and was never offered it).
      // One More Time! stays offensive-only (its printed text; Better D! is the defense twin).
      if (playerIdx === pr.rollerIdx) {
        if (canAfford('six-it')) {
          pr.dice.forEach((v, i) => { if (v !== 6) options.push({ kind: 'setDie', cardId: 'six-it', sets: [{ dieIndex: i, value: 6 }] }) })
        }
        if (canAfford('samesies')) {
          const seen = new Set<string>()
          for (let i = 0; i < pr.dice.length; i++) {
            for (let j = 0; j < pr.dice.length; j++) {
              if (i === j || pr.dice[i] === pr.dice[j]) continue
              const key = `${i}:${pr.dice[j]}`
              if (seen.has(key)) continue
              seen.add(key)
              options.push({ kind: 'setDie', cardId: 'samesies', sets: [{ dieIndex: i, value: pr.dice[j] }] })
            }
          }
        }
        if (canAfford('try-try-again')) {
          pr.dice.forEach((_, i) => options.push({ kind: 'rerollDie', cardId: 'try-try-again', dieIndex: i }))
        }
      }
    }
  }
  return options
}

// Applies one chosen WindowAction. Shared by resolveResponseWindow (real play) and the RL policy's
// lookahead (replay-to-score in valueGreedyPolicy.decide) — one apply path, no drift. Both the
// card play (affordability re-checked by playCard/applyDefensiveCard) and the defense-window
// damage reduction (onto state.pendingAttack) route through here, so real play and scoring stay
// identical.
export function applyWindowAction(state: GameState, playerIdx: 0 | 1, action: WindowAction, ctx: WindowContext, rng: RNG): void {
  if (action.kind === 'pass') return
  if (action.kind === 'playCard') {
    if (ctx.windowType === 'defense') {
      const pa = state.pendingAttack
      if (pa) pa.remaining = applyDefensiveCard(state, pa.defenderIdx, action.cardId, pa.remaining, rng)
      return
    }
    playCard(state, playerIdx, ctx.phase ?? 'main1', action.cardId, rng)
    return
  }
  // Instant / Main-Phase self-buff (Getting Paid!, Double/Triple Up!, Dark Surprise!, Assemble!,
  // Dancing Pumpkin!, Vegas Baby!): resolve its structured effect for the player who played it.
  if (action.kind === 'playInstant') {
    const card = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId)
    if (card) playActionCard(state, playerIdx, ctx.phase ?? 'main2', card, rng)
    return
  }
  if (action.kind === 'sellCard') {
    const self = state.players[playerIdx]
    const i = self.hand.indexOf(action.cardId)
    if (i < 0) return
    self.hand.splice(i, 1)
    self.discard.push(action.cardId)
    grantCp(self, 1)
    log(state, playerIdx, ctx.phase ?? 'main1', `Sold ${action.cardId} (+1 CP)`)
    return
  }
  // Cross-player status-effect cards (mutate the generic bag / positional Time Bombs / Haunted Head).
  if (action.kind === 'transferToken') { applyTransferToken(state, playerIdx, action, rng); return }
  if (action.kind === 'removeToken') { applyRemoveToken(state, playerIdx, action); return }
  if (action.kind === 'removeAllTokens') { applyRemoveAllTokens(state, playerIdx, action); return }
  if (action.kind === 'moveHead') { applyMoveHead(state, playerIdx, action); return }
  if (action.kind === 'covertOpsUpgrade') { applyCovertOpsUpgrade(state, playerIdx, action.cardId); rrtIIDrawOnUpgrade(state, playerIdx, action.cardId, rng); return }
  if (action.kind === 'covertOpsSearch') {
    const self = state.players[playerIdx]
    if (self.tokens.covertOps < 1 || self.covertOpsUsedThisTurn) return
    self.tokens.covertOps -= 1
    self.covertOpsUsedThisTurn = true
    const hero = heroTemplateFor(self.heroId)
    const isUp = (id: string) => cardById(hero, id)?.kind === 'upgrade'
    const top3 = self.deck.slice(0, 3)
    if (top3.some(isUp)) {
      // "put them back in any order" (texte vérifié) : pas un échec sec — on remet les
      // upgrades SUR LE DESSUS (l'ordre que tout joueur choisirait : pioche au prochain tour).
      const rest = self.deck.slice(3)
      const ups = top3.filter(isUp), others = top3.filter(id => !isUp(id))
      self.deck = [...ups, ...others, ...rest]
      log(state, playerIdx, ctxPhaseless, `Covert Ops (b): top 3 contained ${ups.length} upgrade(s) — no search, put back with upgrade(s) ON TOP (${ups.join(',')})`)
    } else {
      const found = self.deck.find(isUp)
      if (found) { self.deck.splice(self.deck.indexOf(found), 1); self.hand.push(found) }
      for (let i = self.deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [self.deck[i], self.deck[j]] = [self.deck[j], self.deck[i]] }
      log(state, playerIdx, ctxPhaseless, found ? `Covert Ops (b): searched ${found} to hand, deck shuffled` : 'Covert Ops (b): no upgrade left in deck, shuffled')
    }
    return
  }
  if (action.kind === 'spendGrimPursuitBonus') return // handled in applyAttackModifiers, not a window

  // Dice-alteration actions mutate the in-progress roll on state.pendingRoll (ORP2 / DRP3).
  const pr = state.pendingRoll
  if (!pr || !spendActionCard(state, playerIdx, action.cardId)) return
  if (action.kind === 'setDie') {
    const before = pr.dice.join(',')
    for (const s of action.sets) pr.dice[s.dieIndex] = s.value
    const setDieName = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId)?.name ?? action.cardId
    log(state, playerIdx, 'roll', `${setDieName}: set dice ${before}->${pr.dice.join(',')}`)
    return
  }
  if (action.kind === 'rerollAll') {
    const before = pr.dice.join(',')
    // A Roll Attempt is "up to five dice" — dieIndices picks WHICH dice to reroll (UI die
    // selection); omitted = all of them (previous behavior, and the RL enumeration's default).
    const targets = action.dieIndices ?? pr.dice.map((_, i) => i)
    for (const i of targets) if (i >= 0 && i < pr.dice.length) pr.dice[i] = 1 + Math.floor(rng() * 6)
    log(state, playerIdx, 'roll', `Better D!: rerolled ${targets.length} dice ${before}->${pr.dice.join(',')}`)
    return
  }
  const old = pr.dice[action.dieIndex]
  if (action.kind === 'alterDie') {
    pr.dice[action.dieIndex] = Math.max(1, Math.min(6, old + action.delta))
    log(state, playerIdx, 'roll', `Tip It!: die ${action.dieIndex + 1} ${old}->${pr.dice[action.dieIndex]}`)
  } else if (action.kind === 'rerollDie') {
    pr.dice[action.dieIndex] = 1 + Math.floor(rng() * 6)
    const rerollName = cardById(heroTemplateFor(state.players[playerIdx].heroId), action.cardId)?.name ?? action.cardId
    log(state, playerIdx, 'roll', `${rerollName}: rerolled die ${action.dieIndex + 1} ${old}->${pr.dice[action.dieIndex]}`)
  }
}

// --- Cross-player status-effect helpers (Transference! / GTOH / What Status Effects? / Rolling
// Pumpkin!). Time Bomb is positional (moves/removes a TimeBombPosition); the rest are bag counts,
// granted via the hero cap helpers so stack caps are respected on the receiving side. ---------------
function grantTransferable(to: PlayerState, kind: TransferableToken, pos: TimeBombPosition | undefined): void {
  if (kind === 'timeBomb') { if (to.timeBombs.length < bw.TIME_BOMB_STACK_CAP) to.timeBombs.push(pos ?? '0:02') }
  else if (kind === 'dreadful') hh.grantDreadful(to, 1)
  else if (kind === 'grimPursuit') hh.grantGrimPursuit(to, 1)
  else bw.grantAgility(to, 1)
}
function removeTransferable(from: PlayerState, kind: TransferableToken): TimeBombPosition | undefined {
  if (kind === 'timeBomb') return from.timeBombs.pop()
  from.tokens[kind] = Math.max(0, from.tokens[kind] - 1)
  return undefined
}
function applyTransferToken(state: GameState, playerIdx: 0 | 1, action: { cardId: string; tokenKind: TransferableToken; fromIdx: 0 | 1; toIdx: 0 | 1 }, _rng: RNG): void {
  const from = state.players[action.fromIdx]
  if (countToken(from, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return
  const pos = removeTransferable(from, action.tokenKind)
  grantTransferable(state.players[action.toIdx], action.tokenKind, pos)
  log(state, playerIdx, ctxPhaseless, `Transference!: moved ${action.tokenKind} from p${action.fromIdx} to p${action.toIdx}`)
}
function applyRemoveToken(state: GameState, playerIdx: 0 | 1, action: { cardId: string; tokenKind: TransferableToken; targetIdx: 0 | 1 }): void {
  const target = state.players[action.targetIdx]
  if (countToken(target, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return
  removeTransferable(target, action.tokenKind)
  log(state, playerIdx, ctxPhaseless, `Get That Outta Here!: removed ${action.tokenKind} from p${action.targetIdx}`)
}
function applyRemoveAllTokens(state: GameState, playerIdx: 0 | 1, action: { cardId: string; targetIdx: 0 | 1 }): void {
  if (!spendActionCard(state, playerIdx, action.cardId)) return
  const target = state.players[action.targetIdx]
  // covertOps and the Haunted Head are NOT status effects removable this way (verified token defs).
  target.tokens.dreadful = 0
  target.tokens.grimPursuit = 0
  target.tokens.agility = 0
  target.timeBombs = []
  log(state, playerIdx, ctxPhaseless, `What Status Effects?: removed all status tokens from p${action.targetIdx}`)
}
function applyMoveHead(state: GameState, playerIdx: 0 | 1, action: { cardId: string; toIdx: 0 | 1 }): void {
  if (!(state.players[0].tokens.head > 0 || state.players[1].tokens.head > 0) || !spendActionCard(state, playerIdx, action.cardId)) return
  state.players[0].tokens.head = 0
  state.players[1].tokens.head = 0
  state.players[action.toIdx].tokens.head = 1
  log(state, playerIdx, ctxPhaseless, `Rolling Pumpkin!: moved the Haunted Head to p${action.toIdx}`)
}
// These cross-player cards can be played in any window; the log phase isn't meaningful, so use a
// stable placeholder (the log entry's `phase` field is only used for grouping in replay output).
const ctxPhaseless: Phase = 'main2'

// Validate/pay for an Instant/Roll-Phase action card the player holds, moving it to discard.
// Returns false (no-op) if not held or unaffordable — same guard pattern as playCard.
function spendActionCard(state: GameState, playerIdx: 0 | 1, cardId: string): boolean {
  const player = state.players[playerIdx]
  const card = cardById(heroTemplateFor(player.heroId), cardId)
  if (!card || !player.hand.includes(cardId) || player.cp < (card.cpCost ?? 0)) return false
  player.cp -= card.cpCost ?? 0
  player.hand.splice(player.hand.indexOf(cardId), 1)
  player.discard.push(cardId)
  return true
}

export function resolveDefense(state: GameState, attackerIdx: 0 | 1, incomingDamage: number, rng: RNG, policies: [Policy, Policy]): void {
  const attacker = state.players[attackerIdx]
  const defenderIdx = (1 - attackerIdx) as 0 | 1
  const defender = state.players[defenderIdx]
  // Every decision below (Sabotage reroll, defensive card plays) belongs to the DEFENDER —
  // use their own Policy, not the attacker's (a prior version passed a single shared `policy`
  // down the whole call chain, which was actually always the ACTIVE/attacking player's policy;
  // harmless in self-play with identical scripted policies on both sides, but wrong the moment
  // two different policies face off, e.g. an RL agent defending against a scripted attacker).
  const policy = policies[defenderIdx]

  // DRP3: roll the defense dice, then open the alter window (Golden Rule: the ATTACKER may Tip It!/
  // Helping Hand! the defender's dice; the defender may Better D! to reroll all of them), THEN
  // count on the final dice. The roll's effects (prevention, counter-damage, Dreadful/Grim Pursuit
  // grants, Time Bomb) must reflect the ALTERED dice, so they're resolved after the window (DRP4),
  // not baked into the roll. Active player (the attacker) has priority.
  let hallowedUpgraded = false
  let defenseDice: number[]
  if (defender.heroId === 'nx') {
    defenseDice = [rollDie(rng)] // Dragon Scales : 1 de
  } else if (defender.heroId === 'fm') {
    // Masterwork (verifie board) : Defense Roll 1 de - resolu sur le de FINAL apres la
    // fenetre d'alteration, comme les autres defenses.
    defenseDice = [fm.rollMasterworkDie(rng)]
  } else if (defender.heroId === 'bw') {
    defenseDice = bw.rollSabotageDice(defender, rng, policy, state, defenderIdx, defender.upgradesInPlay.includes('sabotage-ii'))
  } else {
    hallowedUpgraded = defender.upgradesInPlay.includes('hallowed-reckoning-ii')
    defenseDice = hh.rollHallowedDice(defender, rng, hallowedUpgraded)
  }
  if (defender.hoardedDice > 0 && defenseDice.length > 1) {
    // HOARDING (verifie) : le de vole est inutilisable pour la defense contre cette attaque.
    defenseDice = defenseDice.slice(0, defenseDice.length - 1)
    log(state, defenderIdx, 'defense', `Hoarding: -1 defense die (${defenseDice.length} left)`)
  }
  state.pendingRoll = { rollerIdx: defenderIdx, dice: defenseDice }
  // Stash the attack context the DRP4-6 tail needs but that isn't otherwise on the state
  // (incomingDamage is a local), so the RL lookahead can score a defense-roll alteration by cloning,
  // applying it, then running finalizeDefenseRoll. Cleared right after the window.
  state.pendingDefenseRoll = { attackerIdx, incomingDamage }
  resolveResponseWindow(state, [attackerIdx, defenderIdx], { windowType: 'defenseRoll' }, rng, policies, enumerateWindowActions, applyWindowAction)
  const finalDefenseDice = state.pendingRoll.dice
  state.pendingRoll = null
  state.pendingDefenseRoll = null
  // The dice themselves were never logged — only the aggregate outcome — leaving the UI unable
  // to SHOW the defense roll (user-reported). Logged on the DEFENDER's line.
  log(state, defenderIdx, 'defense', `Defense dice: ${finalDefenseDice.join(',')}`)
  finalizeDefenseRoll(state, attackerIdx, incomingDamage, finalDefenseDice, rng, policies)
}

// DRP4-6: resolve a defense roll's effects on its FINAL (possibly altered) dice, then the DRP5
// response window, then apply damage simultaneously (DRP6). Split out of resolveDefense so the RL
// lookahead can score a DRP3 defense-roll alteration: clone, apply the candidate to the defense
// dice, then run this on the clone to see the post-defense HP. defenderIdx = 1 - attackerIdx.
export function finalizeDefenseRoll(
  state: GameState, attackerIdx: 0 | 1, incomingDamage: number, finalDefenseDice: number[],
  rng: RNG, policies: [Policy, Policy],
): void {
  const defenderIdx = (1 - attackerIdx) as 0 | 1
  const attacker = state.players[attackerIdx]
  const defender = state.players[defenderIdx]

  // DRP4: resolve the defense roll's effects on the final dice.
  let damagePrevented = 0
  if (defender.heroId === 'nx') {
    damagePrevented = nx.dragonScalesPrevent(finalDefenseDice[0])
    log(state, defenderIdx, 'defense', `Dragon Scales: face ${finalDefenseDice[0]}, prevented ${damagePrevented}`)
  } else if (defender.heroId === 'fm') {
    const face = finalDefenseDice[0]
    const out = fm.masterworkOutcome(face, defender, incomingDamage)
    if (out.mines) {
      const r = fm.mine(defender)
      log(state, defenderIdx, 'defense', `Masterwork (Pick): mined — ${r.revealed.length ? `revealed ${r.revealed.join(',')} to The Forge` : `no reveal, +${r.cpGained} CP`}`)
    }
    // Les armures s'activent sur toute Attaque à dégâts normaux ; Masterwork double
    // éventuellement leur effet (Forge = une, Anvil = jusqu'à deux différentes).
    const eff = fm.armorEffects(defender, 'normal', out.doubling)
    damagePrevented = eff.prevented
    if (eff.counter > 0) queueDamage(state, attackerIdx, eff.counter)
    const doubled = [out.doubling.helmet ? 'helmet' : '', out.doubling.shield ? 'shield' : ''].filter(Boolean).join('+')
    log(state, defenderIdx, 'defense', `Masterwork: face ${face}, prevented ${eff.prevented}, ${eff.counter} dmg back${doubled ? ` (doubled ${doubled})` : ''}`)
  } else if (defender.heroId === 'bw') {
    const r = bw.countSabotage(finalDefenseDice)
    damagePrevented = r.damagePrevented
    if (r.damageToAttacker > 0) queueDamage(state, attackerIdx, r.damageToAttacker)
    if (r.tbInflictedOnAttacker > 0) bw.inflictTimeBomb(attacker, defender.upgradesInPlay.length, r.tbInflictedOnAttacker)
    log(state, defenderIdx, 'defense', `Sabotage: prevented ${r.damagePrevented}, ${r.damageToAttacker} dmg back, ${r.tbInflictedOnAttacker} TB inflicted`)
  } else {
    const hallowedUpgraded = defender.upgradesInPlay.includes('hallowed-reckoning-ii')
    const r = hh.hallowedEffects(defender, finalDefenseDice, hallowedUpgraded)
    damagePrevented = r.damagePrevented
    if (r.counterDamageToAttacker > 0) queueDamage(state, attackerIdx, r.counterDamageToAttacker)
    log(state, defenderIdx, 'defense', `Hallowed Reckoning${hallowedUpgraded ? ' II' : ''}: prevented ${r.damagePrevented}, ${r.counterDamageToAttacker} dmg back, +${r.dreadfulGained} Dreadful, +${r.grimPursuitGained} Grim Pursuit`)
  }

  let remaining = Math.max(0, incomingDamage - damagePrevented)
  let eludeEligible = false
  // ANY defender holding Agility may use it — tokens are cross-player-transferable by design
  // (Transference!), and the old `heroId === 'bw'` gate made a stolen Agility token dead weight
  // (user-caught: stole it, couldn't use it, lost).
  if (defender.tokens.agility > 0 && remaining > 0) {
    // TODO(user): MVP auto-spends Agility whenever available; make this an explicit Policy
    // decision once card/Agility timing rules (guide: "peut être dépensée à tout moment") are settled.
    const r = bw.spendAgilityToHalveDamage(defender, remaining, rng)
    remaining = r.remainingDamage
    log(state, defenderIdx, 'defense', `Agility spent: rolled ${r.roll}, ${r.succeeded ? 'halved damage' : 'no effect'}`)
    // Elude! (verified card text): only playable when the Agility roll landed on 5-6 — a
    // subset of the "fail" range (4-6) that would otherwise waste the token for nothing.
    eludeEligible = !r.succeeded && r.roll >= 5
  }

  // DRP5: response window (Advanced Rules) — both players have priority in turn, active player
  // (the attacker) first, looping until pass-pass. The defender plays "after being Attacked" cards
  // (Not This Time!, Recoil!, Elude!, Spirited Reprisal!) to whittle `remaining`; either player may
  // also play Instants. The state the window mutates lives on state.pendingAttack, so
  // applyWindowAction('defense') — shared with the RL lookahead — can reach `remaining`.
  state.pendingAttack = { attackerIdx, defenderIdx, remaining }
  resolveResponseWindow(
    state, [attackerIdx, defenderIdx], { windowType: 'defense', eludeEligible },
    rng, policies, enumerateWindowActions, applyWindowAction,
  )
  // DRP6: the defender's surviving damage and the attacker's counter-damage land simultaneously.
  finalizePendingAttackDamage(state)
}

// "Play only after being Attacked" Roll Phase Action cards that reduce/negate incoming dmg.
const DEFENSIVE_CARD_IDS = ['not-this-time', 'spirited-reprisal', 'recoil']

function eligibleDefensiveCardIds(defender: PlayerState, eludeEligible: boolean): string[] {
  const hero = heroTemplateFor(defender.heroId)
  const ids = DEFENSIVE_CARD_IDS.filter(id => defender.hand.includes(id))
  if (eludeEligible && defender.hand.includes('elude')) ids.push('elude')
  return ids.filter(id => defender.cp >= (cardById(hero, id)?.cpCost ?? 0))
}

// Applies one defensive card's effect and returns the new `remaining` damage. Assumes the
// card is in `defender.hand` and affordable (guaranteed by eligibleDefensiveCardIds — but that
// only checks each card in ISOLATION; a Policy playing several cards in one resolveDefense call
// could still exceed the CP it had left after an earlier one in the same batch, so this
// re-checks affordability immediately before debiting, same pattern as playCard's own guard).
function applyDefensiveCard(state: GameState, defenderIdx: 0 | 1, cardId: string, remaining: number, rng: RNG): number {
  const defender = state.players[defenderIdx]
  const hero = heroTemplateFor(defender.heroId)
  const card = cardById(hero, cardId)
  if (!card || !defender.hand.includes(cardId) || defender.cp < (card.cpCost ?? 0)) return remaining
  defender.cp -= card.cpCost ?? 0
  defender.hand.splice(defender.hand.indexOf(cardId), 1)
  defender.discard.push(cardId)

  if (cardId === 'not-this-time') {
    const prevented = Math.min(remaining, 6)
    log(state, defenderIdx, 'defense', `Not This Time!: prevented ${prevented} dmg`)
    return remaining - prevented
  }
  if (cardId === 'spirited-reprisal') {
    if (!hasHead(defender)) {
      log(state, defenderIdx, 'defense', 'Spirited Reprisal!: no effect (no Haunted Head)')
      return remaining
    }
    const prevented = Math.min(remaining, 3)
    log(state, defenderIdx, 'defense', `Spirited Reprisal!: prevented ${prevented} dmg (Haunted Head)`)
    return remaining - prevented
  }
  if (cardId === 'recoil') {
    const r = bw.resolveRecoil(remaining, rng)
    if (r.cpGained > 0) grantCp(defender, r.cpGained)
    log(state, defenderIdx, 'defense', `Recoil!: prevented ${r.damagePrevented} dmg, +${r.cpGained} CP`)
    return remaining - r.damagePrevented
  }
  if (cardId === 'elude') {
    log(state, defenderIdx, 'defense', `Elude!: ignored all ${remaining} incoming dmg`)
    return 0
  }
  return remaining
}

// "Attack Modifier" Roll Phase Action cards played by the ATTACKER for their own current
// attack. Thundering Hooves! doesn't touch dmg/defendability at all (pure CP->Grim Pursuit
// conversion) but is timed the same way, so it shares this hook rather than inventing a
// separate one.
const ATTACK_MODIFIER_CARD_IDS = ['unescapable', 'cranial-assist', 'subversion', 'thundering-hooves']

function eligibleAttackModifierCardIds(self: PlayerState): string[] {
  const hero = heroTemplateFor(self.heroId)
  return ATTACK_MODIFIER_CARD_IDS.filter(id => {
    if (!self.hand.includes(id)) return false
    const card = cardById(hero, id)
    if (!card || self.cp < (card.cpCost ?? 0)) return false
    if (id === 'unescapable' && self.tokens.grimPursuit < 1) {
      // Combo user-caught : Thundering Hooves! (CP -> Grim Pursuit) se résout AVANT dans la
      // même fenêtre, donc Unescapable! reste proposable à 0 jeton si TH peut en fournir
      // (TH coûte 0 CP ; il faut 1 CP pour Unescapable + >=1 CP à convertir).
      const canConvert = self.hand.includes('thundering-hooves') && self.cp >= 2
      if (!canConvert) return false
    }
    return true
  })
}

// Exported for sim/rl/valueGreedyPolicy.ts: chooseAttackModifierCards's own signature doesn't
// carry the dice needed to replay resolveAbilityPhase, so its lookahead scores candidates by
// applying this function directly (dice-independent) instead of re-entering a higher-level phase.
export interface AttackModifierResult {
  dmg: number
  undefendable: boolean
}

// Applies one attack-modifier card's effect and returns the updated dmg/undefendable state.
// Assumes the card is in `self.hand` and eligible (guaranteed by eligibleAttackModifierCardIds —
// but, same caveat as applyDefensiveCard, that only checks each card in ISOLATION; re-checks
// affordability immediately before debiting so a multi-card Policy choice can't overspend).
export function applyAttackModifierCard(state: GameState, playerIdx: 0 | 1, cardId: string, current: AttackModifierResult): AttackModifierResult {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const hero = heroTemplateFor(self.heroId)
  const card = cardById(hero, cardId)
  if (!card || !self.hand.includes(cardId) || self.cp < (card.cpCost ?? 0)) return current
  // Unescapable! exige 1 Grim Pursuit AU MOMENT de payer (l'éligibilité a pu être accordée en
  // pariant sur Thundering Hooves — si la conversion n'a rien donné, no-op sans consommer).
  if (cardId === 'unescapable' && self.tokens.grimPursuit < 1) return current
  self.cp -= card.cpCost ?? 0
  self.hand.splice(self.hand.indexOf(cardId), 1)
  self.discard.push(cardId)

  if (cardId === 'unescapable') {
    hh.spendGrimPursuit(self, 1)
    log(state, playerIdx, 'resolveAttack', 'Unescapable!: spent 1 Grim Pursuit, attack is now undefendable')
    return { ...current, undefendable: true }
  }
  if (cardId === 'cranial-assist') {
    // Cranial Assist! rewards attacking whoever holds the Haunted Head. The head is a bag token now,
    // so read it hero-agnostically (only HH holds one today — until giveHead's transfer is wired —
    // so this is equivalent to the old `opp.heroId === 'hh' && hasHead` guard).
    const oppHasHead = hasHead(opp)
    log(state, playerIdx, 'resolveAttack', oppHasHead ? 'Cranial Assist!: +3 dmg (opponent holds the Head)' : 'Cranial Assist!: no effect (opponent lacks the Head)')
    return { ...current, dmg: current.dmg + (oppHasHead ? 3 : 0) }
  }
  if (cardId === 'subversion') {
    const bonus = 2 + self.upgradesPlayedThisTurn
    log(state, playerIdx, 'resolveAttack', `Subversion!: +${bonus} dmg (${self.upgradesPlayedThisTurn} Ability Upgrade(s) played this turn)`)
    return { ...current, dmg: current.dmg + bonus }
  }
  if (cardId === 'thundering-hooves') {
    // "jusqu'à 3" : ne convertit jamais au-delà du cap de Grim Pursuit (3) — l'ancienne
    // version brûlait 3 CP même quand le cap n'en absorbait qu'un (découvert par le test combo).
    const spend = Math.min(3, self.cp, Math.max(0, hh.GRIM_PURSUIT_CAP - self.tokens.grimPursuit))
    self.cp -= spend
    hh.grantGrimPursuit(self, spend)
    log(state, playerIdx, 'resolveAttack', `Thundering Hooves!: spent ${spend} CP for +${spend} Grim Pursuit`)
    return current
  }
  return current
}

// Offers eligible attack-modifier cards to the Policy and folds the chosen ones' effects into
// the running dmg/undefendable state. Shared by applyHHAbility/applyBWAbility.
function applyAttackModifiers(state: GameState, playerIdx: 0 | 1, policy: Policy, initial: AttackModifierResult, rng: RNG): AttackModifierResult {
  const self = state.players[playerIdx]
  let result = initial
  const eligible = eligibleAttackModifierCardIds(self)
  if (eligible.length > 0) {
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligible)
      // Thundering Hooves! toujours en premier : il FOURNIT les Grim Pursuit qu'Unescapable!
      // consomme dans la même fenêtre (combo user-caught).
      .slice().sort((a, b) => (a === 'thundering-hooves' ? -1 : 0) - (b === 'thundering-hooves' ? -1 : 0))
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result)
  }
  // Grim Pursuit spend mode (b) — a STRATEGIC DECISION, not automatic (auto-spending nuked the
  // economy: it consumed tokens the instant an ability granted them). Verified token text:
  // "After Attacking, roll 5 dice: add 1 dmg per Horseshoe." Once per turn — and the token/
  // once-per-turn are consumed even on a 0-Horseshoe roll (spending is the decision, the dice
  // are just the payout).
  if (self.heroId === 'hh' && self.tokens.grimPursuit >= 1 && !self.grimPursuitBonusUsedThisTurn) {
    if (policy.chooseGrimPursuitSpend?.(state, playerIdx, result.dmg)) {
      const r = hh.spendGrimPursuitForBonusDamage(self, rng)
      self.grimPursuitBonusUsedThisTurn = true
      result = { ...result, dmg: result.dmg + r.bonus }
      log(state, playerIdx, 'resolveAttack', `Grim Pursuit spend (b): rolled [${r.dice.join(',')}], ${r.bonus} Horseshoe(s) -> +${r.bonus} dmg`)
    }
  }
  return result
}

function applyWhiffPassive(state: GameState, playerIdx: 0 | 1): void {
  const self = state.players[playerIdx]
  if (self.heroId === 'hh') {
    hh.grantGrimPursuit(self, 1) // guide: "Si tu ne fais aucun dégât -> +1 Grim Pursuit"
    log(state, playerIdx, 'resolveAttack', 'Whiff: +1 Grim Pursuit')
  }
}

function applyHHAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const data = resolvedAbilityByBoardName(heroTemplateFor('hh'), name, self.upgradesInPlay)
  if (!data) { log(state, playerIdx, 'resolveAttack', `Unknown ability "${name}" — no data, skipped`); return }
  const tokens = self.tokens

  let dmg = data.baseDamage ?? 0
  if (data.baseDamage == null) log(state, playerIdx, 'resolveAttack', `${name}: baseDamage TODO(user) — 0 dmg applied`)

  // Horrify (verified card text): with the Haunted Head OR with Horrify II in play, gain BOTH
  // bonuses automatically (Horrify II's own text drops the choice entirely: "Gain 3 Dreadful
  // and 2 Grim Pursuit"); without either, it's a Policy choice between the two (an earlier
  // version of this engine always granted Dreadful regardless of Head status — wrong for the
  // no-Head, non-upgraded case).
  const horrifyUpgraded = self.upgradesInPlay.includes('horrify-ii')
  if (name.startsWith('Horrify')) {
    if (tokens.head > 0 || horrifyUpgraded) {
      if (data.tokensGrantedToSelf?.dreadful) hh.grantDreadful(self, data.tokensGrantedToSelf.dreadful)
      const grimPursuit = horrifyUpgraded ? data.tokensGrantedToSelf?.grimPursuit : data.tokensGrantedIfHasHead?.grimPursuit
      if (grimPursuit) hh.grantGrimPursuit(self, grimPursuit)
    } else {
      const choice = policy.chooseHorrifyBonus(state, playerIdx)
      if (choice === 'dreadful' && data.tokensGrantedToSelf?.dreadful) hh.grantDreadful(self, data.tokensGrantedToSelf.dreadful)
      else if (data.tokensGrantedIfHasHead?.grimPursuit) hh.grantGrimPursuit(self, data.tokensGrantedIfHasHead.grimPursuit)
      log(state, playerIdx, 'resolveAttack', `Horrify: chose ${choice} (no Haunted Head)`)
    }
  } else {
    // Granted here, BEFORE the bonusRoll block below — matters for Spectral Assault, whose
    // bonus roll dice count depends on the post-gain Dreadful total (verified: "Gain
    // Dreadful. Then deal X dmg and roll 1 die per Dreadful...").
    // Logged (was silent — "je ne vois pas le token que je gagne", user-reported on Cursed Gallop).
    const gains: string[] = []
    if (data.tokensGrantedToSelf?.dreadful) { hh.grantDreadful(self, data.tokensGrantedToSelf.dreadful); gains.push(`+${data.tokensGrantedToSelf.dreadful} Dreadful`) }
    if (data.tokensGrantedToSelf?.grimPursuit) { hh.grantGrimPursuit(self, data.tokensGrantedToSelf.grimPursuit); gains.push(`+${data.tokensGrantedToSelf.grimPursuit} Grim Pursuit`) }
    if (gains.length) log(state, playerIdx, 'resolveAttack', `${name}: ${gains.join(', ')}`)
  }

  let undefendableOverride = false
  if (data.bonusRoll) {
    const r = hh.resolveSpectralAssaultBonusRoll(self, rng)
    dmg += r.bonusDamage
    if (r.undefendable) undefendableOverride = true
    if (r.grimPursuitGained > 0) hh.grantGrimPursuit(self, r.grimPursuitGained)
    log(state, playerIdx, 'resolveAttack', `${name} bonus roll: +${r.bonusDamage} dmg, undefendable=${r.undefendable}, +${r.grimPursuitGained} Grim Pursuit`)
  }

  if (data.numberMatchBonus) {
    const ofAKind = self.upgradesInPlay.includes('cleave-ii') ? 3 : data.numberMatchBonus.ofAKind
    if (hh.hasNumberMatch(dice, ofAKind)) {
      if (data.numberMatchBonus.tokensGranted?.dreadful) hh.grantDreadful(self, data.numberMatchBonus.tokensGranted.dreadful)
      log(state, playerIdx, 'resolveAttack', `${name}: ${ofAKind}-of-a-kind bonus triggered`)
    }
  }

  const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: undefendableOverride }, rng)
  dmg = modified.dmg
  undefendableOverride = modified.undefendable

  // 0 damage = no Attack to defend (user-caught on BW's Infiltrate: the defender was rolling
  // Hallowed Reckoning against a pure-utility ability, farming counter-dmg/Dreadful for free).
  // Theoretical on HH (every ability deals dmg) but guarded uniformly with applyBWAbility.
  if (dmg <= 0) log(state, playerIdx, 'resolveAttack', `${name}: deals no damage — no defense roll`)
  else if ((data.defendable ?? true) && !undefendableOverride) resolveDefense(state, playerIdx, dmg, rng, policies)
  else queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith('Dreadful Charge'))

  if (tokens.head > 0 && data.cardDrawIfHasHead) {
    drawCards(self, 1, rng)
    log(state, playerIdx, 'resolveAttack', `${name}: drew 1 card (Haunted Head)`)
  }
  if (data.cardDraw) {
    drawCards(self, data.cardDraw, rng)
    log(state, playerIdx, 'resolveAttack', `${name}: drew ${data.cardDraw} card(s)`)
  }
}

// Forgemaster : résolution d'attaque depuis les données vérifiées (fm/hero.json). Ordre des
// textes imprimés respecté : Mine / tutor AVANT les dégâts ("Mine your deck... Then deal 8").
function applyFMAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  const data = resolvedAbilityByBoardName(heroTemplateFor('fm'), name, self.upgradesInPlay)
  if (!data) { log(state, playerIdx, 'resolveAttack', `Unknown ability "${name}" — no data, skipped`); return }

  let dmg = data.baseDamage ?? 0
  if (data.thresholdBonusArmor && fm.armorCount(self) >= data.thresholdBonusArmor.armorAtLeast) {
    dmg += data.thresholdBonusArmor.bonusDamage
    log(state, playerIdx, 'resolveAttack', `${name}: +${data.thresholdBonusArmor.bonusDamage} dmg (${data.thresholdBonusArmor.armorAtLeast} Armor)`)
  }
  if (data.bonusRoll?.addRolledValueAsDamage) {
    const b = rollDie(rng)
    dmg += b
    log(state, playerIdx, 'resolveAttack', `${name} bonus roll: +${b} dmg`)
  }
  if (data.numberMatchBonus?.cpGain && hh.hasNumberMatch(dice, data.numberMatchBonus.ofAKind)) {
    grantCp(self, data.numberMatchBonus.cpGain)
    log(state, playerIdx, 'resolveAttack', `${name}: ${data.numberMatchBonus.ofAKind}-of-a-kind bonus, +${data.numberMatchBonus.cpGain} CP`)
  }
  if (data.minesDeck) {
    // "Mine your deck" = mot-clé Mine : l'alternative "ne rien révéler, +1 CP" reste un choix
    // même ici (validé user) ; 'skip' n'est PAS légal (le Mine fait partie de l'habileté).
    const top3 = fm.minePeek(self)
    const choice = policy.chooseFmMine?.(state, playerIdx, top3)
    const r = choice?.kind === 'cp' ? fm.mineResolve(self, [])
      : choice?.kind === 'reveal' ? fm.mineResolve(self, [choice.oreId])
      : fm.mine(self, !!data.revealAllMinedOre)
    log(state, playerIdx, 'resolveAttack', `${name}: mined — ${r.revealed.length ? `revealed ${r.revealed.join(',')} to The Forge` : `no reveal, +${r.cpGained} CP`}`)
  }
  if (data.searchOreToForge) {
    const t = fm.tutorOreToForge(self, rng)
    log(state, playerIdx, 'resolveAttack', `${name}: ${t ? `tutored ${t} to The Forge` : 'no ORE left in deck'}, deck shuffled`)
  }
  if (data.cardDraw) {
    drawCards(self, data.cardDraw, rng)
    log(state, playerIdx, 'resolveAttack', `${name}: drew ${data.cardDraw} card(s)`)
  }

  const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: !(data.defendable ?? true) }, rng)
  dmg = modified.dmg

  if (dmg <= 0) {
    log(state, playerIdx, 'resolveAttack', `${name}: deals no damage — no defense roll`)
  } else if ((data.defendable ?? true) && !modified.undefendable) {
    resolveDefense(state, playerIdx, dmg, rng, policies)
  } else {
    queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith('Final Touches'))
  }
}

function applyBWAbility(state: GameState, playerIdx: 0 | 1, name: string, rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const data = resolvedAbilityByBoardName(heroTemplateFor('bw'), name, self.upgradesInPlay)
  if (!data) { log(state, playerIdx, 'resolveAttack', `Unknown ability "${name}" — no data, skipped`); return }

  let dmg = data.baseDamage ?? 0
  if (data.bonusDamagePerUpgrade) dmg += data.bonusDamagePerUpgrade * self.upgradesInPlay.length
  if (data.thresholdBonus && self.upgradesInPlay.length >= data.thresholdBonus.upgradesAtLeast) {
    dmg += data.thresholdBonus.bonusDamage
  }
  dmg += bw.rrtAttackBonus(self.upgradesInPlay)

  if (name.startsWith('Vengeance')) {
    const riderDice = self.upgradesInPlay.includes('vengeance-ii') ? 5 : 4
    const rider = bw.resolveVengeanceRider(self, opp, rng, riderDice)
    dmg += rider.bonusDamage
    log(state, playerIdx, 'resolveAttack', `Vengeance rider: +${rider.bonusDamage} dmg, ${rider.tbInflictedOnOpponent} TB inflicted, +${rider.covertOpsGained} Covert Ops`)
  }

  const modified = applyAttackModifiers(state, playerIdx, policy, { dmg, undefendable: !(data.defendable ?? true) }, rng)
  dmg = modified.dmg

  // 0 damage = no Attack to defend (user-caught: Infiltrate deals no dmg — pure utility.
  // Rolling a defense against it was both wrong per the rules and an exploit: HH's Hallowed
  // Reckoning farmed counter-damage + Dreadful off a harmless ability). Attack modifiers ran
  // above, so a pumped 0-dmg ability (e.g. +3 Cranial Assist) still gets defended normally.
  if (dmg <= 0) {
    log(state, playerIdx, 'resolveAttack', `${name}: deals no damage — no defense roll`)
  } else if (data.defendable ?? true) {
    if (modified.undefendable) queueAttackDamageVsArmor(state, playerIdx, dmg, false)
    else resolveDefense(state, playerIdx, dmg, rng, policies)
  } else {
    queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith("Widow's Bite"))
  }

  // Logged (was silent — same visibility complaint as HH's token gains).
  const bwGains: string[] = []
  if (data.cpGain) { grantCp(self, data.cpGain); bwGains.push(`+${data.cpGain} CP`) }
  if (data.cpGainIfUpgradesAtLeast && self.upgradesInPlay.length >= data.cpGainIfUpgradesAtLeast.upgradesAtLeast) {
    grantCp(self, data.cpGainIfUpgradesAtLeast.cpGain)
    bwGains.push(`+${data.cpGainIfUpgradesAtLeast.cpGain} CP (≥${data.cpGainIfUpgradesAtLeast.upgradesAtLeast} upgrades)`)
  }
  if (data.tokensGrantedToSelf?.agility) { bw.grantAgility(self, data.tokensGrantedToSelf.agility); bwGains.push(`+${data.tokensGrantedToSelf.agility} Agility`) }
  // covertOps grants (Spy Game, Subvert) were silently DROPPED — only agility was handled.
  // Caught by the ability-effects audit (declared-vs-applied), 2026-07-04.
  if (data.tokensGrantedToSelf?.covertOps) { bw.grantCovertOps(self, data.tokensGrantedToSelf.covertOps); bwGains.push(`+${data.tokensGrantedToSelf.covertOps} Covert Ops`) }
  if (bwGains.length) log(state, playerIdx, 'resolveAttack', `${name}: ${bwGains.join(', ')}`)

  // Infiltrate (verified card text): base = "advance all Time Bomb tokens, THEN inflict"
  // (the new TB is not advanced this turn); Infiltrate II reverses the order ("inflict, THEN
  // advance", so the new TB IS advanced same turn).
  if (data.advancesAllTimeBombsInPlay) {
    const upgraded = self.upgradesInPlay.includes('infiltrate-ii')
    if (!upgraded) {
      const n = bw.advanceAllTimeBombs(opp)
      if (n > 0) log(state, playerIdx, 'resolveAttack', `Advanced all Time Bombs: ${n} detonated`)
    }
    if (data.tokensInflictedOnOpponent?.timeBomb) {
      bw.inflictTimeBomb(opp, self.upgradesInPlay.length, data.tokensInflictedOnOpponent.timeBomb)
    }
    if (upgraded) {
      const n = bw.advanceAllTimeBombs(opp)
      if (n > 0) log(state, playerIdx, 'resolveAttack', `Advanced all Time Bombs: ${n} detonated`)
    }
  } else if (data.tokensInflictedOnOpponent?.timeBomb) {
    bw.inflictTimeBomb(opp, self.upgradesInPlay.length, data.tokensInflictedOnOpponent.timeBomb)
  }

  if (data.searchUpgradesIntoPlay) {
    const found = searchDeckForUpgrades(state, playerIdx, data.searchUpgradesIntoPlay, rng)
    log(state, playerIdx, 'resolveAttack', found.length > 0
      ? `Searched deck: put ${found.join(', ')} into play`
      : 'Searched deck: no Ability Upgrades found')
  }
}

// Widow's Bite / Recon (verified): "Search your deck for up to N Ability Upgrades and put them into
// play." Free — no CP cost, bypasses hand entirely. Without a Policy hook to CHOOSE which upgrades,
// we pick the first matches in deck order — so we SHUFFLE THE DECK FIRST (ruling, 2026-07-03): a
// search sees the whole deck and picks freely (order-independent for a human), but our order-based
// approximation must not be gameable by pre-arranging the deck top via a Covert Ops peek. Shuffling
// before the pick makes it unbiased; the leftover cards stay in that shuffled order. Respects
// upgradeSlot replacement the same way playing a card from hand does.
function searchDeckForUpgrades(state: GameState, playerIdx: 0 | 1, count: number, rng: RNG): string[] {
  const self = state.players[playerIdx]
  const hero = heroTemplateFor(self.heroId)
  const found: string[] = []
  const remaining: string[] = []
  for (const cardId of shuffle(self.deck, rng)) {
    const card = cardById(hero, cardId)
    if (found.length < count && card?.kind === 'upgrade') found.push(cardId)
    else remaining.push(cardId)
  }
  for (const cardId of found) {
    const slot = cardById(hero, cardId)?.upgradeSlot
    const existingId = self.upgradesInPlay.find(id => cardById(hero, id)?.upgradeSlot === slot)
    if (existingId) self.upgradesInPlay = self.upgradesInPlay.filter(id => id !== existingId)
    self.upgradesInPlay.push(cardId)
  }
  self.deck = remaining
  return found
}

// Queue+flush attack damage that bypasses the defense roll (undefendable/ultimate), letting a
// Forgemaster defender's Ultimanium Shield prevent 2 first (verified leaflet: works vs normal,
// undefendable and pure dmg; NOT vs an Ultimate or collateral).
function queueAttackDamageVsArmor(state: GameState, attackerIdx: 0 | 1, dmg: number, isUltimate: boolean): void {
  const defenderIdx = (1 - attackerIdx) as 0 | 1
  const defender = state.players[defenderIdx]
  if (defender.heroId === 'fm' && dmg > 0) {
    const eff = fm.armorEffects(defender, isUltimate ? 'ultimate' : 'undefendable')
    if (eff.prevented > 0) {
      log(state, defenderIdx, 'defense', `Ultimanium Shield: prevented ${Math.min(eff.prevented, dmg)} (undefendable attack)`)
      dmg = Math.max(0, dmg - eff.prevented)
    }
  }
  queueDamage(state, defenderIdx, dmg)
  flushDamage(state)
}

export function resolveAbilityPhase(state: GameState, playerIdx: 0 | 1, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  if (self.heroId === 'nx') { resolveNaraxusAbility(state, playerIdx, dice, rng, policies); return }
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const oState = oracleStateFor(self, opp)

  const candidates = resolveMatchedAbilities(self.heroId, dice, oState)
  if (candidates.length === 0) {
    log(state, playerIdx, 'resolveAttack', 'No ability matched (Whiff)')
    applyWhiffPassive(state, playerIdx)
    return
  }

  const chosenName = candidates.length === 1 ? candidates[0].name : policy.chooseAbility(state, playerIdx, candidates)
  log(state, playerIdx, 'resolveAttack', `Chose ability: ${chosenName}`)

  if (self.heroId === 'hh') applyHHAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'fm') applyFMAbility(state, playerIdx, chosenName, dice, rng, policies)
  else applyBWAbility(state, playerIdx, chosenName, rng, policies)
}


// --- Naraxus (boss) -------------------------------------------------------------------------
// Resout l'attaque du boss depuis son/ses de(s) (hard : garde le plus haut). Planche verifiee.
export function resolveNaraxusAbility(state: GameState, bossIdx: 0 | 1, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const boss = state.players[bossIdx]
  const heroIdx = (1 - bossIdx) as 0 | 1
  const hero = state.players[heroIdx]
  const face = state.bossHard ? Math.max(...dice) : dice[0]
  const info = nx.nxAttackInfo(face)
  log(state, bossIdx, 'resolveAttack', `Naraxus: rolled [${dice.join(',')}] -> ${info.name} (${face})`)

  const swoop = () => {
    const removed = nx.removeRandomStatus(boss, rng)
    if (removed) log(state, bossIdx, 'resolveAttack', `Swoop: removed ${removed} from Naraxus`)
    boss.hp = Math.min(boss.hp + 4, nx.NX_HEAL_CAP)
    log(state, bossIdx, 'resolveAttack', 'Swoop: healed 4')
    queueAttackDamageVsArmor(state, bossIdx, 3, false) // 3 indefendables
  }

  if (face === 1) { swoop(); return }
  if (face === 2) {
    const milled = hero.deck.splice(0, Math.min(3, hero.deck.length))
    hero.discard.push(...milled)
    log(state, bossIdx, 'resolveAttack', `Ember Spark: milled ${milled.length} card(s) (${milled.join(',') || '-'})`)
    resolveDefense(state, bossIdx, 8, rng, policies)
    return
  }
  if (face === 3) {
    const four = [rollDie(rng), rollDie(rng), rollDie(rng), rollDie(rng)].sort((a, b) => b - a)
    const dmg = four[0] + four[1]
    log(state, bossIdx, 'resolveAttack', `Gashing Bite: rolled [${four.join(',')}] -> ${dmg} dmg`)
    resolveDefense(state, bossIdx, dmg, rng, policies)
    return
  }
  if (face === 4) {
    hero.hoardedDice = 1 // rendu a la fin du tour du heros (reset a son upkeep)
    log(state, bossIdx, 'resolveAttack', 'Hoarding: stole 1 die from the Active Hero (returned at end of their turn)')
    resolveDefense(state, bossIdx, 9, rng, policies)
    return
  }
  if (face === 5) {
    // v1 : defausse auto de la carte au cout le plus bas (TODO : choix interactif du heros)
    if (hero.hand.length) {
      const heroT = heroTemplateFor(hero.heroId)
      const pick = hero.hand.slice().sort((a, b) => (cardById(heroT, a)?.cpCost ?? 0) - (cardById(heroT, b)?.cpCost ?? 0))[0]
      hero.hand.splice(hero.hand.indexOf(pick), 1)
      hero.discard.push(pick)
      log(state, bossIdx, 'resolveAttack', `Thundering Roar: hero discarded ${pick}`)
    }
    queueAttackDamageVsArmor(state, bossIdx, 8, false) // 8 indefendables
    return
  }
  // face 6 - Dragon's Might
  resolveDefense(state, bossIdx, 10, rng, policies)
  const trigger = rollDie(rng)
  log(state, bossIdx, 'resolveAttack', `Dragon's Might: trigger roll ${trigger}${trigger >= 5 ? ' -> SWOOP!' : ''}`)
  if (trigger >= 5) swoop()
}

// Upkeep du boss + son jet (1 de, 2 en hard) — separe pour le pont interactif.
export function naraxusUpToRoll(state: GameState, bossIdx: 0 | 1, rng: RNG): number[] {
  const boss = state.players[bossIdx]
  const tb = bw.tickTimeBombsUpkeep(boss, rng)
  if (tb.rolls.length > 0) log(state, bossIdx, 'upkeep', `Time Bomb upkeep: rolls [${tb.rolls.join(',')}], ${tb.selfDamage} self-dmg, ${tb.defused} defused`)
  if (checkGameOver(state)) return []
  return state.bossHard ? [rollDie(rng), rollDie(rng)] : [rollDie(rng)]
}

// Tour complet du boss (simulations) : upkeep (Time Bombs) -> jet -> attaque.
export function playNaraxusTurn(state: GameState, bossIdx: 0 | 1, rng: RNG, policies: [Policy, Policy]): void {
  const dice = naraxusUpToRoll(state, bossIdx, rng)
  if (state.gameOver || !dice.length) return
  resolveNaraxusAbility(state, bossIdx, dice, rng, policies)
}

export function playEndOfTurn(state: GameState, playerIdx: 0 | 1): void {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  if (self.heroId === 'hh' && hh.endOfTurnHeadCheck(self)) {
    log(state, playerIdx, 'endOfTurn', 'Opponent holds the Head: +1 Dreadful')
  }
  log(state, playerIdx, 'endOfTurn', `HP: self=${self.hp}, opp=${opp.hp}`)
}

// Verified order (official rulebook, characters/rules/Turn Phases.png): Upkeep -> Income ->
// Main Phase (1) -> Offensive Roll -> Defensive Roll -> Main Phase (2) -> Discard. An earlier
// version of this engine rolled dice BEFORE Main Phase (1) — backwards; Main Phase (1) is
// where upgrades/actions get played using CP on hand BEFORE committing to an attack roll.
export function playTurn(state: GameState, playerIdx: 0 | 1, rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  playUpkeepPhase(state, playerIdx, rng, policy)
  if (checkGameOver(state)) return

  playIncomePhase(state, playerIdx, rng)
  playMainPhase(state, playerIdx, 'main1', policies, rng)

  const dice = playOffensiveRollPhase(state, playerIdx, rng, policy)
  const finalDice = resolveOffensiveAlterWindow(state, playerIdx, dice, rng, policies)
  resolveAbilityPhase(state, playerIdx, finalDice, rng, policies)
  if (checkGameOver(state)) return

  playMainPhase(state, playerIdx, 'main2', policies, rng)
  playDiscardPhase(state, playerIdx, policy)
  playEndOfTurn(state, playerIdx)
}
