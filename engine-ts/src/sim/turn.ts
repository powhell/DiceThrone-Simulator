// Pure(ish) turn/phase step functions — see rng.ts for the "RNG threaded as an argument,
// never Math.random() directly" convention that keeps a (seed, policies) pair reproducible.
import type { GameState, PlayerState, HeroId, TokenKind, TransferableToken, TimeBombPosition, Phase, WindowAction, WindowContext } from './types.js'
import { hasHead, TRANSFERABLE_TOKENS, TOKEN_CAPS, countToken } from './tokens.js'
import { resolveResponseWindow } from './decision.js'
import type { HHState } from '../characters/horseman/config.js'
import type { BWState } from '../characters/black_widow/config.js'
import type { FMState } from '../characters/forgemaster/config.js'
import type { RVState } from '../characters/raveness/config.js'
import type { DRState } from '../characters/druid/config.js'
import type { THState } from '../characters/thor/config.js'
import type { SMState } from '../characters/spiderman/config.js'
import type { PYState } from '../characters/pyromancer/config.js'
import type { DUState } from '../characters/duelist/config.js'
import type { SEState } from '../characters/sunelf/config.js'
import type { MBState } from '../characters/mythicbrawler/config.js'
import type { RNG } from './rng.js'
import { shuffle, rollDie, rollDice } from './rng.js'
import type { Policy, RollManipulationChoice } from './policy.js'
import { greedyHighestDamagePolicy } from './policy.js'
import type { RollStep, RollStepUpdate } from './oracle.js'
import { runOffensiveRoll } from './oracle.js'
import { resolveMatchedAbilities } from './ability-resolver.js'
import type { CardTemplate, HeroTemplate } from './data/schema.js'
import { heroTemplateFor, resolvedAbilityByBoardName, cardById } from './data/load.js'
import * as hh from './hero/hh.rules.js'
import * as bw from './hero/bw.rules.js'
import * as fm from './hero/fm.rules.js'
import * as nx from './hero/nx.rules.js'
import * as rv from './hero/rv.rules.js'
import * as dr from './hero/dr.rules.js'
import * as th from './hero/th.rules.js'
import * as sm from './hero/sm.rules.js'
import * as py from './hero/py.rules.js'
import * as du from './hero/du.rules.js'
import * as se from './hero/se.rules.js'
import * as mb from './hero/mb.rules.js'
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
// Risque de RÉPONSE en fenêtre DRP5 (user 2026-07-09 : « si l'adversaire a plusieurs CP pour
// répondre, des fois ça [ne] vaut [pas] la peine — il faut que le calcul de risque soit
// calculé ») : espérance de prévention par ses cartes défensives, estimée depuis l'info
// PUBLIQUE seulement — ses CP, la taille de sa main, et sa défausse (une carte déjà passée
// ne menace plus). 1 copie vivante -> P(en main) ≈ main/(main+deck).
function responseRiskFor(opponent: PlayerState): number {
  const hand = opponent.hand.length, deck = opponent.deck.length
  if (hand === 0) return 0
  const pInHand = hand / Math.max(1, hand + deck)
  // [id, coût CP, prévention effective moyenne]
  const RESP: Array<[string, number, number]> = [
    ['not-this-time', 1, 4.5],
    ['spirited-reprisal', 1, 3],
    ['recoil', 0, 3],
    ['sun-shield', 1, 2.5],
    ['indomitable-will', 2, 2.5],
    ['invulnerability', 2, 4],
  ]
  let risk = 0
  for (const [id, cost, prev] of RESP) {
    if (opponent.cp < cost) continue
    if (opponent.discard.includes(id)) continue // déjà jouée/vendue — info publique
    if (id === 'spirited-reprisal' && (opponent.tokens.head ?? 0) <= 0) continue
    if (id === 'invulnerability' && (opponent.tokens.electrokinesis ?? 0) < 2) continue
    if (!cardById(heroTemplateFor(opponent.heroId), id)) continue // pas dans son deck
    risk += pInHand * prev
  }
  // Discount : le défenseur garde souvent sa réponse pour une attaque plus grosse/létale.
  return Math.min(risk, 5) * 0.8
}

// Correction empirique par défenseur (calibration/audit_ev.mjs, 2026-07-10 : 1 500 vraies
// résolutions par cas — écart taxe mesurée − annoncée à l'attaque de référence ~6). Le
// résidu dépendant de la TAILLE de l'attaque (~+0,1/dégât au-delà de 6 chez bw/py/sm/th)
// n'est PAS modélisé ici : il faudrait une taxe par habileté (post-tournoi).
const TAX_AUDIT_DELTA: Partial<Record<string, number>> = {
  hh: 0.47, bw: 0.5, sm: 0.45, py: 0.45, dr: 0.35, th: 0.4, rv: 0.15, se: 0, du: -0.5, fm: 0.1,
}

export function defenseTaxFor(opponent: PlayerState): number {
  return baseDefenseTaxFor(opponent) + responseRiskFor(opponent) + (TAX_AUDIT_DELTA[opponent.heroId] ?? 0)
}

function baseDefenseTaxFor(opponent: PlayerState): number {
  if (opponent.heroId === 'mb') {
    // Wrassle : AUCUNE prévention — contre 1/Fist (E=0,5/dé), Heal 1/Spirit (E=0,33/dé),
    // Strength sur Peak (~0,1/dé). ~0,9/dé ; 2 dés de base (II : 3 ; +1 par Sky).
    // ESTIMATION à calibrer (banc audit_ev).
    const nDice = (opponent.upgradesInPlay.includes('wrassle-ii') ? 3 : 2) + Math.min(2, opponent.tokens.strengthSky ?? 0)
    return nDice * 0.9
  }
  if (opponent.heroId === 'se') {
    // Harness the Light : AUCUNE prévention, aucun contre — il soigne (E[Staves]=1.5) et
    // charge son cadran. Taxe = son soin attendu (II : pareil + gem parfois).
    return 1.5
  }
  if (opponent.heroId === 'du') {
    // Retreat 4 dés : contre E[floor(Blades/2)] = 0.75 (II : E[Blades] = 2). Les Steps forcés
    // (E[non-Blades] = 2) poussent vers les positions défensives : depuis <= 0 il finit
    // typiquement sur « prévient 3 » ; depuis +1 sur « pige 1 » (~1). Un Bonus/tour.
    const counter = opponent.upgradesInPlay.includes('retreat-ii') ? 2.0 : 0.75
    const pos = du.footworkPos(opponent)
    const posGain = opponent.footworkBonusUsedThisTurn ? 0 : pos <= 0 ? 3 : pos === 1 ? 1 : 0.5
    return counter + posGain
  }
  if (opponent.heroId === 'py') {
    // Molten Armor : aucune prévention, contre 5 dés x P(Flame)=1/2 = 2.5 (III : +5/6 Meteor)
    return opponent.upgradesInPlay.includes('molten-armor-iii') ? 2.5 + 5 / 6 : 2.5
  }
  if (opponent.heroId === 'sm') {
    // Spider-Sense : P(>=1 Spider sur 2 dés)=0.306 x ceil(dmg/2) ~ 0.9 sur une attaque de 6 ;
    // Counterpunch : contre 3 x 1/2 = 1.5. L'IA choisit le meilleur -> taxe moyenne ~1.5.
    return 1.5
  }
  if (opponent.heroId === 'bw') {
    // Sabotage 3 des : contre 1.5, prevenus 0.5 (Sabotage II, 4 des : 2.0 / 0.67)
    return opponent.upgradesInPlay.includes('sabotage-ii') ? 2.67 : 2.0
  }
  if (opponent.heroId === 'th') {
    // Thunder Wheel : previent 2 x E[dignes] = 2 sur 3 des (2.7 sur 4 en II) + gains EK/navette
    return opponent.upgradesInPlay.includes('thunder-wheel-ii') ? 2.7 : 2.0
  }
  if (opponent.heroId === 'dr') {
    // Thick Hide : hors Bear 2 des, contre 1/Claw (E=1), AUCUNE prevention ; Bear 4 des :
    // contre E=2, prevention E=4x(1/3+1/6)=2. (ruling user)
    // ANTICIPATION (user-caught « HH 36% pas normal ») : l'IA dr se morphe en Ours AU MOMENT
    // de défendre (auto-morph des 5 dmg entrants) — planifier avec la taxe Druide (1) fait
    // choisir les mauvaises lignes à TOUS ses adversaires. S'il a un Shape Shift en stock,
    // la défense attendue est un Ours (~3.5 : mix attaques <5 non morphées).
    if (dr.formOf(opponent) === 'bear') return 2 + 2
    return (opponent.tokens.shapeShift ?? 0) > 0 ? 3.5 : 1
  }
  if (opponent.heroId === 'rv') {
    // Nothing More (5 des, seuils UNE fois — ruling user) : contre 2 x P(>=2 Talons | p=1/2,
    // 5 des) = 2 x .8125 ; prevention 2 x P(>=2 Wings | p=1/3) = 2 x .539.
    return 2 * 0.8125 + 2 * 0.539
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

export function wildcardFlagsFor(p: PlayerState) {
  return {
    sixIt: p.hand.includes('six-it') && p.cp >= 1,
    soWild: p.hand.includes('so-wild') && p.cp >= 2,
    twiceAsWild: p.hand.includes('twice-as-wild') && p.cp >= 3,
    samesies: p.hand.includes('samesies') && p.cp >= 1,
    tipIt: p.hand.includes('tip-it') && p.cp >= 1,
  }
}

export function oracleStateFor(player: PlayerState, opponent: PlayerState): HHState | BWState | FMState | RVState | DRState | THState | SMState | PYState | DUState | SEState | MBState {
  if (player.heroId === 'mb') {
    return {
      ocean: player.tokens.strengthOcean ?? 0,
      mountain: player.tokens.strengthMountain ?? 0,
      sky: player.tokens.strengthSky ?? 0,
      oppConcussed: (opponent.tokens.concussion ?? 0) > 0,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'se') {
    return {
      sunDial: se.dialOf(player),
      dawn: se.isDawn(player),
      gemHeld: (player.tokens.chargedGem ?? 0) > 0,
      oppMarked: (opponent.tokens.sunMarked ?? 0) > 0,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'du') {
    return {
      footwork: du.footworkPos(player),
      guardBreak: player.tokens.guardBreak ?? 0,
      oppDisarmed: (opponent.tokens.disarm ?? 0) > 0,
      bonusAvailable: player.footworkBonusUsedThisTurn !== true,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
      quickFootwork: player.hand.includes('quick-footwork') && player.cp >= 1,
    }
  }
  if (player.heroId === 'py') {
    return {
      fireMastery: player.tokens.fireMastery ?? 0,
      fmCap: py.fmCap(player),
      oppBurned: (opponent.tokens.burn ?? 0) > 0,
      oppKnocked: (opponent.tokens.knockdown ?? 0) > 0,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'sm') {
    return {
      comboHeld: (player.tokens.combo ?? 0) > 0,
      invisHeld: (player.tokens.invisibility ?? 0) > 0,
      oppWebbed: (opponent.tokens.webbed ?? 0) > 0,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'dr') {
    return {
      form: dr.formOf(player), shapeShift: player.tokens.shapeShift ?? 0,
      upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent),
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'th') {
    return {
      mjolnirHome: th.mjolnirHome(player),
      // EK EXACT (0-4). L'ancien bucketing floor-even (1->0, 3->2) — hérité du fix « boost
      // fantôme » de Math.round — faisait sous-évaluer Odinforce/Bottled Lightning d'1 dmg
      // un tour sur deux (audit Thor, user 2026-07-09 « il n'est pas supposé être aussi
      // faible »). 5 états au lieu de 3 : coût de cache négligeable.
      electrokinesis: Math.min(4, player.tokens.electrokinesis ?? 0),
      guardBreak: player.tokens.guardBreak ?? 0, upgradeIds: player.upgradesInPlay,
      defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player),
      heIsWorthy: player.hand.includes('he-is-worthy') && player.cp >= 1,
    }
  }
  if (player.heroId === 'rv') {
    return {
      feathers: player.tokens.feather, nevermoreOnOpponent: (opponent.tokens.nevermore ?? 0) > 0,
      hexed: (player.tokens.hex ?? 0) > 0, upgradeIds: player.upgradesInPlay,
      defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'hh') {
    const t = player.tokens
    return {
      dreadful: t.dreadful, hasHead: t.head > 0, upgradeIds: player.upgradesInPlay,
      defenseTax: defenseTaxFor(opponent), grimPursuit: t.grimPursuit,
      // L'IA PLANIFIE aussi ses gardes autour de ses cartes de conversion (user-caught :
      // elle réparait après coup mais ne chassait jamais). Le suivi-de-plan est assuré par
      // le scoring-par-replay de ses fenêtres : jouer la carte qui complète l'Ultimate gagne
      // ~14 PV au replay, largement au-dessus de son bruit de décision.
      wildcards: wildcardFlagsFor(player),
    }
  }
  if (player.heroId === 'fm') {
    return { armorCount: fm.armorCount(player), upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player) }
  }
  // opponent.timeBombs is on PlayerState directly (Time Bomb is hero-agnostic — it's
  // inflicted BY Black Widow but stacks on whichever opponent she's hitting).
  return { upgrades: player.upgradesInPlay.length, tbOnOpp: opponent.timeBombs.length, upgradeIds: player.upgradesInPlay, defenseTax: defenseTaxFor(opponent), wildcards: wildcardFlagsFor(player) }
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
    // Étape 3 des règles « Final DMG Total » (page vérifiée user 2026-07-08) : les divisions
    // s'appliquent EN DERNIER, chacune calculée INDÉPENDAMMENT sur le sous-total de l'étape 2
    // (division toujours arrondie vers le haut). Deux ½ sur un sous-total S : S - 2·ceil(S/2)
    // <= 0 -> le « double Agility = 100% » du leaflet BW en découle naturellement.
    let final = pa.remaining
    const halv = pa.halvings ?? 0
    if (halv > 0 && pa.remaining > 0) {
      const per = Math.ceil(pa.remaining / 2)
      final = Math.max(0, pa.remaining - halv * per)
      log(state, pa.defenderIdx, 'defense', `Final total: subtotal ${pa.remaining}, ${halv} halving(s) of ${per} -> ${final}`)
    }
    queueDamage(state, pa.defenderIdx, final)
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
  self.thrownThisTurn = 0
  self.ekDrawUsedThisTurn = false
  self.comboSpentThisTurn = false
  self.smAttackedThisPhase = false
  self.swingEscapeArmed = false
  self.smInvisDefendArmed = false
  self.smInvisRerollArmed = false
  // Footwork (du) : « one Bonus per turn » — remis à zéro pour les DEUX joueurs à chaque
  // upkeep, car le bonus DÉFENSIF du Duelist se consomme pendant le tour de l'adversaire.
  state.players[0].footworkBonusUsedThisTurn = false
  state.players[1].footworkBonusUsedThisTurn = false

  // Disarm (du, jeton vérifié) : le porteur peut défausser 1 carte, sinon il saute son
  // Income Phase. IA/défaut : défausser la moins chère si la main le permet (l'income vaut
  // 1 CP + 1 pioche > 1 carte faible) ; main vide = skip forcé.
  if ((self.tokens.disarm ?? 0) > 0) {
    self.tokens.disarm = 0
    const heroTD = heroTemplateFor(self.heroId)
    // Joueur humain : SON choix pré-armé (duDisarmChoice = 'skip' ou l'id à défausser) —
    // jamais de décision automatique (leçon Guard Break). IA : défausse la moins chère.
    const humanChoice = self.humanControlled ? self.duDisarmChoice : undefined
    self.duDisarmChoice = undefined
    const chosen = humanChoice && humanChoice !== 'skip' ? humanChoice
      : policy.chooseDiscardForRoar?.(state, playerIdx, self.hand.slice())
    const pick = (humanChoice === 'skip' || self.hand.length === 0) ? undefined
      : (chosen && self.hand.includes(chosen)) ? chosen
      : self.hand.slice().sort((x, y) => (cardById(heroTD, x)?.cpCost ?? 0) - (cardById(heroTD, y)?.cpCost ?? 0))[0]
    if (pick !== undefined) {
      self.hand.splice(self.hand.indexOf(pick), 1)
      self.discard.push(pick)
      log(state, playerIdx, 'upkeep', `Disarm: discarded ${pick}, token removed`)
    } else {
      self.skipIncomeThisTurn = true
      log(state, playerIdx, 'upkeep', 'Disarm: no card to discard — Income Phase will be skipped, token removed')
    }
  }

  // Reposition (du, passif OBLIGATOIRE) : 1 ou 2 Steps dans une direction choisie ; recul
  // d'EXACTEMENT 1 => +1 Guard Break. Humain : préférence pré-armée (duRepositionDir) ;
  // IA : recul de 1 tant que le GB n'est pas au cap (jeton + position défensive), sinon
  // avance vers le haut de la piste (le bonus offensif paie sur l'attaque du tour).
  if (self.heroId === 'du') {
    const legal = du.repositionLegalDirections(self)
    let dir: 'forward' | 'backward' = 'forward'
    let steps: 1 | 2 = 1
    const pref = self.humanControlled ? self.duRepositionDir : undefined
    if (pref) {
      dir = pref.startsWith('forward') ? 'forward' : 'backward'
      steps = pref === 'forward2' || pref === 'backward2' ? 2 : 1
    } else if ((self.tokens.guardBreak ?? 0) < th.GB_CAP && legal.includes('backward')) {
      dir = 'backward'; steps = 1
    } else if (legal.includes('forward')) {
      dir = 'forward'; steps = Math.min(2, du.FOOTWORK_MAX - du.footworkPos(self)) as 1 | 2
    } else {
      dir = 'backward'; steps = 1
    }
    if (!legal.includes(dir)) dir = legal[0] // au bout de la piste : direction forcée
    const r = du.applyReposition(self, dir, steps)
    log(state, playerIdx, 'upkeep', `Reposition: ${Math.abs(r.moved)} step(s) ${dir} (position ${du.footworkPos(self)})${r.gbGained > 0 ? ', +1 Guard Break' : ''}`)
  }

  // Strength of the Ocean (mb, leaflet vérifié) : à SON Upkeep, 1×/tour, dépense au choix —
  // 1 jeton -> +1 CP ; 2 jetons -> +1 CP et Heal 2. IA : 2 si blessé, sinon 1 (mb.rules.ts).
  // TODO : choix pré-armé pour l'humain si demandé.
  if (self.heroId === 'mb' && (self.tokens.strengthOcean ?? 0) > 0) {
    const count = mb.oceanUpkeepChoice(self)
    if (count === 1 || count === 2) {
      const r = mb.spendOcean(self, count)
      grantCp(self, r.cp)
      if (r.heal > 0) self.hp = Math.min(mb.HEAL_CAP, self.hp + r.heal)
      log(state, playerIdx, 'upkeep', `Strength of the Ocean: spent ${count} -> +${r.cp} CP${r.heal ? ` and healed ${r.heal}` : ''} (${self.tokens.strengthOcean} left)`)
    }
  }

  // Sun Dial (se, leaflet vérifié) : côté DUSK, +1 à SON upkeep ; à 5 -> flip DAWN immédiat.
  if (self.heroId === 'se' && !se.isDawn(self)) {
    const r = se.increaseDial(self, 1)
    log(state, playerIdx, 'upkeep', `Sun Dial (DUSK): +1 (now ${se.dialOf(self)})${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''}`)
  }

  // Burn (Pyromancer, jeton vérifié) : 2 dmg à l'upkeep du porteur, PERSISTANT (ne se
  // retire pas). Fire Mastery « cool off » : le porteur retire 1 jeton (obligatoire).
  if ((self.tokens.burn ?? 0) > 0) {
    self.hp -= py.BURN_UPKEEP_DMG
    log(state, playerIdx, 'upkeep', `Burn: received ${py.BURN_UPKEEP_DMG} dmg (persistent)`)
    if (checkGameOver(state)) return
  }
  if ((self.tokens.fireMastery ?? 0) > 0 && py.coolOff(self)) {
    log(state, playerIdx, 'upkeep', `Fire Mastery cool off: -1 (now ${self.tokens.fireMastery})`)
  }

  // Regenerate (soigne, flip/retire) + Wound (1 dmg + d6 4-6 retire) — jetons Druid,
  // portables par n'importe qui (Wound s'inflige a l'adversaire).
  if ((self.tokens.regen2 ?? 0) > 0 || (self.tokens.regen1 ?? 0) > 0 || (self.tokens.wound ?? 0) > 0) {
    const rw = dr.upkeepRegenAndWound(self, rng)
    if (rw.healed > 0) log(state, playerIdx, 'upkeep', `Regenerate: healed ${rw.healed}`)
    if (rw.woundDamage > 0) log(state, playerIdx, 'upkeep', `Wound: ${rw.woundDamage} dmg, rolls [${rw.woundRolls.join(',')}], ${rw.woundsRemoved} removed`)
    if (checkGameOver(state)) return
  }

  // Nevermore Die Roll (leaflet verifie) : le detenteur NON-rv lance 1 de a son upkeep.
  // (skippé si la fenêtre interactive Cull!/Feathers l'a déjà résolu ce tour)
  if (self.heroId !== 'rv' && (self.tokens.nevermore ?? 0) > 0 && opp.heroId === 'rv'
      && !state.nevermoreRollResolved) {
    let face = rollDie(rng)
    // Plumes de l'IA rv (jeton verifie : 1 plume = relance forcee, 2 = ±1) : VETO sur la
    // face 6 (cadran efface, retour sans soin — la seule mauvaise face). 2 plumes -> 6
    // devient 5 (vol de CP, cadran sauve) ; sinon 1 plume -> relance. (Avant : l'IA ne
    // depensait JAMAIS une plume — ressource dormante, pattern Grim Pursuit.)
    if (face === 6 && (opp.nevermoreDial ?? 0) > 0) {
      if ((opp.tokens.feather ?? 0) >= 2) {
        opp.tokens.feather -= 2
        face = 5
        log(state, (1 - playerIdx) as 0 | 1, 'upkeep', 'Feathers x2 spent: Nevermore Die shifted 6 -> 5')
      } else if ((opp.tokens.feather ?? 0) >= 1) {
        opp.tokens.feather -= 1
        face = rollDie(rng)
        log(state, (1 - playerIdx) as 0 | 1, 'upkeep', `Feather spent: Nevermore Die re-rolled -> ${face}`)
      }
    }
    const r = rv.applyNevermoreDieFace(opp, self, face)
    log(state, playerIdx, 'upkeep', `Nevermore Die Roll: ${face}` +
      (r.hexInflicted ? ' — gains Hex (6s are blanks this turn)' :
       r.activations ? ` — Raveness activates Nevermore x${r.activations}` :
       r.discards ? ' — must discard 1 of choice' :
       r.cpStolen !== undefined ? ` — loses ${r.cpStolen} CP to the Raveness` :
       ' — dial to 0, Nevermore returns (no heal)'))
    if (r.activations) performNevermoreActivations(state, (1 - playerIdx) as 0 | 1, r.activations, rng, undefined)
    if (r.discards && self.hand.length) {
      const heroT2 = heroTemplateFor(self.heroId)
      const chosen = policy.chooseDiscardForRoar?.(state, playerIdx, self.hand.slice())
      const pick = (chosen && self.hand.includes(chosen)) ? chosen
        : self.hand.slice().sort((x, y) => (cardById(heroT2, x)?.cpCost ?? 0) - (cardById(heroT2, y)?.cpCost ?? 0))[0]
      self.hand.splice(self.hand.indexOf(pick), 1)
      self.discard.push(pick)
      log(state, playerIdx, 'upkeep', `Nevermore: discarded ${pick}`)
    }
    if (checkGameOver(state)) return
  }
  if (state.nevermoreRollResolved) state.nevermoreRollResolved = false

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
  // Concussion (mb, jeton vérifié) : le porteur SAUTE son Income Phase puis retire le jeton.
  if ((self.tokens.concussion ?? 0) > 0) {
    self.tokens.concussion = 0
    log(state, playerIdx, 'income', 'Income Phase skipped (Concussion) — token removed')
    return
  }
  // Disarm non payé à l'upkeep (du) : l'Income Phase est sautée entièrement.
  if (self.skipIncomeThisTurn) {
    self.skipIncomeThisTurn = false
    log(state, playerIdx, 'income', 'Income Phase skipped (Disarm)')
    return
  }
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

  if (card.id === 'nevermore-attack') {
    // "Activate Nevermore. Then choose if the player that Nevermore is on Heals 2 or receives 2 dmg."
    performNevermoreActivations(state, playerIdx, 1, rng, undefined)
    const holderIdx = rv.nevermoreHolder(state)
    const holder = state.players[holderIdx]
    const mode = holderIdx === playerIdx ? 'heal' : 'damage'
    if (mode === 'heal') { holder.hp = Math.min(holder.hp + 2, 60); log(state, playerIdx, phase, `Nevermore Attack!: ${holderIdx === playerIdx ? 'self' : 'opponent'} heals 2`) }
    else { holder.hp -= 2; log(state, playerIdx, phase, 'Nevermore Attack!: holder receives 2 dmg'); checkGameOver(state) }
    return
  }
  if (card.id === 'midnight-dreary') {
    const rolls5 = rollDice(5, rng)
    const wings5 = rolls5.filter((d: number) => d >= 4 && d <= 5).length
    const eyes5 = rolls5.filter((d: number) => d === 6).length
    const gained5 = rv.grantFeathers(self, wings5)
    log(state, playerIdx, phase, `Midnight Dreary!: rolled [${rolls5.join(',')}] — +${gained5} Feather${eyes5 > 0 ? ', Raven Eye -> Activate Nevermore' : ''}`)
    if (eyes5 > 0) performNevermoreActivations(state, playerIdx, 1, rng, undefined)
    return
  }
  if (card.id === 'broken-stillness') {
    log(state, playerIdx, phase, 'Broken Stillness!: Activate Nevermore')
    performNevermoreActivations(state, playerIdx, 1, rng, undefined)
    return
  }
  if (card.id === 'power-trip') {
    drawCards(self, 1, rng)
    th.gainEk(self, 2)
    log(state, playerIdx, phase, 'Power Trip!: drew 1, +2 EK')
    return
  }
  if (card.id === 'time-to-hammer') {
    if (self.mjolnirAway === true) {
      const r = th.shuttleOnce(self) // Retrieve
      grantCp(self, 1)
      th.gainEk(self, 1)
      log(state, playerIdx, phase, `Time to Hammer!: Retrieve Mjolnir, +1 CP, +${1 + r.ekGained} EK`)
    }
    return
  }
  if (card.id === 'stormbreak') {
    drawCards(self, 1, rng)
    grantCp(self, 1)
    th.gainGb(self, 1)
    th.gainEk(self, 1)
    log(state, playerIdx, phase, 'Stormbreak!: drew 1, +1 CP, +1 Guard Break, +1 EK')
    return
  }
  if (card.id === 'hibernate') {
    if (dr.formOf(self) !== 'bear') { self.form = 'bear' }
    dr.grantRegen2(self, 1)
    log(state, playerIdx, phase, 'Hibernate!: Bear Form, +Regenerate (2)')
    return
  }
  if (card.id === 'ready-to-pounce') {
    if (dr.formOf(self) !== 'cat') { self.form = 'cat' }
    opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1)
    log(state, playerIdx, phase, 'Ready to Pounce!: Cat Form, Wound inflicted')
    return
  }
  if (card.id === 'natures-rest') {
    if (dr.formOf(self) !== 'druid') { self.form = 'druid' }
    drawCards(self, 1, rng)
    log(state, playerIdx, phase, "Nature's Rest!: Druid Form, drew 1")
    return
  }
  if (card.id === 'quick-morph') {
    const g = dr.grantShapeShift(self, 1)
    log(state, playerIdx, phase, `Quick Morph!: +${g} Shape Shift`)
    return
  }
  if (card.id === 'natures-cycle') {
    if ((self.tokens.regen1 ?? 0) > 0) { self.tokens.regen1 -= 1; self.tokens.regen2 = (self.tokens.regen2 ?? 0) + 1 }
    log(state, playerIdx, phase, "Nature's Cycle!: flipped a Regenerate (1) to (2)")
    return
  }
  if (card.id === 'fey-lure') {
    dr.grantRegen2(self, 1)
    log(state, playerIdx, phase, 'Fey Lure!: +Regenerate (2)')
    return
  }
  if (card.id === 'strength-of-the-woods') {
    if (dr.formOf(self) !== 'druid') { log(state, playerIdx, phase, 'Strength of the Woods!: no effect (not in Druid Form)'); return }
    const sw = rollDie(rng)
    if (sw <= 3) { opp.hp -= 2; log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> 2 dmg`); checkGameOver(state) }
    else if (sw <= 5) { const g = dr.grantShapeShift(self, 1); log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> +${g} Shape Shift`) }
    else { self.hp = Math.min(self.hp + 3, 60); log(state, playerIdx, phase, `Strength of the Woods!: rolled ${sw} -> Heal 3`) }
    return
  }
  if (card.id === 'yikes') {
    const g = sm.gainInvisibility(self)
    log(state, playerIdx, phase, `Yikes!: ${g ? 'gained Invisibility' : 'Invisibility already held (stack 1)'}`)
    return
  }
  if (card.id === 'radioactive-blood') {
    const g = sm.gainCombo(self)
    log(state, playerIdx, phase, `Radioactive Blood!: ${g ? 'gained Combo' : 'Combo already held (stack 1)'}`)
    return
  }
  if (card.id === 'web-shooters') {
    const r = sm.inflictWebbed(opp)
    if (r.gained) { queueDamage(state, (1 - playerIdx) as 0 | 1, r.isoDamage); flushDamage(state); log(state, playerIdx, phase, 'Web Shooters!: Webbed inflicted (2 isolated undefendable dmg)'); checkGameOver(state) }
    else log(state, playerIdx, phase, 'Web Shooters!: opponent already Webbed (stack 1) — no effect')
    return
  }
  if (card.id === 'booyah') {
    const by = rollDie(rng)
    if (by <= 3) { const g = sm.gainInvisibility(self); log(state, playerIdx, phase, `Booyah!: rolled ${by} (Thwip) -> ${g ? 'gained Invisibility' : 'Invisibility already held'}`) }
    else if (by <= 5) {
      const r = sm.inflictWebbed(opp)
      if (r.gained) { queueDamage(state, (1 - playerIdx) as 0 | 1, r.isoDamage); flushDamage(state); log(state, playerIdx, phase, `Booyah!: rolled ${by} (Web) -> Webbed inflicted (2 iso dmg)`); checkGameOver(state) }
      else log(state, playerIdx, phase, `Booyah!: rolled ${by} (Web) -> opponent already Webbed`)
    } else { const g = sm.gainCombo(self); log(state, playerIdx, phase, `Booyah!: rolled ${by} (Spider) -> ${g ? 'gained Combo' : 'Combo already held'}`) }
    return
  }
  if (card.id === 'milkshake-me') {
    self.hp = Math.min(self.hp + 3, 60)
    log(state, playerIdx, phase, 'Milkshake Me!: healed 3')
    return
  }
  if (card.id === 'cha-ching') {
    grantCp(self, 2)
    log(state, playerIdx, phase, 'Cha-Ching!: +2 CP')
    return
  }
  if (card.id === 'sashay') {
    // « 1 Step forward + 2 dmg OU 1 Step backward + Heal 2 » — humain : SON toggle pré-armé
    // duSashayHeal (user-caught : plus AUCUN choix auto pour l'humain) ; IA : heuristique PV.
    const back = self.humanControlled ? self.duSashayHeal === true : self.hp <= 35
    if (back) {
      const moved = du.takeSteps(self, -1)
      self.hp = Math.min(self.hp + 2, 60)
      log(state, playerIdx, phase, `Sashay: ${Math.abs(moved)} step backward (position ${du.footworkPos(self)}), healed 2`)
    } else {
      const moved = du.takeSteps(self, 1)
      opp.hp -= 2
      log(state, playerIdx, phase, `Sashay: ${moved} step forward (position ${du.footworkPos(self)}), 2 dmg`)
      checkGameOver(state)
    }
    return
  }
  if (card.id === 'courageous-advance') {
    const moved = du.takeSteps(self, 2)
    log(state, playerIdx, phase, `Courageous Advance!: ${moved} step(s) forward (position ${du.footworkPos(self)})`)
    return
  }
  if (card.id === 'all-in-the-wrists') {
    const g = du.inflictDisarm(opp)
    log(state, playerIdx, phase, `All in the Wrists: ${g > 0 ? 'Disarm inflicted' : 'opponent already Disarmed (stack 1)'}`)
    return
  }
  if (card.id === 'confident-footing') {
    if (du.footworkPos(self) === 0) {
      const g = th.gainGb(self, 2)
      log(state, playerIdx, phase, `Confident Footing: +${g} Guard Break (Neutral)`)
    } else {
      log(state, playerIdx, phase, 'Confident Footing: no effect (not on Neutral)')
    }
    return
  }
  if (card.id === 'sea-song') {
    // « Remove Strength of the Ocean to gain 2 CP » (carte vérifiée, 0 CP, instant).
    if ((self.tokens.strengthOcean ?? 0) < 1) { log(state, playerIdx, phase, 'Sea Song!: no Ocean token — no effect'); return }
    self.tokens.strengthOcean -= 1
    grantCp(self, 2)
    log(state, playerIdx, phase, 'Sea Song!: removed Strength of the Ocean -> +2 CP')
    return
  }
  if (card.id === 'haka') {
    // « Gain 1 Strength. You may spend an additional 2 CP to gain 2 Strengths instead. »
    // IA : le +2 CP ne paie que pour vider un excédent (2 slots ouverts + CP >= 5 après coût).
    const extra = !self.humanControlled && self.cp >= 5
      && (self.tokens.strengthMountain ?? 0) + (self.tokens.strengthSky ?? 0) + (self.tokens.strengthOcean ?? 0) <= 5
    const n = extra ? 2 : 1
    if (extra) self.cp -= 2
    const gained: string[] = []
    for (let i = 0; i < n; i++) { const k = mb.gainStrength(self); if (k) gained.push(k.replace('strength', '')) }
    log(state, playerIdx, phase, `Haka!: ${extra ? 'spent +2 CP, ' : ''}gained ${gained.length ? gained.join(' + ') : 'nothing (all Strengths at cap)'}`)
    return
  }
  if (card.id === 'enjoy-the-view') {
    // CHOIX : gain Sky OU Heal 2. IA : Sky si slot ouvert, sinon soin.
    if ((self.tokens.strengthSky ?? 0) < mb.SKY_CAP) {
      mb.gainStrengthOf(self, 'strengthSky')
      log(state, playerIdx, phase, 'Enjoy the View!: gained Strength of the Sky')
    } else {
      self.hp = Math.min(mb.HEAL_CAP, self.hp + 2)
      log(state, playerIdx, phase, 'Enjoy the View!: healed 2')
    }
    return
  }
  if (card.id === 'explosive-flex') {
    // CHOIX : gain Mountain OU 2 dmg. IA : Mountain si slot ouvert, sinon dégâts.
    if ((self.tokens.strengthMountain ?? 0) < mb.MOUNTAIN_CAP) {
      mb.gainStrengthOf(self, 'strengthMountain')
      log(state, playerIdx, phase, 'Explosive Flex!: gained Strength of the Mountain')
    } else {
      opp.hp -= 2
      log(state, playerIdx, phase, 'Explosive Flex!: 2 dmg to opponent')
      checkGameOver(state)
    }
    return
  }
  if (card.id === 'spirit-chant') {
    const sc = rollDie(rng)
    if (sc <= 3) {
      const g = mb.inflictConcussion(opp)
      log(state, playerIdx, phase, `Spirit Chant!: rolled ${sc} (Fist) -> ${g ? 'Concussion inflicted' : 'opponent already Concussed'}`)
    } else if (sc <= 5) {
      drawCards(self, 2, rng)
      log(state, playerIdx, phase, `Spirit Chant!: rolled ${sc} (Spirit) -> drew 2`)
    } else {
      const g1 = mb.gainStrength(self), g2 = mb.gainStrength(self)
      const names = [g1, g2].filter(Boolean).map(k => (k as string).replace('strength', ''))
      log(state, playerIdx, phase, `Spirit Chant!: rolled 6 (Peak) -> gained ${names.length ? names.join(' + ') : 'nothing (caps)'}`)
    }
    return
  }
  if (card.id === 'clouds-parting') {
    const cp6 = rollDie(rng)
    const inc = Math.ceil(cp6 / 2)
    const r = se.increaseDial(self, inc)
    log(state, playerIdx, phase, `Clouds Parting!: rolled ${cp6} -> Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal)` : ''}${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''}`)
    return
  }
  if (card.id === 'solstice') {
    // CHOIX : 2 dmg à tous les adversaires OU Heal 2 (1v1). Humain : SON toggle pré-armé
    // seSolsticeHeal (plus d'heuristique auto) ; IA : dmg sauf si PV bas.
    const heal = self.humanControlled ? self.seSolsticeHeal === true : self.hp <= 35
    if (heal) { self.hp = Math.min(60, self.hp + 2); log(state, playerIdx, phase, 'Solstice!: healed 2') }
    else { opp.hp -= 2; log(state, playerIdx, phase, 'Solstice!: 2 dmg to opponent'); checkGameOver(state) }
    return
  }
  if (card.id === 'here-comes-the-sun') {
    if (se.isDawn(self)) { log(state, playerIdx, phase, 'Here Comes the Sun!: no effect (DAWN side)'); return }
    const r = se.increaseDial(self, 2)
    log(state, playerIdx, phase, `Here Comes the Sun!: Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal)` : ''}${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''}`)
    return
  }
  if (card.id === 'it-gives-life') {
    const before = se.dialOf(self)
    if (before < 1) { log(state, playerIdx, phase, 'It Gives Life!: no effect (Sun Dial at 0)'); return }
    const r = se.reduceDial(self, before)
    const healed = Math.min(5, r.reduced)
    self.hp = Math.min(60, self.hp + healed)
    log(state, playerIdx, phase, `It Gives Life!: Sun Dial -${r.reduced} -> healed ${healed}${r.flipped === 'dusk' ? ' — FLIPS to DUSK' : ''}`)
    return
  }
  if (card.id === 'the-suns-blessing') {
    const sb = rollDie(rng)
    if (sb <= 3) { const g = se.gainChargedGem(self); log(state, playerIdx, phase, `The Sun's Blessing!: rolled ${sb} (Stave) -> ${g ? 'gained Charged Gem' : 'Charged Gem already held'}`) }
    else if (sb <= 5) { drawCards(self, 2, rng); log(state, playerIdx, phase, `The Sun's Blessing!: rolled ${sb} (Charge) -> drew 2`) }
    else { const r = se.setDialTo5(self); log(state, playerIdx, phase, `The Sun's Blessing!: rolled 6 (Sun Power) -> Sun Dial set to 5${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''}`) }
    return
  }
  if (card.id === 'first-light') {
    if (se.dialOf(self) !== 0) { log(state, playerIdx, phase, 'First Light!: no effect (Sun Dial not at 0)'); return }
    const r = se.increaseDial(self, 2)
    const g = se.inflictSunMarked(opp)
    log(state, playerIdx, phase, `First Light!: Sun Dial +${r.gained}, ${g ? 'Sun Marked inflicted' : 'opponent already Sun Marked'}`)
    return
  }
  if (card.id === 'the-glorious-sun') {
    se.flipDial(self)
    log(state, playerIdx, phase, `The Glorious Sun!: Sun Dial flipped -> ${se.isDawn(self) ? 'DAWN' : 'DUSK'} (${se.dialOf(self)})`)
    return
  }
  if (card.id === 'warm-up') {
    // « Spend CP as desired » : humain = son choix pré-armé (warmUpCpChoice) ; IA = remplit
    // jusqu'au cap (le FM se dépense via Combustion/Red Hot, 1 CP -> 1 FM est bon taux).
    const g1 = py.gainFm(self, 1)
    const room = py.fmCap(self) - (self.tokens.fireMastery ?? 0)
    const want = self.humanControlled ? Math.max(0, Math.min(self.warmUpCpChoice ?? 0, self.cp)) : Math.min(self.cp, room)
    const spend = Math.min(want, self.cp)
    self.cp -= spend
    const g2 = spend > 0 ? py.gainFm(self, spend) : 0
    self.warmUpCpChoice = undefined
    log(state, playerIdx, phase, `Warm Up!: +${g1 + g2} Fire Mastery (${spend} CP spent)`)
    return
  }
  if (card.id === 'fire-up') {
    self.fmCapBonus = (self.fmCapBonus ?? 0) + 1
    const g = py.gainFm(self, 2)
    log(state, playerIdx, phase, `Fire Up!: Fire Mastery stack limit +1 (now ${py.fmCap(self)}), +${g} Fire Mastery`)
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
    // Trace du jet : dés au début de cette tentative (2 relances restantes = jet initial,
    // puis 1, puis 0 = fenêtre finale). Ce qui n'a pas changé d'un jet au suivant = gardé par le solveur.
    log(state, playerIdx, 'roll', `Roll (relances restantes ${step.rollsRemaining}): [${step.dice.join(',')}]`)
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
const ROLL_MANIPULATION_CARD_IDS = ['one-more-time', 'try-try-again', 'six-it', 'so-wild', 'twice-as-wild', 'samesies', 'he-is-worthy', 'quick-footwork', 'radiant-exchange', 'heavy-hand']

function eligibleRollManipulationCardIds(self: PlayerState): string[] {
  const hero = heroTemplateFor(self.heroId)
  return ROLL_MANIPULATION_CARD_IDS.filter(id => {
    if (!self.hand.includes(id) || self.cp < (cardById(hero, id)?.cpCost ?? 0)) return false
    // Radiant Exchange! (se) : « must reduce by at least 1 » — exige un cadran >= 1.
    if (id === 'radiant-exchange') return self.heroId === 'se' && (self.sunDial ?? 0) >= 1
    return true
  })
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

  // Radiant Exchange! (se) : réduit le cadran à 0 PUIS pose le 6 (le set passe par le chemin
  // générique ci-dessous, cardId gardé pour le coût déjà débité).
  if (choice.cardId === 'radiant-exchange') {
    const r = se.reduceDial(self, se.dialOf(self))
    log(state, playerIdx, 'roll', `Radiant Exchange!: Sun Dial -${r.reduced}${r.flipped === 'dusk' ? ' — FLIPS to DUSK' : ''}`)
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
  {
    // Thor : 1x/tour, depenser 4 Electrokinesis pour piocher 1 (leaflet verifie).
    // Regle : seulement si la main est courte (l'EK vaut aussi +1 dmg x EK sur BL/Odinforce).
    // Dépenses de jetons dont le texte est SUR le jeton (défs vérifiées) : valables pour TOUT
    // détenteur (jetons transférables — audit user 2026-07-09), plus de gate heroId.
    const self = state.players[playerIdx]
    if (!self.humanControlled && !self.ekDrawUsedThisTurn
        && (self.tokens.electrokinesis ?? 0) >= 4 && self.hand.length <= 2) {
      self.tokens.electrokinesis -= 4
      self.ekDrawUsedThisTurn = true
      drawCards(self, 1, rng)
      log(state, playerIdx, phase, 'Electrokinesis x4 spent: drew 1')
    }
    // Charged Gem (IA) : dépense Main Phase jamais négative (CP et/ou 2 dmg indéf.) —
    // auto pour l'IA, bouton pré-armé pour l'humain (UI).
    if (!self.humanControlled && (self.tokens.chargedGem ?? 0) > 0 && phase === 'main1') {
      const opp2 = state.players[(1 - playerIdx) as 0 | 1]
      const r = se.spendChargedGem(self, rng)
      if (r.cp > 0) grantCp(self, r.cp)
      if (r.damage > 0) { opp2.hp -= r.damage; checkGameOver(state) }
      log(state, playerIdx, phase, `Charged Gem: rolled ${r.face} -> ${[r.cp ? '+1 CP' : '', r.damage ? `${r.damage} isolated undefendable dmg` : ''].filter(Boolean).join(' + ')}`)
    }
  }
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
const INSTANT_SELFBUFF_IDS = ['getting-paid', 'double-up', 'triple-up', 'dark-surprise', 'assemble', 'broken-stillness', 'quick-morph', 'power-trip', 'time-to-hammer', 'stormbreak', 'yikes', 'radioactive-blood', 'here-comes-the-sun', 'sea-song', 'haka']

// Conditions d'eligibilite propres aux instants Thor/Spider-Man (textes verifies).
function instantEligible(state: GameState, playerIdx: 0 | 1, id: string): boolean {
  const self = state.players[playerIdx]
  if (id === 'time-to-hammer') return self.mjolnirAway === true // Retrieve : il doit etre chez l'adversaire
  if (id === 'stormbreak') return (self.thrownThisTurn ?? 0) >= 2
  // Stack 1 : gagner un jeton déjà détenu = carte gaspillée
  if (id === 'yikes') return (self.tokens.invisibility ?? 0) < 1
  if (id === 'radioactive-blood') return (self.tokens.combo ?? 0) < 1
  // « Play only if Sun Dial is on the DUSK side » (carte vérifiée)
  if (id === 'here-comes-the-sun') return self.sunDialDawn !== true
  // Sea Song! : « Remove Strength of the Ocean » — exige le jeton
  if (id === 'sea-song') return (self.tokens.strengthOcean ?? 0) >= 1
  // Haka! : inutile si les 3 Strengths sont au cap
  if (id === 'haka') return mb.chooseStrengthKind(self) !== null
  return true
}
// Main Phase Action cards (not Instant-timed, so only in your own Main Phase), other than the
// cross-player status cards (handled separately) and Hero Upgrades: Dancing Pumpkin! (HH), Vegas
// Baby!, Undercover Mission! + Cunning! (BW). All resolve via playActionCard.
const MAIN_PHASE_ACTION_IDS = ['dancing-pumpkin', 'vegas-baby', 'undercover-mission', 'cunning', 'nevermore-attack', 'midnight-dreary', 'hibernate', 'ready-to-pounce', 'natures-rest', 'natures-cycle', 'fey-lure', 'strength-of-the-woods', 'web-shooters', 'booyah', 'milkshake-me', 'cha-ching', 'warm-up', 'fire-up', 'sashay', 'courageous-advance', 'all-in-the-wrists', 'confident-footing', 'clouds-parting', 'solstice', 'it-gives-life', 'the-suns-blessing', 'first-light', 'the-glorious-sun', 'enjoy-the-view', 'explosive-flex', 'spirit-chant']

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
          if (k === 'timeBomb') {
            // une option PAR POSITION distincte : le joueur choisit QUELLE bombe part
            for (const p of [...new Set(state.players[from].timeBombs)])
              options.push({ kind: 'transferToken', cardId: 'transference', tokenKind: k, fromIdx: from, toIdx: to, bombPos: p })
          } else {
            options.push({ kind: 'transferToken', cardId: 'transference', tokenKind: k, fromIdx: from, toIdx: to })
          }
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
  for (const id of INSTANT_SELFBUFF_IDS) if (canAfford(id) && instantEligible(state, playerIdx, id)) options.push({ kind: 'playInstant', cardId: id })
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
      // Mjölnir (th, déf vérifiée : « At ANY time, discard a card to Throw or Retrieve »).
      // Audit Thor 2026-07-09 : l'HUMAIN avait ce bouton, l'IA JAMAIS — le réseau ne pouvait
      // ni rapatrier un marteau coincé (Lightning Rod 9, EK) ni le lancer avant d'attaquer.
      // Offert en Main Phase (le « any time » complet viendrait avec la couche Instants).
      if (player.heroId === 'th' && player.hand.length > 0) {
        options.push({ kind: 'mjolnirShuttle' } as any)
      }
      // Scrap (fm, verifie leaflet) : gold -> soin 1 OU +1 CP ; diamond -> +1 CP ;
      // ultimanium -> pioche 2. Audit 2026-07-05 : l'IA ne scrappait JAMAIS (humain seul).
      if (player.heroId === 'fm') {
        const seen = new Set<string>()
        for (const oreId of player.forge) {
          if (seen.has(oreId)) continue
          // Surplus seulement : un craft coute 2 ore — on ne propose pas de scraper du
          // minerai utile (le reseau sur-scrappait : 99 scraps/8 parties au premier essai).
          if (player.forge.filter(o => o === oreId).length < 3) continue
          seen.add(oreId)
          if (oreId === 'gold-ore') { options.push({ kind: 'scrapOre', oreId, choice: 'cp' } as any); options.push({ kind: 'scrapOre', oreId, choice: 'heal' } as any) }
          else if (oreId === 'diamond-ore') options.push({ kind: 'scrapOre', oreId, choice: 'cp' } as any)
          else if (oreId === 'ultimanium-ore') options.push({ kind: 'scrapOre', oreId, choice: 'draw2' } as any)
        }
      }
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
      // Scrap d'Ore (fm, leaflet « à tout moment ») : Diamond = relance un dé de TON jet,
      // Ultimanium = un dé → 6. Le jet offensif passe par humanScrapDie côté UI ; ici on
      // couvre le JET DE DÉFENSE (user-caught : impossible de relancer le dé Masterwork avec
      // un Diamond Ore). humanControlled only en v1 — offrir au valueGreedy changerait les
      // sims la veille du tournoi (à ouvrir à l'IA avec le re-calibrage post-tournoi).
      if (playerIdx === pr.rollerIdx && state.players[playerIdx].heroId === 'fm'
        && state.players[playerIdx].humanControlled === true) {
        const forge = state.players[playerIdx].forge ?? []
        if (forge.includes('diamond-ore')) {
          pr.dice.forEach((_, i) => options.push({ kind: 'rerollDie', cardId: 'scrap-diamond', dieIndex: i }))
        }
        if (forge.includes('ultimanium-ore')) {
          pr.dice.forEach((v, i) => { if (v !== 6) options.push({ kind: 'setDie', cardId: 'scrap-ultimanium', sets: [{ dieIndex: i, value: 6 }] }) })
        }
      }
      // So Wild! / Twice As Wild! — either player sets the roller's dice to chosen values.
      pushSetDieOptions(pr.dice, canAfford, options)
      // Six-It! / Samesies! / Try Try Again! — Roll Phase Actions on YOUR OWN dice, so
      // roller-only. They already fire via the roller's mid-roll hook during the OFFENSIVE
      // roll; these windows extend them to the post-roll alter windows INCLUDING the defense
      // roll (user-caught: had Samesies! + CP on a defense roll and was never offered it).
      // One More Time! stays offensive-only (its printed text; Better D! is the defense twin).
      if (playerIdx === pr.rollerIdx) {
        if (canAfford('he-is-worthy')) {
          pr.dice.forEach((v, i) => {
            for (const val of [4, 5]) if (v !== val) options.push({ kind: 'setDie', cardId: 'he-is-worthy', sets: [{ dieIndex: i, value: val }] })
          })
        }
        if (canAfford('quick-footwork')) { // du : même effet que He Is Worthy! (1 dé -> 4 ou 5)
          pr.dice.forEach((v, i) => {
            for (const val of [4, 5]) if (v !== val) options.push({ kind: 'setDie', cardId: 'quick-footwork', sets: [{ dieIndex: i, value: val }] })
          })
        }
        if (canAfford('six-it')) {
          pr.dice.forEach((v, i) => { if (v !== 6) options.push({ kind: 'setDie', cardId: 'six-it', sets: [{ dieIndex: i, value: 6 }] }) })
        }
        if (canAfford('radiant-exchange') && player.heroId === 'se' && (player.sunDial ?? 0) >= 1) {
          pr.dice.forEach((v, i) => { if (v !== 6) options.push({ kind: 'setDie', cardId: 'radiant-exchange', sets: [{ dieIndex: i, value: 6 }] }) })
        }
        if (canAfford('heavy-hand')) {
          // Heavy Hand! (mb) : change 1 de tes dés en 1, 2 ou 3 (le chiffre compte pour les
          // suites/of-a-kind, on propose les trois valeurs).
          pr.dice.forEach((v, i) => {
            for (const hv of [1, 2, 3]) if (v !== hv) options.push({ kind: 'setDie', cardId: 'heavy-hand', sets: [{ dieIndex: i, value: hv }] })
          })
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
  if ((action as any).kind === 'scrapOre') {
    const self = state.players[playerIdx]
    const a = action as any
    const i = self.forge.indexOf(a.oreId)
    if (i < 0) return
    if (a.choice === 'heal') self.hp = Math.min(self.hp + 1, 60) // 50 + cap soin 10 (règle vérifiée)
    else if (a.choice === 'cp') grantCp(self, 1)
    else drawCards(self, 2, rng)
    self.forge.splice(i, 1)
    self.discard.push(a.oreId)
    log(state, playerIdx, ctx.phase ?? 'main1', `Scrap: ${a.oreId} -> ${a.choice}`)
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
  if (action.kind === 'mjolnirShuttle') {
    const self = state.players[playerIdx]
    if (self.hand.length === 0) return
    // Défausse la carte la moins utile : un doublon si possible, sinon le coût CP le plus bas.
    const hero = heroTemplateFor(self.heroId)
    let pick = self.hand.find((id, i) => self.hand.indexOf(id) !== i)
    if (!pick) pick = self.hand.slice().sort((a, b) => (cardById(hero, a)?.cpCost ?? 0) - (cardById(hero, b)?.cpCost ?? 0))[0]
    self.hand.splice(self.hand.indexOf(pick), 1)
    self.discard.push(pick)
    const r = th.shuttleOnce(self)
    if (r.damage > 0) { state.players[1 - playerIdx as 0 | 1].hp -= r.damage; checkGameOver(state) }
    log(state, playerIdx, ctx.phase ?? 'main1', `Mjolnir shuttle (discarded ${pick}): ${r.action === 'throw' ? '1 isolated undefendable dmg' : `+${r.ekGained} EK`}`)
    return
  }
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
      // Le joueur choisit SA carte (chosenId, validé upgrade-présent-au-deck) ; sinon
      // heuristique premier-trouvé (IA, comportement historique).
      const found = (action.chosenId && self.deck.includes(action.chosenId) && isUp(action.chosenId))
        ? action.chosenId : self.deck.find(isUp)
      if (found) { self.deck.splice(self.deck.indexOf(found), 1); self.hand.push(found) }
      for (let i = self.deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [self.deck[i], self.deck[j]] = [self.deck[j], self.deck[i]] }
      log(state, playerIdx, ctxPhaseless, found ? `Covert Ops (b): searched ${found} to hand, deck shuffled` : 'Covert Ops (b): no upgrade left in deck, shuffled')
    }
    return
  }
  if (action.kind === 'spendGrimPursuitBonus') return // handled in applyAttackModifiers, not a window

  // Dice-alteration actions mutate the in-progress roll on state.pendingRoll (ORP2 / DRP3).
  const pr = state.pendingRoll
  if (!pr) return
  // Scrap d'Ore (fm) : consomme un Ore de la Forge, PAS une carte — court-circuite
  // spendActionCard. Diamond = relance ; Ultimanium = →6 (leaflet vérifié, défausse l'Ore).
  if (typeof (action as any).cardId === 'string' && (action as any).cardId.startsWith('scrap-')) {
    const self2 = state.players[playerIdx]
    const oreId = (action as any).cardId === 'scrap-diamond' ? 'diamond-ore' : 'ultimanium-ore'
    const oi = (self2.forge ?? []).indexOf(oreId)
    if (oi < 0) return
    self2.forge.splice(oi, 1)
    self2.discard.push(oreId)
    if (action.kind === 'rerollDie') {
      pr.dice[action.dieIndex] = rollDie(rng)
      log(state, playerIdx, ctxPhaseless, `Scrap: ${oreId} -> defense die ${action.dieIndex + 1} rerolled to ${pr.dice[action.dieIndex]}`)
    } else if (action.kind === 'setDie') {
      for (const s of action.sets) pr.dice[s.dieIndex] = s.value
      log(state, playerIdx, ctxPhaseless, `Scrap: ${oreId} -> die set to 6`)
    }
    return
  }
  if (!spendActionCard(state, playerIdx, action.cardId)) return
  if (action.kind === 'setDie') {
    // Radiant Exchange! (se) : le set-à-6 coûte AUSSI la remise du cadran à 0 (carte vérifiée).
    if (action.cardId === 'radiant-exchange') {
      const p2 = state.players[playerIdx]
      const r = se.reduceDial(p2, se.dialOf(p2))
      log(state, playerIdx, 'roll', `Radiant Exchange!: Sun Dial -${r.reduced}${r.flipped === 'dusk' ? ' — FLIPS to DUSK' : ''}`)
    }
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
  else if (kind === 'agility') bw.grantAgility(to, 1)
  else if (kind === 'regen2' || kind === 'regen1') {
    // cap TOTAL Regenerate = 2 (les deux faces confondues, déf vérifiée)
    if ((to.tokens.regen2 ?? 0) + (to.tokens.regen1 ?? 0) < 2) to.tokens[kind] = (to.tokens[kind] ?? 0) + 1
  }
  // générique (user-caught : l'ancien else donnait de l'AGILITY pour tout jeton inconnu) —
  // le stackCap suit la déf vérifiée du jeton, pas le perso qui reçoit.
  else to.tokens[kind] = Math.min(TOKEN_CAPS[kind], (to.tokens[kind] ?? 0) + 1)
}
function removeTransferable(from: PlayerState, kind: TransferableToken, bombPos?: TimeBombPosition): TimeBombPosition | undefined {
  if (kind === 'timeBomb') {
    // bombPos = position choisie par le joueur (user-caught : .pop() transférait une bombe
    // ARBITRAIRE — la 0:02 au lieu de la 0:01 prête à sauter). Défaut sans choix : la plus
    // AVANCÉE (position minimale), le geste évident.
    let i = bombPos !== undefined ? from.timeBombs.indexOf(bombPos) : -1
    if (i < 0) i = from.timeBombs.indexOf('0:01') // défaut : la plus avancée
    if (i < 0) i = 0
    return from.timeBombs.splice(i, 1)[0]
  }
  from.tokens[kind] = Math.max(0, from.tokens[kind] - 1)
  return undefined
}
function applyTransferToken(state: GameState, playerIdx: 0 | 1, action: { cardId: string; tokenKind: TransferableToken; fromIdx: 0 | 1; toIdx: 0 | 1; bombPos?: TimeBombPosition }, _rng: RNG): void {
  const from = state.players[action.fromIdx]
  if (countToken(from, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return
  const pos = removeTransferable(from, action.tokenKind, action.bombPos)
  grantTransferable(state.players[action.toIdx], action.tokenKind, pos)
  log(state, playerIdx, ctxPhaseless, `Transference!: moved ${action.tokenKind} from p${action.fromIdx} to p${action.toIdx}`)
}
function applyRemoveToken(state: GameState, playerIdx: 0 | 1, action: { cardId: string; tokenKind: TransferableToken; targetIdx: 0 | 1; bombPos?: TimeBombPosition }): void {
  const target = state.players[action.targetIdx]
  if (countToken(target, action.tokenKind) <= 0 || !spendActionCard(state, playerIdx, action.cardId)) return
  removeTransferable(target, action.tokenKind, action.bombPos)
  log(state, playerIdx, ctxPhaseless, `Get That Outta Here!: removed ${action.tokenKind} from p${action.targetIdx}`)
}
function applyRemoveAllTokens(state: GameState, playerIdx: 0 | 1, action: { cardId: string; targetIdx: 0 | 1 }): void {
  if (!spendActionCard(state, playerIdx, action.cardId)) return
  const target = state.players[action.targetIdx]
  // covertOps/shapeShift/hex (Unique, défs vérifiées) et le Haunted Head ne sont PAS retirables
  // ainsi — l'exclusion vit dans TRANSFERABLE_TOKENS. User-caught : l'ancien code ne vidait que
  // les 4 jetons de l'ère 2 persos (la régén du Druide survivait à What Status Effects?).
  for (const k of TRANSFERABLE_TOKENS) {
    if (k === 'timeBomb') target.timeBombs = []
    else target.tokens[k] = 0
  }
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

  // Stun (py, jeton vérifié) : le porteur ne peut RIEN faire pendant l'Attaque — aucune
  // défense, aucune carte. Les dégâts passent intégralement.
  if ((defender.tokens.stun ?? 0) > 0 && incomingDamage > 0) {
    log(state, defenderIdx, 'defense', 'Stun: no defense possible — damage goes through')
    queueDamage(state, defenderIdx, incomingDamage)
    flushDamage(state)
    return
  }

  // Guard Break — jeton TRANSFÉRABLE : quiconque le détient peut le dépenser sur sa propre
  // attaque défendable (user-caught : volé au Duelist via Transference!, indépensable ailleurs
  // — le spend vivait dans les closures th/du seulement ; centralisé ici pour les 10 persos).
  // IA : heuristique >= 5 dmg ; humain : son pré-armage (chooseGuardBreakSpend), jamais auto.
  if ((attacker.tokens.guardBreak ?? 0) > 0 && incomingDamage > 0) {
    const atkPolicy = policies[attackerIdx]
    const gbWanted = atkPolicy.chooseGuardBreakSpend
      ? atkPolicy.chooseGuardBreakSpend(state, attackerIdx, incomingDamage)
      : incomingDamage >= 5
    if (gbWanted) {
      const gb = th.tryGuardBreak(attacker, rng)
      log(state, attackerIdx, 'resolveAttack', `Guard Break: spent ${gb.spent}, rolls [${gb.rolls.join(',')}] — ${gb.success ? 'attack is UNDEFENDABLE' : 'failed'}`)
      if (gb.success) { queueAttackDamageVsArmor(state, attackerIdx, incomingDamage, false, rng, policies); return }
    }
  }

  // Webbed (sm, jeton vérifié) : « The next time a player afflicted with this token is Attacked
  // with normal damage, the damage type becomes undefendable instead and this token is
  // immediately removed. » — pas de jet de défense du tout (Invisibility peut encore intervenir
  // dans queueAttackDamageVsArmor).
  if ((defender.tokens.webbed ?? 0) > 0 && incomingDamage > 0) {
    defender.tokens.webbed = 0
    log(state, defenderIdx, 'defense', 'Webbed: incoming attack becomes UNDEFENDABLE, token removed')
    queueAttackDamageVsArmor(state, attackerIdx, incomingDamage, false, rng, policies)
    return
  }

  // DRP3: roll the defense dice, then open the alter window (Golden Rule: the ATTACKER may Tip It!/
  // Helping Hand! the defender's dice; the defender may Better D! to reroll all of them), THEN
  // count on the final dice. The roll's effects (prevention, counter-damage, Dreadful/Grim Pursuit
  // grants, Time Bomb) must reflect the ALTERED dice, so they're resolved after the window (DRP4),
  // not baked into the roll. Active player (the attacker) has priority.
  let hallowedUpgraded = false
  let defenseDice: number[]
  if (defender.heroId === 'th') {
    defenseDice = rollDice(defender.upgradesInPlay.includes('thunder-wheel-ii') ? 4 : 3, rng) // Thunder Wheel
  } else if (defender.heroId === 'dr') {
    // Auto-morph IA : passer Bear avant une grosse defense si Shape Shift dispo.
    if (!defender.humanControlled && dr.formOf(defender) !== 'bear' && (defender.tokens.shapeShift ?? 0) > 0 && incomingDamage >= 5) {
      dr.spendShapeShift(defender, 'bear')
      log(state, defenderIdx, 'defense', 'Shape Shift -> Bear Form (defense)')
    }
    defenseDice = rollDice(dr.thickHideDiceCount(defender), rng) // Thick Hide : 2 (Bear 4)
  } else if (defender.heroId === 'rv') {
    defenseDice = rollDice(5, rng) // Nothing More : 5 des
  } else if (defender.heroId === 'py') {
    defenseDice = rollDice(5, rng) // Molten Armor : 5 des
  } else if (defender.heroId === 'sm') {
    // Deux Defensive Abilities, choix libre du défenseur (ruling user) : humain = sa
    // préférence pré-armée (smDefenseMode), IA = heuristique EV.
    defender.spiderSensePrevented = false
    const mode = defender.humanControlled && defender.smDefenseMode
      ? defender.smDefenseMode
      : sm.chooseDefenseHeuristic(incomingDamage, (defender.tokens.invisibility ?? 0) > 0)
    defender.smDefenseActive = mode
    if (mode === 'counter') {
      defenseDice = rollDice(3, rng) // Counterpunch
      log(state, defenderIdx, 'defense', 'Defensive Ability: Counterpunch (3 dice)')
    } else {
      defenseDice = rollDice(2, rng) // Spider-Sense
      log(state, defenderIdx, 'defense', 'Defensive Ability: Spider-Sense (2 dice)')
      // Invisibility -> Roll Attempt additionnel (board vérifié) : si le jet a raté, on peut
      // dépenser le jeton et relancer. IA : dès que l'attaque vaut >= 4 ; humain : pré-armé.
      if (!sm.spiderSenseSuccess(defenseDice, false) && (defender.tokens.invisibility ?? 0) > 0
        && (defender.humanControlled ? defender.smInvisRerollArmed === true : incomingDamage >= 4)) {
        defender.tokens.invisibility = 0
        defenseDice = rollDice(2, rng)
        log(state, defenderIdx, 'defense', `Spider-Sense: Invisibility spent -> additional Roll Attempt [${defenseDice.join(',')}]`)
      }
      // Swing Escape! (1 CP, jouable APRÈS le jet — carte vérifiée) : Spider-Sense réussit
      // sur Web au lieu de Spider. Joué seulement quand ça convertit échec -> succès.
      if (!sm.spiderSenseSuccess(defenseDice, false) && sm.spiderSenseSuccess(defenseDice, true)
        && defender.hand.includes('swing-escape') && defender.cp >= 1
        && (defender.humanControlled ? defender.swingEscapeArmed === true : incomingDamage >= 3)) {
        defender.cp -= 1
        defender.hand.splice(defender.hand.indexOf('swing-escape'), 1)
        defender.discard.push('swing-escape')
        defender.smDefenseActive = 'sense-swing'
        log(state, defenderIdx, 'defense', 'Swing Escape!: Spider-Sense succeeds on Web instead of Spider')
      }
    }
  } else if (defender.heroId === 'du') {
    defenseDice = rollDice(4, rng) // Retreat : 4 dés
  } else if (defender.heroId === 'se') {
    defenseDice = rollDice(3, rng) // Harness the Light : 3 dés
  } else if (defender.heroId === 'mb') {
    // Wrassle : 2 dés (II : 3) + 1 par Strength of the Sky (jeton vérifié, persistant).
    const nDice = (defender.upgradesInPlay.includes('wrassle-ii') ? 3 : 2) + Math.min(mb.SKY_CAP, defender.tokens.strengthSky ?? 0)
    defenseDice = rollDice(nDice, rng)
  } else if (defender.heroId === 'nx') {
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

  // DRP4: resolve the defense roll's effects on the final dice. Les préventions PLATES vont
  // dans damagePrevented (étape 2 des règles) ; les préventions ½ (Spider-Sense…) se comptent
  // dans `halvings` et s'appliquent À LA FIN (étape 3 — page Final DMG Total, user 2026-07-08).
  let damagePrevented = 0
  let halvings = 0
  if (defender.heroId === 'th') {
    const twUp = defender.upgradesInPlay.includes('thunder-wheel-ii')
    const eff = th.thunderWheelEffects(finalDefenseDice, twUp)
    damagePrevented = eff.prevented
    let thrownBack = 0
    for (let i = 0; i < eff.shuttles; i++) {
      const r = th.shuttleOnce(defender)
      if (r.action === 'throw') thrownBack += r.damage
    }
    if (thrownBack > 0) queueDamage(state, attackerIdx, thrownBack)
    if (eff.ekGain > 0) th.gainEk(defender, eff.ekGain)
    log(state, defenderIdx, 'defense', `Thunder Wheel${twUp ? ' II' : ''}: prevented ${eff.prevented}, ${eff.shuttles} Mjolnir move(s)${thrownBack ? ` (${thrownBack} dmg back)` : ''}, +${eff.ekGain} EK`)
  } else if (defender.heroId === 'dr') {
    const bear = dr.formOf(defender) === 'bear'
    const effTH = dr.thickHideEffects(finalDefenseDice, bear)
    damagePrevented = effTH.prevented
    if (effTH.counterDamage > 0) queueDamage(state, attackerIdx, effTH.counterDamage)
    log(state, defenderIdx, 'defense', `Thick Hide${bear ? ' (Bear)' : ''}: prevented ${effTH.prevented}, ${effTH.counterDamage} dmg back`)
  } else if (defender.heroId === 'rv') {
    const upgradedNM = defender.upgradesInPlay.includes('nothing-more-ii')
    const effNM = rv.nothingMoreEffects(finalDefenseDice, upgradedNM)
    damagePrevented = effNM.prevented
    if (effNM.counterDamage > 0) queueDamage(state, attackerIdx, effNM.counterDamage)
    log(state, defenderIdx, 'defense', `Nothing More${upgradedNM ? ' II' : ''}: prevented ${effNM.prevented}, ${effNM.counterDamage} dmg back${effNM.activations ? `, Nevermore activation` : ''}`)
    if (effNM.activations > 0) performNevermoreActivations(state, defenderIdx, effNM.activations, rng, policies[defenderIdx])
  } else if (defender.heroId === 'py') {
    const tier: 1 | 2 | 3 = defender.upgradesInPlay.includes('molten-armor-iii') ? 3
      : defender.upgradesInPlay.includes('molten-armor-ii') ? 2 : 1
    const eff = py.moltenArmorEffects(finalDefenseDice, tier)
    // Molten Armor ne PRÉVIENT rien : contre-dégâts + FM + Burn (II/III : un F ET un B — ruling).
    if (eff.counterDamage > 0) queueDamage(state, attackerIdx, eff.counterDamage)
    const fmGained = eff.fmGain > 0 ? py.gainFm(defender, eff.fmGain) : 0
    let burnMsg = ''
    if (eff.inflictBurn) {
      const g = py.inflictNegative(attacker, 'burn')
      burnMsg = g > 0 ? ', Burn inflicted on attacker' : ', Burn already on attacker'
    }
    log(state, defenderIdx, 'defense', `Molten Armor${tier > 1 ? ` ${'I'.repeat(tier)}` : ''}: prevented 0, ${eff.counterDamage} dmg back, +${fmGained} Fire Mastery${burnMsg}`)
  } else if (defender.heroId === 'sm') {
    const mode = defender.smDefenseActive ?? 'sense'
    defender.smDefenseActive = undefined
    if (mode === 'counter') {
      const back = sm.counterpunchDamage(finalDefenseDice)
      if (back > 0) queueDamage(state, attackerIdx, back)
      log(state, defenderIdx, 'defense', `Counterpunch: prevented 0, ${back} dmg back`)
    } else {
      // « On Spider, prevent 1/2 dmg (rounded up) » — UNE fois si >=1 Spider (ruling user).
      // ½ = division -> étape 3 : se calcule sur le SOUS-TOTAL final, pas ici (règles).
      const success = sm.spiderSenseSuccess(finalDefenseDice, mode === 'sense-swing')
      if (success) halvings += 1
      defender.spiderSensePrevented = success && incomingDamage > 0
      log(state, defenderIdx, 'defense', `Spider-Sense${mode === 'sense-swing' ? ' (Swing Escape)' : ''}: ${success ? 'will prevent 1/2 of the final subtotal (rounded up)' : 'prevented 0 (no success face)'}, 0 dmg back`)
    }
  } else if (defender.heroId === 'du') {
    // Retreat (board vérifié) : 1 dmg par 2 Blades (II : par Blade) ; pour CHAQUE Boot/Pierce,
    // 1 Step backward OBLIGATOIRE. La position FINALE (après ces Steps) donne le Defensive
    // Bonus (leaflet : « resolved before determining the final dmg total ») — un Bonus/tour.
    const up = defender.upgradesInPlay.includes('retreat-ii')
    const eff = du.retreatEffects(finalDefenseDice, up)
    if (eff.counterDamage > 0) queueDamage(state, attackerIdx, eff.counterDamage)
    const moved = eff.forcedBackSteps > 0 ? du.takeSteps(defender, -eff.forcedBackSteps) : 0
    // Le Bonus défensif ne se résout PAS ici : « resolved before determining the final dmg
    // total » (leaflet) = APRÈS la fenêtre DRP5 — sinon I Hate Waiting (reculer 2 de plus)
    // arrive trop tard, le bonus du tour déjà brûlé sur la mauvaise case (user-caught, 2x).
    log(state, defenderIdx, 'defense', `Retreat${up ? ' II' : ''}: ${eff.counterDamage} dmg back, ${Math.abs(moved)} forced step(s) backward (position ${du.footworkPos(defender)})`)
  } else if (defender.heroId === 'se') {
    // Harness the Light (board vérifié) : Heal 1/Stave ; I : On BB (une fois) Dial +1, On C
    // (une fois) Dial +1 ; II : On B Dial +1, Dial +1 PAR C, On A+B+C -> Charged Gem.
    // Aucune prévention, aucun contre.
    const up = defender.upgradesInPlay.includes('harness-the-light-ii')
    const eff = se.harnessEffects(finalDefenseDice, up)
    if (eff.heal > 0) defender.hp = Math.min(60, defender.hp + eff.heal)
    let dialMsg = ''
    if (eff.dialGain > 0) {
      const r = se.increaseDial(defender, eff.dialGain)
      dialMsg = `, Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal excès)` : ''}${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''}`
    }
    let gemMsg = ''
    if (eff.gem) gemMsg = se.gainChargedGem(defender) > 0 ? ', +Charged Gem' : ', Charged Gem déjà détenu'
    log(state, defenderIdx, 'defense', `Harness the Light${up ? ' II' : ''}: prevented 0, healed ${eff.heal}${dialMsg}${gemMsg}`)
  } else if (defender.heroId === 'mb') {
    // Wrassle (board vérifié) : 1 dmg × Fist en contre, Heal 1 × Spirit, On Peak (une fois)
    // gain 1 Strength. Aucune prévention.
    const up = defender.upgradesInPlay.includes('wrassle-ii')
    const eff = mb.wrassleEffects(finalDefenseDice)
    if (eff.counterDamage > 0) queueDamage(state, attackerIdx, eff.counterDamage)
    if (eff.heal > 0) defender.hp = Math.min(mb.HEAL_CAP, defender.hp + eff.heal)
    let strMsg = ''
    if (eff.strengthOnPeak) {
      const k = mb.gainStrength(defender)
      strMsg = k ? `, +1 ${k.replace('strength', 'Strength of the ')}` : ', Strength au cap (aucun gain)'
    }
    log(state, defenderIdx, 'defense', `Wrassle${up ? ' II' : ''}: prevented 0, ${eff.counterDamage} dmg back, healed ${eff.heal}${strMsg}`)
  } else if (defender.heroId === 'nx') {
    damagePrevented = nx.dragonScalesPrevent(finalDefenseDice[0])
    log(state, defenderIdx, 'defense', `Dragon Scales: face ${finalDefenseDice[0]}, prevented ${damagePrevented}`)
  } else if (defender.heroId === 'fm') {
    const face = finalDefenseDice[0]
    const out = fm.masterworkOutcome(face, defender, incomingDamage,
      defender.humanControlled ? defender.fmForgePref : undefined)
    if (out.mines) {
      const seen = fm.minePeek(defender) // transparence (plan #3) : les 3 cartes regardées
      const r = fm.mine(defender)
      log(state, defenderIdx, 'defense', `Masterwork (Pick): mined — saw [${seen.join(',')}], ${r.revealed.length ? `revealed ${r.revealed.join(',')} to The Forge` : `no reveal, +${r.cpGained} CP`}`)
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
  // Jusqu'à 2 Agility sur la même attaque (clarification vérifiée du leaflet BW :
  // "Double prévention ½ dégâts -> 100 % prévention (calcul simultané)", user-caught).
  // MVP auto-spend ; TODO(user) : décision de Policy/humain.
  let agilitySuccesses = 0
  while (defender.tokens.agility > 0 && remaining > 0 && agilitySuccesses < 2) {
    const r = bw.spendAgilityToHalveDamage(defender, remaining, rng)
    if (r.succeeded) {
      agilitySuccesses += 1
      halvings += 1 // ½ = division -> étape 3, sur le sous-total final (plus de soustraction ici)
      log(state, defenderIdx, 'defense', agilitySuccesses >= 2
        ? `Agility spent: rolled ${r.roll} — SECOND half = 100% prevented (verified clarification)`
        : `Agility spent: rolled ${r.roll} — will prevent 1/2 of the final subtotal`)
    } else {
      remaining = r.remainingDamage
      log(state, defenderIdx, 'defense', `Agility spent: rolled ${r.roll}, no effect`)
      eludeEligible = r.roll >= 5
      break // un échec : on ne brûle pas le 2e jeton automatiquement (MVP conservateur)
    }
  }

  // DRP5: response window (Advanced Rules) — both players have priority in turn, active player
  // (the attacker) first, looping until pass-pass. The defender plays "after being Attacked" cards
  // (Not This Time!, Recoil!, Elude!, Spirited Reprisal!) to whittle `remaining`; either player may
  // also play Instants. The state the window mutates lives on state.pendingAttack, so
  // applyWindowAction('defense') — shared with the RL lookahead — can reach `remaining`.
  state.pendingAttack = { attackerIdx, defenderIdx, remaining, halvings }
  resolveResponseWindow(
    state, [attackerIdx, defenderIdx], { windowType: 'defense', eludeEligible },
    rng, policies, enumerateWindowActions, applyWindowAction,
  )
  // Duelist : le Bonus défensif Footwork se résout ICI — après la fenêtre DRP5, sur la
  // position FINALE (tes cartes comme I Hate Waiting ont pu te déplacer), juste avant le
  // total final (leaflet : « resolved before determining the final dmg total »).
  if (defender.heroId === 'du' && defender.footworkBonusUsedThisTurn !== true && state.pendingAttack) {
    const b = du.defensiveBonus(du.footworkPos(defender))
    if (b.prevent > 0) {
      const prevented = Math.min(state.pendingAttack.remaining, b.prevent)
      state.pendingAttack.remaining -= prevented
      defender.footworkBonusUsedThisTurn = true
      log(state, defenderIdx, 'defense', `Footwork Defensive Bonus: prevented ${prevented} (position ${du.footworkPos(defender)})`)
    } else if (b.draw > 0) {
      drawCards(defender, b.draw, rng)
      defender.footworkBonusUsedThisTurn = true
      log(state, defenderIdx, 'defense', `Footwork Defensive Bonus: drew ${b.draw} (position ${du.footworkPos(defender)})`)
    }
  }
  // Sun Marked (se) : si des dégâts passent encore après la fenêtre DRP5, l'attaquant Heal 2
  // (« en autant qu'il y ait du damage » — ruling user). Évalué sur le TOTAL FINAL (étape 3 :
  // sous-total moins les ½ indépendants), pas sur le sous-total.
  if (state.pendingAttack && (defender.tokens.sunMarked ?? 0) > 0) {
    const paSM = state.pendingAttack
    const perSM = Math.ceil(paSM.remaining / 2)
    const finalSM = Math.max(0, paSM.remaining - (paSM.halvings ?? 0) * perSM)
    if (finalSM > 0) {
      attacker.hp = Math.min(60, attacker.hp + se.SUN_MARKED_HEAL)
      log(state, attackerIdx, 'defense', `Sun Marked: attacker heals ${se.SUN_MARKED_HEAL}`)
    }
  }
  // DRP6: the defender's surviving damage and the attacker's counter-damage land simultaneously.
  finalizePendingAttackDamage(state)
}

// "Play only after being Attacked" Roll Phase Action cards that reduce/negate incoming dmg.
const DEFENSIVE_CARD_IDS = ['not-this-time', 'spirited-reprisal', 'recoil', 'shrug-off', 'dont-poke-the-bear', 'indomitable-will', 'invulnerability', 'nice-try', 'invisible-punch', 'i-hate-waiting', 'sun-shield', 'kapu']

function eligibleDefensiveCardIds(defender: PlayerState, eludeEligible: boolean): string[] {
  const hero = heroTemplateFor(defender.heroId)
  const ids = DEFENSIVE_CARD_IDS.filter(id => {
    if (!defender.hand.includes(id)) return false
    if (id === 'nice-try') return (defender.tokens.invisibility ?? 0) > 0 // défausse le jeton
    if (id === 'invisible-punch') return defender.spiderSensePrevented === true // "si tu as prévenu via Spider-Sense"
    // du : reculer doit être possible ET utile (le Bonus défensif du tour pas encore consommé)
    if (id === 'i-hate-waiting') return defender.heroId === 'du' && (defender.footwork ?? 0) > -2
    if (id === 'sun-shield') return (defender.tokens.chargedGem ?? 0) > 0 // retire le jeton
    if (id === 'kapu') return (defender.tokens.strengthMountain ?? 0) > 0 // retire le jeton
    return true
  })
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
  if (cardId === 'sun-shield') {
    if ((defender.tokens.chargedGem ?? 0) < 1) { log(state, defenderIdx, 'defense', 'Sun Shield!: no Charged Gem — no effect'); return remaining }
    defender.tokens.chargedGem = 0
    const prevented = Math.min(remaining, 3)
    log(state, defenderIdx, 'defense', `Sun Shield!: Charged Gem removed, prevented ${prevented} dmg`)
    return remaining - prevented
  }
  if (cardId === 'kapu') {
    // « Remove Strength of the Mountain to prevent 4 incoming dmg » (carte vérifiée).
    if ((defender.tokens.strengthMountain ?? 0) < 1) { log(state, defenderIdx, 'defense', 'Kapu!: no Mountain token — no effect'); return remaining }
    defender.tokens.strengthMountain -= 1
    const prevented = Math.min(remaining, mb.KAPU_PREVENT)
    log(state, defenderIdx, 'defense', `Kapu!: Strength of the Mountain removed, prevented ${prevented} dmg`)
    return remaining - prevented
  }
  if (cardId === 'i-hate-waiting') {
    // « Take up to 2 Steps backward » APRÈS avoir été attaqué. Le Bonus de la position finale
    // se résout CENTRALEMENT après la fenêtre DRP5 (finalizeDefenseRoll) — cette carte ne fait
    // que déplacer, pour que le bonus tombe sur la bonne case (user-caught : l'ordre inverse
    // brûlait le bonus avant que la carte soit jouable).
    // « up to 2 » : l'humain choisit 1 ou 2 (pré-armé duIHWSteps, défaut 2) ; IA = 2.
    const n = defender.humanControlled ? (defender.duIHWSteps ?? 2) : 2
    const moved = du.takeSteps(defender, -n)
    log(state, defenderIdx, 'defense', `I Hate Waiting: ${Math.abs(moved)} step(s) backward (position ${du.footworkPos(defender)})`)
    return remaining
  }
  if (cardId === 'invulnerability') {
    if ((defender.tokens.electrokinesis ?? 0) < 2) { log(state, defenderIdx, 'defense', 'Invulnerability!: no effect (needs 2 EK)'); return remaining }
    defender.tokens.electrokinesis -= 2
    log(state, defenderIdx, 'defense', `Invulnerability!: -2 EK, ALL ${remaining} dmg prevented`)
    return 0
  }
  if (cardId === 'indomitable-will') {
    if (defender.hp - remaining > 0) { log(state, defenderIdx, 'defense', 'Indomitable Will!: attack is not lethal — no effect'); return remaining }
    const d = rollDie(rng)
    if (d === 4 || d === 5) {
      log(state, defenderIdx, 'defense', `Indomitable Will!: rolled ${d} (Worthy) — Health set to 1`)
      return defender.hp - 1
    }
    log(state, defenderIdx, 'defense', `Indomitable Will!: rolled ${d} — failed`)
    return remaining
  }
  if (cardId === 'shrug-off') {
    if (defender.form !== 'bear') { log(state, defenderIdx, 'defense', 'Shrug Off!: no effect (not in Bear Form)'); return remaining }
    const prevented = Math.min(remaining, 2)
    log(state, defenderIdx, 'defense', `Shrug Off!: prevented ${prevented} dmg (Bear Form)`)
    return remaining - prevented
  }
  if (cardId === 'dont-poke-the-bear') {
    if (defender.form !== 'bear') { log(state, defenderIdx, 'defense', "Don't Poke the Bear!: no effect (not in Bear Form)"); return remaining }
    queueDamage(state, (1 - defenderIdx) as 0 | 1, 2)
    log(state, defenderIdx, 'defense', "Don't Poke the Bear!: 2 dmg back (Bear Form)")
    return remaining
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
    // « Prevent 1/2 » = division -> étape 3 des règles : enregistrée comme halving sur le
    // total final, pas soustraite du sous-total ici.
    if (r.damagePrevented > 0 && state.pendingAttack) {
      state.pendingAttack.halvings = (state.pendingAttack.halvings ?? 0) + 1
      log(state, defenderIdx, 'defense', `Recoil!: will prevent 1/2 of the final subtotal, +${r.cpGained} CP`)
    } else {
      log(state, defenderIdx, 'defense', `Recoil!: prevented 0, +${r.cpGained} CP`)
    }
    return remaining
  }
  if (cardId === 'elude') {
    log(state, defenderIdx, 'defense', `Elude!: ignored all ${remaining} incoming dmg`)
    return 0
  }
  if (cardId === 'nice-try') {
    if ((defender.tokens.invisibility ?? 0) < 1) { log(state, defenderIdx, 'defense', 'Nice Try!: no Invisibility to discard — no effect'); return remaining }
    defender.tokens.invisibility = 0
    const prevented = Math.min(remaining, 3)
    log(state, defenderIdx, 'defense', `Nice Try!: Invisibility discarded, prevented ${prevented} dmg`)
    return remaining - prevented
  }
  if (cardId === 'invisible-punch') {
    if (defender.spiderSensePrevented !== true) { log(state, defenderIdx, 'defense', 'Invisible Punch!: no Spider-Sense prevention this attack — no effect'); return remaining }
    queueDamage(state, (1 - defenderIdx) as 0 | 1, 3)
    log(state, defenderIdx, 'defense', 'Invisible Punch!: 3 dmg back (Spider-Sense prevented)')
    return remaining
  }
  return remaining
}

// "Attack Modifier" Roll Phase Action cards played by the ATTACKER for their own current
// attack. Thundering Hooves! doesn't touch dmg/defendability at all (pure CP->Grim Pursuit
// conversion) but is timed the same way, so it shares this hook rather than inventing a
// separate one.
const ATTACK_MODIFIER_CARD_IDS = ['unescapable', 'cranial-assist', 'subversion', 'thundering-hooves', 'stone-beak', 'talon-strike', 'lethal-swipe', 'surprise-bite', 'ambush', 'huzzah', 'red-hot', 'pick-it-up', 'burst-forward', 'blade-barrage', 'flying-punch', 'wild-strength']

export function eligibleAttackModifierCardIds(self: PlayerState): string[] {
  const hero = heroTemplateFor(self.heroId)
  return ATTACK_MODIFIER_CARD_IDS.filter(id => {
    if (!self.hand.includes(id)) return false
    const card = cardById(hero, id)
    if (!card || self.cp < (card.cpCost ?? 0)) return false
    if (id === 'lethal-swipe' || id === 'surprise-bite') {
      return self.heroId === 'dr' && (self.form === 'cat')
    }
    if (id === 'ambush') {
      return self.heroId === 'sm' && (self.tokens.invisibility ?? 0) > 0 // défausse le jeton
    }
    if (id === 'red-hot') {
      return self.heroId === 'py' && (self.tokens.fireMastery ?? 0) > 0 // +1 dmg par FM
    }
    if (id === 'huzzah') return self.heroId === 'py'
    if (id === 'pick-it-up' || id === 'burst-forward' || id === 'blade-barrage') {
      if (self.heroId !== 'du') return false
      // Burst Forward n'a de sens que si un pas en avant est possible (piste bornée).
      if (id === 'burst-forward') return du.footworkPos(self) < du.FOOTWORK_MAX
      return true // pick-it-up : l'état Disarm de l'adversaire est re-vérifié à la résolution
    }
    if (id === 'flying-punch') {
      return self.heroId === 'mb' && (self.tokens.strengthSky ?? 0) > 0 // retire le jeton
    }
    if (id === 'wild-strength') {
      return self.heroId === 'mb'
    }
    if (id === 'stone-beak' || id === 'talon-strike') {
      if (self.heroId !== 'rv') return false
      if (id === 'stone-beak' && (self.tokens.nevermore ?? 0) > 0) return false // doit etre sur la CIBLE
      return true
    }
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
export function applyAttackModifierCard(state: GameState, playerIdx: 0 | 1, cardId: string, current: AttackModifierResult, rng?: RNG): AttackModifierResult {
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

  if (cardId === 'lethal-swipe') {
    if (!rng) { return { ...current, dmg: current.dmg + 2 } } // scoring : E[claws] ~ 2.5
    const lsRoll = rollDice(5, rng)
    const claws = lsRoll.filter(d => d <= 3).length
    const paws = lsRoll.filter(d => d >= 4 && d <= 5).length
    if (paws >= 2) { opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1) }
    log(state, playerIdx, 'resolveAttack', `Lethal Swipe!: rolled [${lsRoll.join(',')}], +${claws} dmg${paws >= 2 ? ', Wound inflicted' : ''}`)
    return { ...current, dmg: current.dmg + claws }
  }
  if (cardId === 'surprise-bite') {
    log(state, playerIdx, 'resolveAttack', 'Surprise Bite!: attack becomes undefendable (Cat Form)')
    return { ...current, undefendable: true }
  }
  if (cardId === 'stone-beak') {
    // "Play only if Nevermore is on the target of your Attack" — verifie a l'eligibilite.
    log(state, playerIdx, 'resolveAttack', 'Stone Beak!: +1 dmg, attack becomes undefendable')
    return { dmg: current.dmg + 1, undefendable: true }
  }
  if (cardId === 'talon-strike') {
    if (!rng) { rv.grantFeathers(self, 1); return { ...current, dmg: current.dmg + 2 } } // scoring : E[talons] ~ 2.5
    const tsRoll = rollDice(5, rng)
    const tsTalons = tsRoll.filter(d => d <= 3).length
    const g = rv.grantFeathers(self, 1)
    log(state, playerIdx, 'resolveAttack', `Talon Strike!: rolled [${tsRoll.join(',')}], +${tsTalons} dmg, +${g} Feather`)
    return { ...current, dmg: current.dmg + tsTalons }
  }
  if (cardId === 'unescapable') {
    hh.spendGrimPursuit(self, 1)
    log(state, playerIdx, 'resolveAttack', 'Unescapable!: spent 1 Grim Pursuit, attack is now undefendable')
    return { ...current, undefendable: true }
  }
  if (cardId === 'ambush') {
    if ((self.tokens.invisibility ?? 0) < 1) return current // le jeton a pu partir entre l'éligibilité et la résolution
    self.tokens.invisibility = 0
    log(state, playerIdx, 'resolveAttack', 'Ambush!: Invisibility discarded, +3 dmg')
    return { ...current, dmg: current.dmg + 3 }
  }
  if (cardId === 'red-hot') {
    const fmNow = self.tokens.fireMastery ?? 0
    log(state, playerIdx, 'resolveAttack', `Red Hot!: +${fmNow} dmg (1 per Fire Mastery)`)
    return { ...current, dmg: current.dmg + fmNow }
  }
  if (cardId === 'huzzah') {
    if (!rng) { return { ...current, dmg: current.dmg + 2 } } // scoring : E ~ +1.5 dmg + effets
    const hz = rollDie(rng)
    const eff = py.pyroBonusDieEffects(hz)
    if (eff.burn) py.inflictNegative(opp, 'burn')
    if (eff.knockdown) py.inflictNegative(opp, 'knockdown')
    if (eff.fm > 0) py.gainFm(self, eff.fm)
    log(state, playerIdx, 'resolveAttack', `Huzzah!: rolled ${hz} -> ${eff.addDmg > 0 ? `+${eff.addDmg} dmg` : eff.burn ? 'Burn inflicted' : eff.fm > 0 ? '+2 Fire Mastery' : 'Knockdown inflicted'}`)
    return { ...current, dmg: current.dmg + eff.addDmg }
  }
  if (cardId === 'pick-it-up') {
    // « If the opponent is afflicted with Disarm, remove it and add 3 dmg » (carte vérifiée).
    if ((opp.tokens.disarm ?? 0) < 1) { log(state, playerIdx, 'resolveAttack', 'Pick It Up: no effect (opponent not Disarmed)'); return current }
    opp.tokens.disarm = 0
    log(state, playerIdx, 'resolveAttack', 'Pick It Up: Disarm removed, +3 dmg')
    return { ...current, dmg: current.dmg + 3 }
  }
  if (cardId === 'burst-forward') {
    const self2 = state.players[playerIdx]
    const moved = du.takeSteps(self2, 1)
    log(state, playerIdx, 'resolveAttack', `Burst Forward: ${moved} step forward (position ${du.footworkPos(self2)})`)
    return current // le Bonus offensif de la position finale est appliqué par applyDUAbility
  }
  if (cardId === 'blade-barrage') {
    if (!rng) { return { ...current, dmg: current.dmg + 2 } } // scoring : E[Blades] = 2.5
    const bbRoll = rollDice(5, rng)
    const blades = bbRoll.filter(d => d <= 3).length
    const boots = bbRoll.filter(d => d >= 4 && d <= 5).length
    let stepMsg = ''
    if (boots >= 2) {
      const mode = self.humanControlled ? (self.duStepsMode ?? 'forward') : 'forward'
      if (mode !== 'none') {
        const moved = du.takeSteps(self, mode === 'backward' ? -1 : 1)
        if (moved !== 0) stepMsg = `, 1 step ${moved > 0 ? 'forward' : 'backward'} (position ${du.footworkPos(self)})`
      }
    }
    log(state, playerIdx, 'resolveAttack', `Blade Barrage: rolled [${bbRoll.join(',')}], +${blades} dmg${stepMsg}`)
    return { ...current, dmg: current.dmg + blades }
  }
  if (cardId === 'flying-punch') {
    if ((self.tokens.strengthSky ?? 0) < 1) return current // le jeton a pu partir entre l'éligibilité et la résolution
    self.tokens.strengthSky -= 1
    log(state, playerIdx, 'resolveAttack', 'Flying Punch!: Strength of the Sky removed, attack becomes undefendable')
    return { ...current, undefendable: true }
  }
  if (cardId === 'wild-strength') {
    // « Roll 5 dice: For every 2 Fists, add 2 dmg. You may re-roll up to one of these dice per
    // Strength (up to 5 total). » IA : re-roll gloutons des non-Fists tant qu'il reste des
    // re-rolls (1 par jeton Strength possédé, tous types — ruling user 2026-07-16).
    if (!rng) { return { ...current, dmg: current.dmg + 2 } } // scoring : E ≈ +2-3 selon re-rolls
    const wsRoll = rollDice(5, rng)
    let rerolls = Math.min(5, mb.totalStrengths(self))
    const rerolled: number[] = []
    for (let i = 0; i < wsRoll.length && rerolls > 0; i++) {
      if (wsRoll[i] > 3) { wsRoll[i] = rollDie(rng); rerolled.push(i); rerolls -= 1 }
    }
    const fists = wsRoll.filter(d => d <= 3).length
    const bonus = Math.floor(fists / 2) * 2
    log(state, playerIdx, 'resolveAttack', `Wild Strength!: rolled [${wsRoll.join(',')}]${rerolled.length ? ` (${rerolled.length} re-roll(s))` : ''}, ${fists} Fist(s) -> +${bonus} dmg`)
    return { ...current, dmg: current.dmg + bonus }
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
      const gpDice = bonusRollWindow(state, playerIdx, rollDice(5, rng), 'Grim Pursuit', rng, policy)
      const r = hh.spendGrimPursuitForBonusDamage(self, rng, gpDice)
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
    log(state, playerIdx, 'resolveAttack', `${name} bonus roll [${(r as any).dice ? (r as any).dice.join(',') : '?'}]: +${r.bonusDamage} dmg, undefendable=${r.undefendable}, +${r.grimPursuitGained} Grim Pursuit`)
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
  else queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith('Dreadful Charge'), rng, policies)

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
    queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith('Final Touches'), rng, policies)
  }
}

function applyBWAbility(state: GameState, playerIdx: 0 | 1, name: string, rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const data = resolvedAbilityByBoardName(heroTemplateFor('bw'), name, self.upgradesInPlay)
  if (!data) { log(state, playerIdx, 'resolveAttack', `Unknown ability "${name}" — no data, skipped`); return }

  let dmg = data.baseDamage ?? 0
  // Chaque bonus est LOGGÉ pour que le BILAN de l'UI montre l'arithmétique complète
  // (user-caught 2026-07-10 : « 7 base = 10 infligés » sans explication — le +1/upgrade
  // de Gauntlets et le +1 Red Room étaient appliqués en silence).
  if (data.bonusDamagePerUpgrade) {
    const b = data.bonusDamagePerUpgrade * self.upgradesInPlay.length
    dmg += b
    if (b > 0) log(state, playerIdx, 'resolveAttack', `${name}: +${b} dmg (1 per upgrade in play, ${self.upgradesInPlay.length})`)
  }
  if (data.thresholdBonus && self.upgradesInPlay.length >= data.thresholdBonus.upgradesAtLeast) {
    dmg += data.thresholdBonus.bonusDamage
    log(state, playerIdx, 'resolveAttack', `${name}: +${data.thresholdBonus.bonusDamage} dmg (>=${data.thresholdBonus.upgradesAtLeast} upgrades)`)
  }
  const rrtB = bw.rrtAttackBonus(self.upgradesInPlay)
  dmg += rrtB
  if (rrtB > 0) log(state, playerIdx, 'resolveAttack', `Red Room Training: +${rrtB} dmg (>=5 upgrades in play)`)

  if (name.startsWith('Vengeance')) {
    const riderDice = self.upgradesInPlay.includes('vengeance-ii') ? 5 : 4
    const vd = bonusRollWindow(state, playerIdx, rollDice(riderDice, rng), 'Vengeance (rider)', rng, policies[playerIdx])
    const rider = bw.resolveVengeanceRider(self, opp, rng, riderDice, vd)
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
    if (modified.undefendable) queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies)
    else resolveDefense(state, playerIdx, dmg, rng, policies)
  } else {
    queueAttackDamageVsArmor(state, playerIdx, dmg, name.startsWith("Widow's Bite"), rng, policies)
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
    // Ruling user (2026-07-10) : une upgrade qui ENTRE EN JEU déclenche la pioche de Red Room
    // Training II, même via Recon/Widow's Bite (« put into play » compte comme jouée).
    rrtIIDrawOnUpgrade(state, playerIdx, cardId, rng)
  }
  self.deck = remaining
  return found
}

// Queue+flush attack damage that bypasses the defense roll (undefendable/ultimate), letting a
// Forgemaster defender's Ultimanium Shield prevent 2 first (verified leaflet: works vs normal,
// undefendable and pure dmg; NOT vs an Ultimate or collateral).
function queueAttackDamageVsArmor(state: GameState, attackerIdx: 0 | 1, dmg: number, isUltimate: boolean, rng?: RNG, policies?: [Policy, Policy]): void {
  const defenderIdx = (1 - attackerIdx) as 0 | 1
  const defender = state.players[defenderIdx]
  // Invisibility (sm, jeton vérifié) : « When Attacked with an undefendable Attack, may spend
  // this token to activate a Defensive Ability. » Pas contre les Ultimates (même règle que le
  // bouclier Ultimanium — interprétation, voir SPEC). IA : dès 5 dmg ; humain : pré-armé.
  if ((defender.tokens.invisibility ?? 0) > 0 && !isUltimate && dmg > 0 && rng && policies
    && (defender.tokens.stun ?? 0) === 0 // Stun (py) : le porteur ne peut RIEN faire pendant l'Attaque
    && (defender.humanControlled ? defender.smInvisDefendArmed === true : dmg >= 5)) {
    defender.tokens.invisibility = 0
    defender.smInvisDefendArmed = false
    log(state, defenderIdx, 'defense', 'Invisibility spent: defending against the undefendable Attack')
    resolveDefense(state, attackerIdx, dmg, rng, policies)
    return
  }
  if (defender.heroId === 'fm' && dmg > 0) {
    const eff = fm.armorEffects(defender, isUltimate ? 'ultimate' : 'undefendable')
    if (eff.prevented > 0) {
      log(state, defenderIdx, 'defense', `Ultimanium Shield: prevented ${Math.min(eff.prevented, dmg)} (undefendable attack)`)
      dmg = Math.max(0, dmg - eff.prevented)
    }
  }
  // Sun Marked (se, jeton vérifié + ruling) : l'attaquant du porteur Heal 2 sur toute attaque
  // qui inflige des dégâts — indéfendable incluse. Persistant (le jeton reste).
  if (dmg > 0 && (defender.tokens.sunMarked ?? 0) > 0) {
    const att = state.players[attackerIdx]
    att.hp = Math.min(60, att.hp + se.SUN_MARKED_HEAL)
    log(state, attackerIdx, 'defense', `Sun Marked: attacker heals ${se.SUN_MARKED_HEAL}`)
  }
  queueDamage(state, defenderIdx, dmg)
  flushDamage(state)
  // Ceinture et bretelles (bug Druid ressuscité, 2026-07-10) : le chemin indéfendable doit
  // constater la mort lui-même — les appels playTurn/humanAttack le re-vérifient sans effet.
  checkGameOver(state)
}

// ---- Fenêtre de manipulation des JETS BONUS (ruling user 2026-07-10) ----------------------
// Spider-Reflexes (2d6), rider Vengeance, Grim Pursuit (b) : les Roll Phase Actions (Try Try
// Again!, Six-It!, Samesies!, Tip It!…) s'appliquent aussi à ces jets — ils ont lieu pendant
// la Roll Phase. La fenêtre ne s'ouvre QUE pour une policy marquée `humanBonusRoll` (le pont
// interactif) : l'IA, le RL et les sims passent — zéro impact entraînement/lookahead.
export function bonusRollWindow(
  state: GameState, playerIdx: 0 | 1, dice: number[], label: string,
  rng: RNG, rollerPolicy?: Policy,
): number[] {
  if (!rollerPolicy || (rollerPolicy as any).humanBonusRoll !== true) return dice
  const saved = state.pendingRoll
  state.pendingRoll = { rollerIdx: playerIdx, dice: dice.slice() }
  const passP: Policy = { ...greedyHighestDamagePolicy }
  const pair: [Policy, Policy] = playerIdx === 0 ? [rollerPolicy, passP] : [passP, rollerPolicy]
  resolveResponseWindow(state, [playerIdx, (1 - playerIdx) as 0 | 1],
    { windowType: 'offensiveRoll', bonusRoll: true, bonusLabel: label },
    rng, pair, enumerateWindowActions, applyWindowAction)
  const out = state.pendingRoll ? state.pendingRoll.dice.slice() : dice.slice()
  state.pendingRoll = saved
  if (out.join(',') !== dice.join(',')) log(state, playerIdx, 'resolveAttack', `${label} bonus roll altered: [${dice.join(',')}] -> [${out.join(',')}]`)
  return out
}

export function resolveAbilityPhase(state: GameState, playerIdx: 0 | 1, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const policy = policies[playerIdx]
  const self = state.players[playerIdx]
  if (self.heroId === 'nx') { resolveNaraxusAbility(state, playerIdx, dice, rng, policies); return }
  // Hex (Raveness, verifie) : les 6 de l'afflige sont des faces BLANCHES — retirees du matching.
  if ((self.tokens.hex ?? 0) > 0 && dice.includes(6)) {
    const filtered = dice.filter(d => d !== 6)
    log(state, playerIdx, 'resolveAttack', `Hex: ${dice.length - filtered.length} die/dice showing 6 are blank this turn`)
    dice = filtered
  }
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const oState = oracleStateFor(self, opp)

  // Combo (sm) : « resulted in an Attack » — remis à zéro à chaque Offensive Roll Phase,
  // posé par applySMAbility quand une attaque part vraiment.
  if (self.heroId === 'sm') self.smAttackedThisPhase = false

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
  else if (self.heroId === 'rv') applyRVAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'dr') applyDRAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'th') applyTHAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'sm') applySMAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'py') applyPYAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'du') applyDUAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'se') applySEAbility(state, playerIdx, chosenName, dice, rng, policies)
  else if (self.heroId === 'mb') applyMBAbility(state, playerIdx, chosenName, dice, rng, policies)
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
    queueAttackDamageVsArmor(state, bossIdx, 3, false, rng, policies) // 3 indefendables
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
    // 'of their choice' (planche verifiee) : le heros choisit via le hook ; defaut = cout min.
    if (hero.hand.length) {
      const heroT = heroTemplateFor(hero.heroId)
      const chosen = policies[heroIdx].chooseDiscardForRoar?.(state, heroIdx, hero.hand.slice())
      const pick = (chosen && hero.hand.includes(chosen)) ? chosen
        : hero.hand.slice().sort((a, b) => (cardById(heroT, a)?.cpCost ?? 0) - (cardById(heroT, b)?.cpCost ?? 0))[0]
      hero.hand.splice(hero.hand.indexOf(pick), 1)
      hero.discard.push(pick)
      log(state, bossIdx, 'resolveAttack', `Thundering Roar: hero discarded ${pick}`)
    }
    queueAttackDamageVsArmor(state, bossIdx, 8, false, rng, policies) // 8 indefendables
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


// --- Raveness ------------------------------------------------------------------------------
// Execute N activations de Nevermore pour la Raveness (rvIdx). Choix par la Policy si le hook
// existe, sinon heuristique : chez soi -> l'envoyer chez l'adversaire ; chez l'adversaire ->
// absorber (cadran+1, 1 degat isole) jusqu'au cadran plein, puis rapatrier si le soin est utile.
export function performNevermoreActivations(state: GameState, rvIdx: 0 | 1, times: number, rng: RNG, policy?: Policy): void {
  const rvP = state.players[rvIdx]
  const opp = state.players[(1 - rvIdx) as 0 | 1]
  for (let i = 0; i < times; i++) {
    if (state.gameOver) return
    const rvIsHolder = (rvP.tokens.nevermore ?? 0) > 0
    let choice: 'move' | 'absorb'
    const hook = policy?.chooseNevermoreActivation
    if (hook) choice = hook(state, rvIdx)
    else if (rvP.nevermoreMode) choice = rvP.nevermoreMode // toggle UI du joueur humain
    else if (rvIsHolder) choice = 'move'
    // Au cadran plein, absorber ne monte plus rien : on rapatrie (soin 3 + nouveau cycle),
    // sauf si l'adversaire est finissable au grignotage. (Bug user 2026-07-06 : la condition
    // hp<=47 laissait le corbeau coincé chez l'adversaire à pleine vie — et elle ignorait
    // le sur-soin autorisé jusqu'à 60.)
    else if ((rvP.nevermoreDial ?? 0) >= rv.NEVERMORE_DIAL_CAP) choice = opp.hp <= 2 ? 'absorb' : 'move'
    else choice = 'absorb'
    if (choice === 'absorb' && rvIsHolder) choice = 'move' // Absorb exige Nevermore sur un adversaire
    const r = rv.applyNevermoreActivation(rvP, opp, rvIsHolder, choice)
    if (r.choice === 'absorb') {
      opp.hp -= 1 // source isolee, indefendable (leaflet verifie)
      log(state, rvIdx, 'resolveAttack', `Nevermore absorbs: dial ${r.dialAfter}, 1 undefendable dmg (isolated)`)
      if (checkGameOver(state)) return
    } else if (r.choice === 'moveToOpponent') {
      log(state, rvIdx, 'resolveAttack', 'Nevermore flies to the opponent')
    } else {
      log(state, rvIdx, 'resolveAttack', `Nevermore returns to the Raveness: healed ${r.healed}, dial to 0`)
    }
  }
}

// Resout une habilete Raveness choisie (board verifie scans 2026-07-06).
function applyRVAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)
  const acts = (n: number) => performNevermoreActivations(state, playerIdx, n, rng, policy)

  const counts = new Map<number, number>()
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
  const maxKind = Math.max(...counts.values())
  const a = dice.filter(d => d <= 3).length
  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    // Modificateurs d'attaque (Stone Beak!/Talon Strike! + communs) via le systeme standard.
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Peck')) {
    const up = has('peck-ii')
    const dmg = (a >= 5 ? [7, 8] : a >= 4 ? [6, 7] : [5, 6])[up ? 1 : 0]
    const trigger = up ? 3 : 4
    if (maxKind >= trigger) { log(state, playerIdx, 'resolveAttack', `Peck: ${trigger}-of-a-kind -> Activate Nevermore`); acts(1) }
    attack(dmg, true)
    return
  }
  if (name.startsWith('Raven Sight')) {
    acts(has('raven-sight-ii') ? 2 : 1)
    attack(3, false)
    return
  }
  if (name.startsWith('Craven')) {
    const up = has('craven-ii')
    const g = rv.grantFeathers(self, up ? 2 : 1)
    log(state, playerIdx, 'resolveAttack', `Craven: +${g} Feather`)
    attack(up ? 9 : 8, true)
    return
  }
  if (name.startsWith('Beguile')) {
    const up = has('beguile-ii')
    const g = rv.grantFeathers(self, up ? 3 : 2)
    log(state, playerIdx, 'resolveAttack', `Beguile: +${g} Feather`)
    acts(up ? 2 : 1)
    attack(9, true)
    return
  }
  if (name.startsWith('Fowl Friend') || name.startsWith('Birds of a Feather')) {
    if (name.startsWith('Birds of a Feather')) {
      self.featherCapBonus = (self.featherCapBonus ?? 0) + 1
      log(state, playerIdx, 'resolveAttack', `Birds of a Feather: Feather cap +1 (now ${rv.featherCap(self)}) — then Fowl Friend II`)
    }
    const up = has('fowl-friend-ii')
    drawCards(self, 1, rng)
    const g = up ? rv.grantFeathers(self, 99) : rv.grantFeathers(self, 4)
    log(state, playerIdx, 'resolveAttack', `Fowl Friend${up ? ' II' : ''}: drew 1, +${g} Feather`)
    acts(up ? 3 : 2)
    return
  }
  if (name.startsWith('Murder of Crows')) {
    const up = has('murder-of-crows-ii')
    const n = up ? 5 : 4
    const rolls = rollDice(n, rng)
    const talons = rolls.filter(d => d <= 3).length
    const wings = rolls.filter(d => d >= 4 && d <= 5).length
    const eyes = rolls.filter(d => d === 6).length
    const g = rv.grantFeathers(self, wings)
    log(state, playerIdx, 'resolveAttack', `Murder of Crows${up ? ' II' : ''} bonus roll [${rolls.join(',')}]: +${talons} dmg, +${g} Feather${eyes ? ', Raven Eye -> Activate Nevermore' : ''}`)
    if (eyes > 0) acts(1)
    attack((up ? 6 : 5) + talons, true)
    return
  }
  if (name.startsWith('Aviary')) {
    const g = rv.grantFeathers(self, 4)
    log(state, playerIdx, 'resolveAttack', `Aviary: +${g} Feather`)
    attack(2, false)
    return
  }
  if (name.startsWith('Pluck')) {
    opp.tokens.hex = 1
    log(state, playerIdx, 'resolveAttack', 'Pluck: Hex inflicted (6s are blanks)')
    attack(9, true)
    return
  }
  if (name.startsWith('Chamber')) {
    acts(has('chamber-ii') ? 3 : 2)
    attack(7, false)
    return
  }
  if (name.startsWith('Fantastic Terrors')) {
    acts(3)
    opp.tokens.hex = 1
    log(state, playerIdx, 'resolveAttack', 'Fantastic Terrors: Hex inflicted')
    attack(13, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Raveness ability matched (${name})`)
}


// --- Druid ---------------------------------------------------------------------------------
// Resout une habilete Druid (SPEC.md verifie). Cat Form : +2 dmg + Wound sur attaque conclue.
function applyDRAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const opp = state.players[(1 - playerIdx) as 0 | 1]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    // Shape Shift se dépense « at ANY time » (user-caught 2026-07-07) : les jetons gagnés
    // PENDANT la résolution (Wrath of Nature, Forest's Call/Answer, Protect, Savage Maul)
    // sont dépensables AVANT la conclusion de l'attaque — le morph se décide donc ICI, après
    // les gains, pas avant la résolution. IA : heuristique (garde 1 pour Bear si PV bas) ;
    // humain : toggle pré-armé drCatOnAttack, jamais automatique.
    if (result.dmg > 0 && dr.formOf(self) !== 'cat' && (self.tokens.shapeShift ?? 0) > 0) {
      const wants = self.humanControlled
        ? self.drCatOnAttack === true
        : (self.tokens.shapeShift ?? 0) > (self.hp <= 20 ? 1 : 0)
      if (wants) {
        dr.spendShapeShift(self, 'cat')
        log(state, playerIdx, 'resolveAttack', 'Shape Shift -> Cat Form (attack)')
      }
    }
    // Cat Form (overlay verifie) : l attaque conclue -> +2 dmg et inflige Wound.
    if (dr.formOf(self) === 'cat' && result.dmg > 0) {
      result = { ...result, dmg: result.dmg + 2 }
      opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1)
      log(state, playerIdx, 'resolveAttack', 'Cat Form: +2 dmg, Wound inflicted')
    }
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  const counts = new Map<number, number>()
  for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
  const maxKind = Math.max(...counts.values())
  const a = dice.filter(d => d <= 3).length

  if (name.startsWith('Ferocity')) {
    const up = has('ferocity-ii')
    const dmg = (a >= 5 ? [6, 7] : a >= 4 ? [5, 6] : [4, 5])[up ? 1 : 0]
    const trigger = up ? 3 : 4
    if (maxKind >= trigger) {
      opp.tokens.wound = Math.min(2, (opp.tokens.wound ?? 0) + 1)
      log(state, playerIdx, 'resolveAttack', `Ferocity: ${trigger}-of-a-kind -> Wound inflicted`)
    }
    attack(dmg, true)
    return
  }
  if (name.startsWith('Savage Maul') || name.startsWith('Maul')) {
    if (name.startsWith('Savage Maul')) {
      const g = dr.grantShapeShift(self, 1)
      log(state, playerIdx, 'resolveAttack', `Savage Maul: +${g} Shape Shift — then Maul`)
    }
    const r = dr.maulRoll(rng, dr.formOf(self) === 'bear')
    log(state, playerIdx, 'resolveAttack', `Maul roll [${r.dice.join(',')}]${r.rerolled ? ' (Bear re-roll)' : ''} -> ${r.total} dmg`)
    attack(r.total, true)
    return
  }
  if (name.startsWith("Nature's Cure")) {
    dr.grantRegen2(self, 1)
    log(state, playerIdx, 'resolveAttack', "Nature's Cure: +Regenerate (2)")
    attack(5, true)
    return
  }
  if (name.startsWith('Wild Realignment')) {
    grantCp(self, 1)
    const g = dr.grantShapeShift(self, 2)
    let msg = `Wild Realignment: +1 CP, +${g} Shape Shift`
    if (dr.formOf(self) === 'druid') { drawCards(self, 1, rng); msg += ', drew 1 (Druid Form)' }
    log(state, playerIdx, 'resolveAttack', msg)
    return
  }
  if (name.startsWith("Forest's Call")) {
    const g = dr.grantShapeShift(self, 1)
    log(state, playerIdx, 'resolveAttack', `Forest's Call: +${g} Shape Shift`)
    attack(6, true)
    return
  }
  if (name.startsWith("Forest's Answer")) {
    const g = dr.grantShapeShift(self, 1)
    const bonus = rollDie(rng)
    let extra = 0
    let note = ''
    if (bonus <= 3) { extra = 2; note = '+2 dmg' }
    else if (bonus <= 5) { dr.grantShapeShift(self, 1); note = '+1 Shape Shift' }
    else { dr.grantRegen2(self, 1); note = '+Regenerate (2)' }
    log(state, playerIdx, 'resolveAttack', `Forest's Answer: +${g} Shape Shift, bonus die ${bonus} -> ${note}`)
    attack(7 + extra, true)
    return
  }
  if (name.startsWith('Protect the Forest')) {
    dr.grantRegen2(self, 1)
    const g = dr.grantShapeShift(self, 1)
    log(state, playerIdx, 'resolveAttack', `Protect the Forest: +Regenerate (2), +${g} Shape Shift`)
    attack(has('protect-the-forest-ii') ? 8 : 6, false)
    return
  }
  if (name.startsWith('Rainfall')) {
    grantCp(self, 1)
    dr.grantRegen2(self, 2)
    log(state, playerIdx, 'resolveAttack', 'Rainfall: +1 CP, +2 Regenerate (2)')
    return
  }
  if (name.startsWith('Wrath of Nature')) {
    dr.grantRegen2(self, 1)
    const g = dr.grantShapeShift(self, 2)
    log(state, playerIdx, 'resolveAttack', `Wrath of Nature: +Regenerate (2), +${g} Shape Shift`)
    attack(12, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Druid ability matched (${name})`)
}


// --- Thor ----------------------------------------------------------------------------------
// Resout une habilete Thor (SPEC.md verifiee + rulings user). Les navettes Mjolnir infligent
// leurs Throws en dmg isole indefendable (queueDamage) ; Guard Break se tente sur les grosses
// attaques defendables (d6 4-5 => indefendable, jetons depenses un a un).
function applyTHAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)
  const ekOf = () => Math.min(4, self.tokens.electrokinesis ?? 0)

  const doShuttle = (times: number, label: string) => {
    const r = th.shuttle(self, times)
    if (r.damage > 0) queueDamage(state, oppIdx, r.damage)
    if (r.throws + r.retrieves > 0) {
      log(state, playerIdx, 'resolveAttack', `${label}: Mjolnir x${r.throws + r.retrieves} (${r.throws} throw = ${r.damage} dmg, ${r.retrieves} retrieve = +${r.ekGained} EK)`)
    }
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    // Guard Break : désormais centralisé dans resolveDefense (jeton transférable — tout
    // détenteur peut le dépenser, pas seulement th/du).
    // Le total final n'apparaissait nulle part dans le journal : on passait des effets
    // directement aux dés de défense, et l'user ne pouvait pas voir que l'EK était compté.
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Hammered')) {
    const a = dice.filter(d => d <= 3).length
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('hammered-iii') ? [5, 6, 8] : has('hammered-ii') ? [5, 6, 7] : [4, 5, 7]
    const upgraded = has('hammered-ii') || has('hammered-iii')
    if (upgraded) doShuttle(1, 'Hammered')
    else if (th.mjolnirHome(self)) { // I : Throw seulement
      const r = th.shuttleOnce(self)
      queueDamage(state, oppIdx, r.damage)
      log(state, playerIdx, 'resolveAttack', 'Hammered: Mjolnir thrown (1 dmg)')
    }
    const kindNeed = has('hammered-iii') ? 3 : has('hammered-ii') ? 4 : 99
    const counts = new Map<number, number>()
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
    if (Math.max(...counts.values()) >= kindNeed) {
      th.gainEk(self, 1)
      log(state, playerIdx, 'resolveAttack', `Hammered: ${kindNeed}-of-a-kind -> +1 EK`)
    }
    attack(table[tier], true)
    return
  }
  if (name.startsWith('Mighty Summon')) {
    const up = has('mighty-summon-ii')
    th.gainGb(self, 2)
    self.hp = Math.min(self.hp + (up ? 3 : 2), 60)
    if (th.mjolnirHome(self)) {
      th.gainEk(self, 3)
      log(state, playerIdx, 'resolveAttack', `Mighty Summon: +2 Guard Break, Heal ${up ? 3 : 2}, +3 EK (Mjolnir home)`)
    } else {
      const r = th.shuttleOnce(self) // Retrieve (+1 EK standard)
      const coll = up ? 4 : 3
      queueDamage(state, oppIdx, coll)
      log(state, playerIdx, 'resolveAttack', `Mighty Summon: +2 Guard Break, Heal ${up ? 3 : 2}, Retrieve -> ${coll} collateral (+${r.ekGained} EK)`)
    }
    return
  }
  if (name.startsWith('Boom Boom!')) {
    th.gainEk(self, 2)
    log(state, playerIdx, 'resolveAttack', 'Boom Boom!: +2 EK')
    attack(6, true)
    return
  }
  if (name.startsWith('Chain Lightning')) {
    const up = has('chain-lightning-ii')
    const r = th.chainLightningRoll(rng, up ? 4 : 3)
    const coll = up ? 3 : 2
    queueDamage(state, oppIdx, coll)
    log(state, playerIdx, 'resolveAttack', `Chain Lightning: rolled [${r.dice.join(',')}] -> ${r.total} dmg + ${coll} collateral`)
    attack(r.total, true)
    return
  }
  if (name.startsWith('Odinforce')) {
    const base = has('odinforce-ii') ? 6 : 5
    let r = th.odinforceRoll(rng)
    log(state, playerIdx, 'resolveAttack', `Odinforce roll [${r.dice.join(',')}]`)
    if (has('odinforce-ii')) {
      const score = (r.hammers >= 2 ? 1 : 0) + (r.worthies >= 2 ? 1 : 0) + r.thunders
      if (score <= 1) { // relance optionnelle (une fois) si le jet est pauvre
        r = th.odinforceRoll(rng)
        log(state, playerIdx, 'resolveAttack', `Odinforce II re-roll -> [${r.dice.join(',')}]`)
      }
    }
    if (r.hammers >= 2) doShuttle(1, 'Odinforce')
    if (r.worthies >= 2) { grantCp(self, 1); log(state, playerIdx, 'resolveAttack', 'Odinforce: +1 CP (2+ Worthy)') }
    if (r.thunders > 0) { th.gainEk(self, r.thunders); log(state, playerIdx, 'resolveAttack', `Odinforce: +${r.thunders} EK (Thunder)`) }
    log(state, playerIdx, 'resolveAttack', `Odinforce: ${base} base + ${ekOf()} EK`)
    attack(base + ekOf(), true)
    return
  }
  if (name.startsWith('Bottled Lightning')) {
    const up = has('bottled-lightning-ii')
    doShuttle(up ? 3 : 2, 'Bottled Lightning')
    th.gainGb(self, 2)
    log(state, playerIdx, 'resolveAttack', 'Bottled Lightning: +2 Guard Break')
    log(state, playerIdx, 'resolveAttack', `Bottled Lightning: ${up ? 8 : 7} base + ${ekOf()} EK`)
    attack((up ? 8 : 7) + ekOf(), true)
    return
  }
  if (name.startsWith('Ricochet!')) {
    doShuttle(6, 'Ricochet!')
    return
  }
  if (name.startsWith('Lightning Rod')) {
    if (has('lightning-rod-ii')) {
      doShuttle(1, 'Lightning Rod')
      th.gainEk(self, 1)
      attack(9, true)
    } else if (!th.mjolnirHome(self)) { // l'adversaire a Mjolnir
      log(state, playerIdx, 'resolveAttack', 'Lightning Rod: opponent has Mjolnir -> 9 dmg')
      attack(9, true)
    } else {
      th.gainEk(self, 1)
      log(state, playerIdx, 'resolveAttack', 'Lightning Rod: +1 EK')
      attack(7, true)
    }
    return
  }
  if (name.startsWith('Thunder Bolt')) {
    doShuttle(1, 'Thunder Bolt')
    th.gainEk(self, 2)
    attack(has('thunder-bolt-ii') ? 12 : 10, true)
    return
  }
  if (name.startsWith('Asgardian Brawn')) {
    self.hp = Math.min(self.hp + 4, 60)
    log(state, playerIdx, 'resolveAttack', 'Asgardian Brawn: Heal 4')
    return
  }
  if (name.startsWith('For Asgard!')) {
    th.gainGb(self, 1)
    doShuttle(4, 'For Asgard!')
    attack(14, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Thor ability matched (${name})`)
}

// --- Duelist ----------------------------------------------------------------------------------
// Board vérifié (characters/Duelist/SPEC.md, scans 2026-07-07). Footwork : les Steps gratuits
// d'une habileté se prennent AVANT les dégâts ; le Bonus offensif (Attack Modifier, un Bonus/
// tour) est celui de la position FINALE. Guard Break = le jeton de Thor, réutilisé tel quel.
function applyDUAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)

  // « You may take (up to) N Step(s) » : IA = avance au maximum (le Bonus offensif de la
  // position finale paie sur cette attaque) ; humain = direction pré-armée duStepsMode.
  const takeFreeSteps = (upTo: number, label: string) => {
    if (upTo <= 0) return
    const mode = self.humanControlled ? (self.duStepsMode ?? 'forward') : 'forward'
    if (mode === 'none') return
    // « up to N » : l'humain choisit direction ET quantité (forward1/backward1 = un seul step).
    const n = (mode === 'forward1' || mode === 'backward1') ? Math.min(1, upTo) : upTo
    const dir = mode.startsWith('backward') ? -1 : 1
    const moved = du.takeSteps(self, dir * n)
    if (moved !== 0) log(state, playerIdx, 'resolveAttack', `${label}: ${Math.abs(moved)} step(s) ${moved > 0 ? 'forward' : 'backward'} (position ${du.footworkPos(self)})`)
  }

  const gainGb = (n: number, label: string) => {
    const g = th.gainGb(self, n)
    log(state, playerIdx, 'resolveAttack', `${label}: +${g} Guard Break`)
  }
  const inflictDisarm = (label: string) => {
    const g = du.inflictDisarm(opp)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g > 0 ? 'Disarm inflicted' : 'opponent already Disarmed (stack 1)'}`)
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    // Offensive Bonus (Footwork, Attack Modifier — leaflet vérifié) : position FINALE au
    // moment de l'attaque, un seul Bonus résolu par tour.
    if (self.footworkBonusUsedThisTurn !== true) {
      const ob = du.offensiveBonusDmg(du.footworkPos(self))
      if (ob > 0) {
        self.footworkBonusUsedThisTurn = true
        result = { ...result, dmg: result.dmg + ob }
        log(state, playerIdx, 'resolveAttack', `Offensive Bonus: +${ob} dmg (Footwork position ${du.footworkPos(self)})`)
      }
    }
    // Guard Break : à la conclusion d'une attaque défendable. IA : heuristique >= 5 dmg ;
    // joueur humain : choix pré-armé (hook), jamais automatique — même règle que Thor.
    const gbWanted = policy.chooseGuardBreakSpend
      ? policy.chooseGuardBreakSpend(state, playerIdx, result.dmg)
      : result.dmg >= 5
    if (!result.undefendable && !ultimate && (self.tokens.guardBreak ?? 0) > 0 && gbWanted) {
      const gb = th.tryGuardBreak(self, rng)
      log(state, playerIdx, 'resolveAttack', `Guard Break: spent ${gb.spent}, rolls [${gb.rolls.join(',')}] — ${gb.success ? 'attack is UNDEFENDABLE' : 'failed'}`)
      if (gb.success) result = { ...result, undefendable: true }
    }
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Blade Flurry')) {
    const a = dice.filter(d => d <= 3).length
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('blade-flurry-ii') ? [5, 6, 7] : [4, 5, 6]
    const kindNeed = has('blade-flurry-ii') ? 3 : 4
    const counts = new Map<number, number>()
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
    if (Math.max(...counts.values()) >= kindNeed) takeFreeSteps(1, `Blade Flurry (${kindNeed}-of-a-kind)`)
    attack(table[tier], true)
    return
  }
  if (name.startsWith('Fancy Feet')) {
    gainGb(1, 'Fancy Feet')
    takeFreeSteps(3, 'Fancy Feet')
    return
  }
  if (name.startsWith('Balestra')) {
    takeFreeSteps(2, 'Balestra')
    attack(has('balestra-ii') ? 8 : 6, true)
    return
  }
  if (name.startsWith('Feint Attack')) {
    const up = has('feint-attack-ii')
    gainGb(up ? 2 : 1, 'Feint Attack')
    takeFreeSteps(1, 'Feint Attack')
    attack(up ? 3 : 2, false) // dégâts indéfendables (board vérifié)
    return
  }
  if (name.startsWith('En Garde')) {
    const r = du.enGardeRoll(rng)
    log(state, playerIdx, 'resolveAttack', `En Garde: rolled [${r.dice.join(',')}]${r.disarm ? ' — Pierce!' : ''}`)
    if (r.disarm) inflictDisarm('En Garde')
    attack(8, true)
    return
  }
  if (name.startsWith('Strike (5-straight)')) {
    takeFreeSteps(1, 'Strike')
    attack(10, true)
    return
  }
  if (name.startsWith('Strike')) {
    attack(7, true)
    return
  }
  if (name.startsWith('Bladewind')) {
    // 3 collatéraux : indéfendables, non modifiables (convention existante).
    queueDamage(state, oppIdx, 3)
    flushDamage(state)
    log(state, playerIdx, 'resolveAttack', 'Bladewind: 3 collateral dmg')
    checkGameOver(state)
    return
  }
  if (name.startsWith('Bladestorm')) {
    const up = has('bladestorm-ii')
    gainGb(up ? 2 : 1, 'Bladestorm')
    inflictDisarm('Bladestorm')
    takeFreeSteps(2, 'Bladestorm')
    attack(up ? 9 : 8, true)
    return
  }
  if (name.startsWith('Master of the Blade!')) {
    gainGb(2, 'Master of the Blade!')
    inflictDisarm('Master of the Blade!')
    takeFreeSteps(4, 'Master of the Blade!')
    attack(11, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Duelist ability matched (${name})`)
}

// --- Sun Elf ------------------------------------------------------------------------------
// Board vérifié (characters/Sun_Elf/SPEC.md + rulings 2026-07-08). DAWN : l'attaque peut
// dumper la valeur du cadran en dégâts (Attack Modifier, aussi sur l'Ultimate) puis cadran -4.
// IA : dépense dès que cadran >= 3 ; humain : toggle pré-armé seDawnSpendArmed.
function applySEAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)

  const dial = (n: number, label: string) => {
    const r = se.increaseDial(self, n)
    log(state, playerIdx, 'resolveAttack', `${label}: Sun Dial +${r.gained}${r.healed ? ` (+${r.healed} heal excès)` : ''}${r.flipped === 'dawn' ? ' — FLIPS to DAWN' : ''} (now ${se.dialOf(self)})`)
  }
  const gem = (label: string) => {
    const g = se.gainChargedGem(self)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g > 0 ? 'gained Charged Gem' : 'Charged Gem already held (stack 1)'}`)
  }
  const mark = (label: string) => {
    const g = se.inflictSunMarked(opp)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g > 0 ? 'Sun Marked inflicted' : 'opponent already Sun Marked (stack 1)'}`)
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    // DAWN (leaflet + ruling « aussi sur l'Ultimate ») : ajouter la valeur du cadran, puis -4
    // à la fin de la Roll Phase. Décision : IA >= 3 ; humain pré-armé, jamais automatique.
    if (se.isDawn(self) && se.dialOf(self) > 0) {
      const wants = self.humanControlled ? self.seDawnSpendArmed === true : se.dialOf(self) >= 3
      if (wants) {
        const bonus = se.dialOf(self)
        result = { ...result, dmg: result.dmg + bonus }
        const r = se.reduceDial(self, se.DAWN_SPEND_COST)
        self.seDawnSpendArmed = false
        log(state, playerIdx, 'resolveAttack', `Sun Dial (DAWN): +${bonus} dmg, dial -${r.reduced}${r.flipped === 'dusk' ? ' — FLIPS to DUSK' : ''} (now ${se.dialOf(self)})`)
      }
    }
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Light Staff')) {
    const a = dice.filter(d => d <= 3).length
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('light-staff-ii') ? [5, 6, 7] : [4, 5, 7]
    const kindNeed = has('light-staff-ii') ? 3 : 4
    const counts = new Map<number, number>()
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
    if (Math.max(...counts.values()) >= kindNeed) dial(1, `Light Staff (${kindNeed}-of-a-kind)`)
    attack(table[tier], true)
    return
  }
  if (name.startsWith('Ray Absorption')) {
    dial(3, 'Ray Absorption')
    self.hp = Math.min(60, self.hp + 2)
    gem('Ray Absorption')
    log(state, playerIdx, 'resolveAttack', 'Ray Absorption: healed 2')
    return
  }
  if (name.startsWith('Radiant Energy')) {
    mark('Radiant Energy')
    attack(6, true)
    return
  }
  if (name.startsWith('Praise the Sun')) {
    gem('Praise the Sun')
    attack(5, true)
    return
  }
  if (name.startsWith('Scorching Staff')) {
    const up = has('scorching-staff-ii')
    const r = se.scorchingBonus(rng, up)
    log(state, playerIdx, 'resolveAttack', `Scorching Staff${up ? ' II' : ''}: bonus roll [${r.dice.join(',')}]`)
    if (r.dialFromB > 0) dial(r.dialFromB, 'Scorching Staff (Charge)')
    if (r.gemOnC) { gem('Scorching Staff (Sun Power)'); dial(2, 'Scorching Staff (Sun Power)') }
    attack(5 + r.addDmg, true)
    return
  }
  if (name.startsWith('Sunbeam')) {
    dial(has('sunbeam-ii') ? 3 : 2, 'Sunbeam')
    attack(9, true)
    return
  }
  if (name.startsWith('Ray of Light')) {
    dial(1, 'Ray of Light')
    attack(7, true)
    return
  }
  if (name.startsWith('Soaking Up the Sun')) {
    gem('Soaking Up the Sun')
    attack(9, true)
    return
  }
  if (name.startsWith('Bestow Your Light')) {
    dial(4, 'Bestow Your Light')
    mark('Bestow Your Light')
    return
  }
  if (name.startsWith('Solar Burst')) {
    dial(2, 'Solar Burst')
    if (has('solar-burst-ii')) {
      gem('Solar Burst II')
      mark('Solar Burst II')
      attack(7, false) // 7 dmg INDÉFENDABLES (carte vérifiée)
    } else {
      // « Choose one : Gem OU Sun Marked ». Humain : SON toggle pré-armé (user-caught : le
      // choix se faisait tout seul) ; IA : prend celui qui manque.
      if (self.humanControlled) {
        if (self.seBurstChoice === 'mark') mark('Solar Burst')
        else gem('Solar Burst')
      } else if ((opp.tokens.sunMarked ?? 0) === 0 && (self.tokens.chargedGem ?? 0) > 0) mark('Solar Burst')
      else if ((self.tokens.chargedGem ?? 0) === 0) gem('Solar Burst')
      else mark('Solar Burst')
      attack(8, true)
    }
    return
  }
  if (name.startsWith('Solar Flare!')) {
    dial(3, 'Solar Flare!')
    gem('Solar Flare!')
    mark('Solar Flare!')
    attack(10, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Sun Elf ability matched (${name})`)
}

// --- Mythic Brawler ---------------------------------------------------------------------------
// Board vérifié (characters/Mythic_Brawler/SPEC.md + rulings 2026-07-16). « Gain 1 Strength » =
// choix parmi Ocean/Mountain/Sky — IA : mb.chooseStrengthKind, meilleur marginal calibré (Sky1 >
// Mountain1 > Sky2 > Mountain2 > Ocean), aligné sur les valeurs EV du solveur. Mountain : +1 dmg
// par jeton sur TOUTE attaque qui inflige des dégâts (Attack Modifier persistant, appliqué dans
// attack()).
function applyMBAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)

  const gainStr = (n: number, label: string) => {
    const gained: string[] = []
    for (let i = 0; i < n; i++) { const k = mb.gainStrength(self); if (k) gained.push(k.replace('strength', '')) }
    log(state, playerIdx, 'resolveAttack', `${label}: gained ${gained.length ? gained.join(' + ') : 'no Strength (all at cap)'}`)
  }
  const conc = (label: string) => {
    const g = mb.inflictConcussion(opp)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g ? 'Concussion inflicted' : 'opponent already Concussed (stack 1)'}`)
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    // Strength of the Mountain (jeton vérifié) : +1 dmg d'Attaque par jeton, persistant.
    const mtn = Math.min(mb.MOUNTAIN_CAP, self.tokens.strengthMountain ?? 0)
    if (mtn > 0) {
      result = { ...result, dmg: result.dmg + mtn }
      log(state, playerIdx, 'resolveAttack', `Strength of the Mountain: +${mtn} dmg`)
    }
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Strong Arm')) {
    // « After targeting an opponent, you each roll 1 die: If your roll is equal or greater,
    // gain 1 Strength and then deal 6 dmg. Otherwise, deal 7 dmg. » (board vérifié — l'égalité
    // gagne, ruling user). Le dé de l'attaquant passe par la fenêtre de jets bonus.
    const mine = bonusRollWindow(state, playerIdx, [rollDie(rng)], 'Strong Arm (roll-off)', rng, policy)[0]
    const theirs = rollDie(rng)
    const won = mine >= theirs
    log(state, playerIdx, 'resolveAttack', `Strong Arm roll-off: ${mine} vs ${theirs} — ${won ? 'won (>=)' : 'lost'}`)
    if (won) gainStr(1, 'Strong Arm')
    attack(won ? 6 : 7, true)
    return
  }
  if (name.startsWith('Tidal Blow')) {
    const g = mb.gainStrengthOf(self, 'strengthOcean')
    log(state, playerIdx, 'resolveAttack', `Tidal Blow: ${g ? 'gained Strength of the Ocean' : 'Ocean already at cap (3)'}`)
    const up = has('tidal-blow-ii')
    const bonus = bonusRollWindow(state, playerIdx, rollDice(up ? 2 : 1, rng), 'Tidal Blow (bonus)', rng, policy)
    let dmg = 6
    // I : « On Fist, add 2 dmg » (une fois) ; II : « Add 2 x Fist dmg » (par Fist).
    const fists = bonus.filter(d => d <= 3).length
    dmg += up ? 2 * fists : (fists >= 1 ? 2 : 0)
    const msgs: string[] = []
    if (bonus.some(d => d === 4 || d === 5)) { drawCards(self, 1, rng); msgs.push('drew 1 (Spirit)') }
    if (bonus.some(d => d === 6)) { const c = mb.inflictConcussion(opp); msgs.push(c ? 'Concussion inflicted (Peak)' : 'opponent already Concussed (Peak)') }
    log(state, playerIdx, 'resolveAttack', `Tidal Blow${up ? ' II' : ''}: bonus [${bonus.join(',')}] -> ${dmg} dmg${msgs.length ? ', ' + msgs.join(', ') : ''}`)
    attack(dmg, true)
    return
  }
  if (name.startsWith('Clobber')) {
    const a = dice.filter(d => d <= 3).length
    const up = has('clobber-ii')
    const table = up ? [6, 7] : [5, 7]
    const dmg = table[a >= 5 ? 1 : 0]
    const counts = new Map<number, number>()
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
    const kind = Math.max(...counts.values())
    if (up && kind >= 3) {
      const g = mb.gainStrengthOf(self, 'strengthSky')
      log(state, playerIdx, 'resolveAttack', `Clobber II (3-of-a-kind): ${g ? 'gained Strength of the Sky' : 'Sky already at cap (2)'}`)
    }
    if (kind >= 4) conc(`Clobber${up ? ' II' : ''} (4-of-a-kind)`)
    attack(dmg, true)
    return
  }
  if (name.startsWith('Healing Wind')) {
    self.hp = Math.min(mb.HEAL_CAP, self.hp + 3)
    log(state, playerIdx, 'resolveAttack', 'Healing Wind: healed 3')
    gainStr(2, 'Healing Wind')
    return
  }
  if (name.startsWith('Ancestral Strength')) {
    gainStr(2, 'Ancestral Strength')
    attack(has('ancestral-strength-ii') ? 9 : 7, false) // INDÉFENDABLE (carte/board vérifiés)
    return
  }
  if (name.startsWith('Spirit Call')) {
    gainStr(2, 'Spirit Call')
    conc('Spirit Call')
    return
  }
  if (name.startsWith('Knock Out')) {
    attack(3, false) // 3 dmg INDÉFENDABLES (Tectonic Punch II)
    return
  }
  if (name.startsWith('Spirit Strike')) {
    gainStr(1, 'Spirit Strike')
    const up = has('spirit-strike-ii')
    if (up && mb.straightUsesSix(dice)) {
      self.hp = Math.min(mb.HEAL_CAP, self.hp + 1)
      log(state, playerIdx, 'resolveAttack', 'Spirit Strike II: straight uses a 6 -> healed 1')
    }
    attack(up ? 8 : 7, true)
    return
  }
  if (name.startsWith('Tectonic Punch')) {
    if (has('tectonic-punch-ii')) {
      const g = mb.gainStrengthOf(self, 'strengthMountain')
      log(state, playerIdx, 'resolveAttack', `Tectonic Punch II: ${g ? 'gained Strength of the Mountain' : 'Mountain already at cap (2)'}`)
      attack(12, true)
      return
    }
    // I — CHOIX : gain Mountain OU retirer 1 Mountain pour +3 dmg. IA : dépense seulement au
    // cap (même arbitrage que le solveur, characters/mythicbrawler/abilities.ts).
    const spend = (self.tokens.strengthMountain ?? 0) >= mb.MOUNTAIN_CAP
    if (spend) {
      self.tokens.strengthMountain -= 1
      log(state, playerIdx, 'resolveAttack', 'Tectonic Punch: removed 1 Strength of the Mountain -> +3 dmg')
      attack(10 + 3, true)
    } else {
      const g = mb.gainStrengthOf(self, 'strengthMountain')
      log(state, playerIdx, 'resolveAttack', `Tectonic Punch: ${g ? 'gained Strength of the Mountain' : 'Mountain already at cap (2)'}`)
      attack(10, true)
    }
    return
  }
  if (name.startsWith('Power of the Ancients!')) {
    gainStr(2, 'Power of the Ancients!')
    conc('Power of the Ancients!')
    attack(12, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Mythic Brawler ability matched (${name})`)
}

// --- Spider-Man ------------------------------------------------------------------------------
function applySMAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)

  const gainCombo = (label: string) => {
    const g = sm.gainCombo(self)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g ? 'gained Combo' : 'Combo already held (stack 1)'}`)
  }
  const gainInvis = (label: string) => {
    const g = sm.gainInvisibility(self)
    log(state, playerIdx, 'resolveAttack', `${label}: ${g ? 'gained Invisibility' : 'Invisibility already held (stack 1)'}`)
  }
  const inflictWebbed = (label: string) => {
    const r = sm.inflictWebbed(opp)
    if (r.gained) { queueDamage(state, oppIdx, r.isoDamage); log(state, playerIdx, 'resolveAttack', `${label}: Webbed inflicted (2 isolated undefendable dmg)`) }
    else log(state, playerIdx, 'resolveAttack', `${label}: opponent already Webbed (stack 1) — no effect`)
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    self.smAttackedThisPhase = true // condition du Combo : l'ORP a produit une Attaque
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Punch')) {
    const a = dice.filter(d => d <= 3).length
    const tier = a >= 5 ? 2 : a >= 4 ? 1 : 0
    const table = has('punch-ii') ? [5, 6, 7] : [4, 5, 6]
    if (has('punch-ii')) {
      const counts = new Map<number, number>()
      for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
      if (Math.max(...counts.values()) >= 4) gainCombo('Punch II (4-of-a-kind)')
    }
    attack(table[tier], true)
    return
  }
  if (name.startsWith('C-C-C-Combo')) {
    attack(has('combo-ii') ? 6 : 5, true)
    gainCombo('C-C-C-Combo') // « Deal X dmg. Gain Combo. »
    return
  }
  if (name.startsWith('Web Shot')) {
    gainInvis('Web Shot')
    inflictWebbed('Web Shot')
    flushDamage(state)
    checkGameOver(state)
    return
  }
  if (name.startsWith('Spider-Reflexes')) {
    const two = bonusRollWindow(state, playerIdx, [rollDie(rng), rollDie(rng)], 'Spider-Reflexes', rng, policies[playerIdx])
    const total = two[0] + two[1]
    log(state, playerIdx, 'resolveAttack', `Spider-Reflexes: rolled [${two.join(',')}] -> ${total} dmg`)
    if (total <= 5) gainCombo('Spider-Reflexes (total <= 5)')
    attack(total, true)
    return
  }
  if (name.startsWith('Wall Crawler')) {
    gainInvis('Wall Crawler')
    attack(7, true)
    return
  }
  if (name.startsWith('Ensnare')) {
    const large = name.includes('5-straight')
    if (large) { drawCards(self, 1, rng); log(state, playerIdx, 'resolveAttack', 'Ensnare (large): drew 1') }
    const dmg = has('ensnare-ii') ? (large ? 9 : 6) : (large ? 8 : 5)
    attack(dmg, true)
    if (!state.gameOver) { inflictWebbed('Ensnare'); flushDamage(state); checkGameOver(state) } // « Then inflict Webbed » — après l'attaque
    return
  }
  if (name.startsWith('Combo Up')) {
    gainCombo('Combo Up')
    attack(2, false)
    return
  }
  if (name.startsWith('Venom Punch')) {
    gainInvis('Venom Punch')
    attack(has('venom-punch-ii') ? 8 : 7, false)
    return
  }
  if (name.startsWith('Venom Shockwave')) {
    gainInvis('Venom Shockwave')
    inflictWebbed('Venom Shockwave') // « Inflict Webbed. Then deal 13 dmg. » — l'ultimate est indéfendable, le jeton survit
    attack(13, false, true)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Spider-Man ability matched (${name})`)
}

// --- Pyromancer ------------------------------------------------------------------------------
function applyPYAbility(state: GameState, playerIdx: 0 | 1, name: string, dice: number[], rng: RNG, policies: [Policy, Policy]): void {
  const self = state.players[playerIdx]
  const oppIdx = (1 - playerIdx) as 0 | 1
  const opp = state.players[oppIdx]
  const policy = policies[playerIdx]
  const has = (id: string) => self.upgradesInPlay.includes(id)
  const fmOf = () => self.tokens.fireMastery ?? 0

  const gainFm = (n: number, label: string) => {
    const g = py.gainFm(self, n)
    log(state, playerIdx, 'resolveAttack', `${label}: +${g} Fire Mastery (now ${fmOf()}/${py.fmCap(self)})`)
  }
  const inflict = (kind: 'burn' | 'knockdown' | 'stun', label: string) => {
    const g = py.inflictNegative(opp, kind)
    log(state, playerIdx, 'resolveAttack', `${label}: ${kind} ${g > 0 ? 'inflicted' : 'already on opponent (stack 1)'}`)
  }

  const attack = (dmg: number, defendable: boolean, ultimate = false) => {
    let result: AttackModifierResult = { dmg, undefendable: !defendable || ultimate }
    const chosen = policy.chooseAttackModifierCards(state, playerIdx, result.dmg, eligibleAttackModifierCardIds(self)) ?? []
    for (const cardId of chosen) result = applyAttackModifierCard(state, playerIdx, cardId, result, rng)
    if (result.dmg <= 0) { log(state, playerIdx, 'resolveAttack', `${name} deals no damage — no defense roll`); return }
    log(state, playerIdx, 'resolveAttack', `${name}: attack total ${result.dmg} dmg${result.undefendable ? ' (undefendable)' : ''}`)
    if (result.undefendable) queueAttackDamageVsArmor(state, playerIdx, result.dmg, ultimate, rng, policies)
    else resolveDefense(state, playerIdx, result.dmg, rng, policies)
  }

  if (name.startsWith('Fireball')) {
    const flames = dice.filter(d => d <= 3).length
    const tier = flames >= 5 ? 2 : flames >= 4 ? 1 : 0
    gainFm(has('fireball-ii') ? 2 : 1, 'Fireball')
    attack([4, 6, 8][tier], true)
    return
  }
  if (name.startsWith('Burning Soul')) {
    const souls = dice.filter(d => d === 5).length
    const up = has('burning-soul-ii')
    if (up && souls >= 4) {
      self.fmCapBonus = (self.fmCapBonus ?? 0) + 1
      log(state, playerIdx, 'resolveAttack', `Burning Soul II: Fire Mastery stack limit +1 (now ${py.fmCap(self)})`)
    }
    gainFm(2 * souls, 'Burning Soul') // 2 FM PAR Fiery Soul (ruling user)
    if (up && souls >= 3) inflict('burn', 'Burning Soul II')
    queueDamage(state, oppIdx, souls) // collatéral = indéfendable isolé
    log(state, playerIdx, 'resolveAttack', `Burning Soul: ${souls} collateral dmg`)
    flushDamage(state)
    checkGameOver(state)
    return
  }
  if (name.startsWith('Combustion')) {
    gainFm(1, 'Combustion')
    const removable = Math.min(4, fmOf())
    self.tokens.fireMastery = fmOf() - removable
    const per = has('combustion-ii') ? 4 : 3
    const dmg = removable * per
    log(state, playerIdx, 'resolveAttack', `Combustion: removed ${removable} Fire Mastery -> ${dmg} undefendable dmg`)
    if (dmg > 0) queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies)
    return
  }
  if (name.startsWith('Pyroblast')) {
    const nDice = (has('pyroblast-ii') || has('pyroblast-iii')) ? 2 : 1
    let rolls: number[] = []
    for (let i = 0; i < nDice; i++) rolls.push(rollDie(rng))
    log(state, playerIdx, 'resolveAttack', `Pyroblast roll [${rolls.join(',')}]`)
    if (has('pyroblast-iii')) {
      // Relance optionnelle d'1 dé : relance un dé non-Flame (heuristique dégâts)
      const idx = rolls.findIndex(f => f > 3)
      if (idx >= 0) {
        rolls[idx] = rollDie(rng)
        log(state, playerIdx, 'resolveAttack', `Pyroblast III re-roll -> [${rolls.join(',')}]`)
      }
    }
    let add = 0
    for (const f of rolls) {
      const eff = py.pyroBonusDieEffects(f)
      add += eff.addDmg
      if (eff.burn) inflict('burn', 'Pyroblast')
      if (eff.knockdown) inflict('knockdown', 'Pyroblast')
      if (eff.fm > 0) gainFm(eff.fm, 'Pyroblast')
    }
    attack(6 + add, true)
    return
  }
  if (name.startsWith('Hot Streak')) {
    gainFm(2, 'Hot Streak')
    attack((has('hot-streak-ii') ? 6 : 5) + fmOf(), true)
    return
  }
  if (name.startsWith('Ignite')) {
    gainFm(2, 'Ignite')
    if (has('ignite-ii')) inflict('burn', 'Ignite II')
    attack((has('ignite-ii') ? 5 : 4) + 2 * fmOf(), true)
    return
  }
  if (name.startsWith('Scorch the Earth')) {
    gainFm(3, 'Scorch the Earth')
    inflict('knockdown', 'Scorch the Earth')
    inflict('burn', 'Scorch the Earth')
    queueDamage(state, oppIdx, 2) // collatéral
    attack(12, false, true)
    return
  }
  if (name.startsWith('Scorch')) { // alt Hot Streak II (AABB)
    gainFm(2, 'Scorch')
    inflict('burn', 'Scorch')
    attack(6, true)
    return
  }
  if (name.startsWith('Blazing Soul')) { // alt Ignite II (BBCC)
    self.fmCapBonus = (self.fmCapBonus ?? 0) + 1
    log(state, playerIdx, 'resolveAttack', `Blazing Soul: Fire Mastery stack limit +1 (now ${py.fmCap(self)})`)
    gainFm(5, 'Blazing Soul')
    inflict('knockdown', 'Blazing Soul')
    return
  }
  if (name.startsWith('Meteoroid')) { // alt Meteorite II (DDD)
    inflict('knockdown', 'Meteoroid')
    inflict('burn', 'Meteoroid')
    inflict('stun', 'Meteoroid') // -> Offensive Roll Phase additionnelle (gérée dans playTurn)
    return
  }
  if (name.startsWith('Meteorite')) {
    gainFm(2, 'Meteorite')
    inflict('stun', 'Meteorite')
    const coll = has('meteorite-ii') ? 3 : 2
    queueDamage(state, oppIdx, coll)
    log(state, playerIdx, 'resolveAttack', `Meteorite: ${coll} collateral dmg`)
    const dmg = fmOf()
    log(state, playerIdx, 'resolveAttack', `Meteorite: ${dmg} undefendable dmg (1 per Fire Mastery)`)
    queueAttackDamageVsArmor(state, playerIdx, dmg, false, rng, policies)
    return
  }
  log(state, playerIdx, 'resolveAttack', `Whiff — no Pyromancer ability matched (${name})`)
}

export function playEndOfTurn(state: GameState, playerIdx: 0 | 1): void {
  const self = state.players[playerIdx]
  if ((self.tokens.hex ?? 0) > 0) {
    self.tokens.hex = 0
    log(state, playerIdx, 'endOfTurn', 'Hex removed (end of afflicted turn)')
  }
  if (self.heroId === 'dr' && dr.formOf(self) === 'druid') {
    dr.grantRegen2(self, 1)
    log(state, playerIdx, 'endOfTurn', 'Druid Form: gained Regenerate (2)')
  }
  if (self.hoardedDice > 0) {
    log(state, playerIdx, 'endOfTurn', `Hoarding: ${self.hoardedDice} stolen die returned`)
    self.hoardedDice = 0
  }
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
  // En-tête de tour (trace lisible pour l'audit) : PV/CP/jetons des deux joueurs.
  {
    const brief = (p: PlayerState) => {
      const toks = Object.entries(p.tokens).filter(([, v]) => (v as number) > 0).map(([k, v]) => `${k}:${v}`).join(' ')
      const mj = p.heroId === 'th' ? ` mjolnir:${p.mjolnirAway ? 'away' : 'home'}` : ''
      const up = p.upgradesInPlay.length ? ` upg:${p.upgradesInPlay.length}` : ''
      return `HP${p.hp} CP${p.cp}${up}${mj}${toks ? ` [${toks}]` : ''}`
    }
    const s = state.players[playerIdx], o = state.players[(1 - playerIdx) as 0 | 1]
    log(state, playerIdx, 'upkeep', `===== ${s.heroId.toUpperCase()} turn — ${s.heroId} ${brief(s)} | vs ${o.heroId} ${brief(o)} (hand ${s.hand.length})`)
  }
  playUpkeepPhase(state, playerIdx, rng, policy)
  if (checkGameOver(state)) return

  playIncomePhase(state, playerIdx, rng)
  playMainPhase(state, playerIdx, 'main1', policies, rng)

  // Knockdown (py, jeton vérifié) : avant le début de l'Offensive Roll Phase, le porteur
  // paie 2 CP OU saute sa phase (puis retire le jeton — choix du porteur, ruling user).
  // IA : payer dès que possible (une attaque moyenne vaut plus que 2 CP).
  const kdSelf = state.players[playerIdx]
  let skipOffense = false
  if ((kdSelf.tokens.knockdown ?? 0) > 0) {
    kdSelf.tokens.knockdown = 0
    if (kdSelf.cp >= py.KNOCKDOWN_COST) {
      kdSelf.cp -= py.KNOCKDOWN_COST
      log(state, playerIdx, 'roll', `Knockdown: paid ${py.KNOCKDOWN_COST} CP, token removed`)
    } else {
      skipOffense = true
      log(state, playerIdx, 'roll', 'Knockdown: cannot pay — skips Offensive Roll Phase, token removed')
    }
  }

  if (!skipOffense) {
    const dice = playOffensiveRollPhase(state, playerIdx, rng, policy)
    const finalDice = resolveOffensiveAlterWindow(state, playerIdx, dice, rng, policies)
    resolveAbilityPhase(state, playerIdx, finalDice, rng, policies)
    if (checkGameOver(state)) return
  }

  // Stun (py, jeton vérifié) : après la conclusion de l'Attaque, l'infligeur retire le jeton
  // et cible immédiatement le même adversaire avec une Offensive Roll Phase additionnelle.
  // Peut légitimement s'enchaîner (re-Meteorite) — garde-fou à 3 phases bonus.
  const stunOpp = state.players[(1 - playerIdx) as 0 | 1]
  for (let guard = 0; (stunOpp.tokens.stun ?? 0) > 0 && guard < 3; guard++) {
    stunOpp.tokens.stun = 0
    log(state, playerIdx, 'resolveAttack', 'Stun: token removed — additional Offensive Roll Phase vs the stunned opponent')
    const dS = playOffensiveRollPhase(state, playerIdx, rng, policy)
    const fS = resolveOffensiveAlterWindow(state, playerIdx, dS, rng, policies)
    resolveAbilityPhase(state, playerIdx, fS, rng, policies)
    if (checkGameOver(state)) return
  }

  // Combo (sm, jeton vérifié) : si l'ORP a produit une Attaque, dépense à la conclusion de la
  // Defensive Roll Phase adverse -> Offensive Roll Phase additionnelle (même cible, 1x/tour).
  // L'IA dépense toujours (une attaque moyenne vaut ~5 ; garder le jeton ne rapporte rien de plus).
  const smSelf = state.players[playerIdx]
  if (smSelf.heroId === 'sm' && (smSelf.tokens.combo ?? 0) > 0 && !smSelf.comboSpentThisTurn && smSelf.smAttackedThisPhase === true) {
    smSelf.tokens.combo = 0
    smSelf.comboSpentThisTurn = true
    log(state, playerIdx, 'resolveAttack', 'Combo spent: additional Offensive Roll Phase')
    const d2 = playOffensiveRollPhase(state, playerIdx, rng, policy)
    const f2 = resolveOffensiveAlterWindow(state, playerIdx, d2, rng, policies)
    resolveAbilityPhase(state, playerIdx, f2, rng, policies)
    if (checkGameOver(state)) return
  }

  playMainPhase(state, playerIdx, 'main2', policies, rng)
  playDiscardPhase(state, playerIdx, policy)
  playEndOfTurn(state, playerIdx)
}
