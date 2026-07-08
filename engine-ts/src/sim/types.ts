export type HeroId = 'hh' | 'bw' | 'fm' | 'rv' | 'dr' | 'th' | 'sm' | 'py' | 'du' | 'se' | 'nx' // rv = Raveness ; dr = Druid ; th = Thor ; sm = Spider-Man ; py = Pyromancer ; du = Duelist ; se = Sun Elf ; nx = Naraxus (boss)

// Data-layer token kinds: what cards/abilities grant or inflict (data/schema.ts mirrors this).
// Includes 'timeBomb', which is NOT stored in the generic bag below — it's positional
// (PlayerState.timeBombs).
export type TokenKind = 'dreadful' | 'grimPursuit' | 'agility' | 'covertOps' | 'timeBomb'

export type TimeBombPosition = '0:02' | '0:01'

// A player's generic token bag. Any kind can sit on ANY player, because cards like Transference! /
// Get That Outta Here! / What Status Effects? move status tokens across players (e.g. HH ends up
// holding BW's Agility, or a Time Bomb is sent back to BW). So tokens are stored hero-agnostically,
// keyed by kind, instead of in a hero-typed struct (the old HHTokens|BWTokens union). Two things
// stay off the bag: Time Bomb is positional (PlayerState.timeBombs — the original hero-agnostic
// precedent); and 'head' is the Haunted Head, a unique 0-or-1 token (HH's, but it moves onto
// opponents via giveHead). All keys are always present (init 0, see tokens.ts emptyBag) so
// arithmetic like `tokens.dreadful += 1` needs no guard.
export type BagToken = 'dreadful' | 'grimPursuit' | 'agility' | 'covertOps' | 'head' | 'feather' | 'hex' | 'nevermore' | 'shapeShift' | 'regen2' | 'regen1' | 'wound' | 'electrokinesis' | 'guardBreak' | 'combo' | 'webbed' | 'invisibility' | 'fireMastery' | 'burn' | 'knockdown' | 'stun' | 'disarm' | 'chargedGem' | 'sunMarked'
export type Tokens = Record<BagToken, number>

export interface PlayerState {
  heroId: HeroId
  hp: number
  cp: number
  upgradesInPlay: string[]
  hand: string[]
  deck: string[]
  discard: string[]
  tokens: Tokens
  // Time Bomb is inflicted BY Black Widow but stacks on whichever opponent she hits, so it
  // lives on PlayerState directly rather than inside BWTokens (which is BW's own resources).
  // Stack cap 2 (Black_Widow_Guide.md). Position tracks how close to detonation.
  timeBombs: TimeBombPosition[]
  // Reset to 0 at the start of this player's own turn (playUpkeepPhase). Counts Hero Upgrade
  // cards played this turn (Main Phase or, for bw, mid-Roll via Red Room Training) — needed by
  // BW's Subversion! card ("+1 dmg per Ability Upgrade played this turn").
  upgradesPlayedThisTurn: number
  // Reset to false each own-turn upkeep. Grim Pursuit's mode (b) — "after attacking, roll 1 die and
  // add that many dmg" — is usable once per turn (verified token def); this guards the once-per-turn.
  grimPursuitBonusUsedThisTurn: boolean
  // Reset to false each own-turn upkeep. Black Widow's Covert Ops is "spent once per turn during
  // your Main Phase" to put an Ability Upgrade into play for free — this guards the once-per-turn.
  covertOpsUsedThisTurn: boolean
  // Reset to false each own-turn upkeep. Grim Pursuit mode (a) — "an additional Roll Attempt
  // during your Offensive Roll Phase" — is likewise once per turn (same verified token def).
  grimPursuitRerollUsedThisTurn: boolean
  // Reset à l'upkeep. The Mines (fm) : "Once per turn, you may spend 3 CP at any time to
  // draw 1 card" — garde le 1x/tour.
  minesDrawUsedThisTurn: boolean
  // Naraxus HOARDING : des voles au heros (reduit SA defense contre cette attaque et son
  // tour entier - v1 : defense implementee, jet offensif a 5 des conserve, TODO fidele).
  hoardedDice: number
  // Raveness : cadran de Nevermore (0-3, soigné au retour) + bonus de cap Feather
  // (Birds of a Feather). Le porteur de Nevermore = tokens.nevermore > 0.
  nevermoreDial?: number
  featherCapBonus?: number
  // Stratégie d'activation choisie par le joueur humain rv ('auto' = heuristique)
  nevermoreMode?: 'absorb' | 'move'
  // Druid : forme active (druid/cat/bear, overlay) + controle humain (desactive les
  // auto-morphs heuristiques de l'IA)
  form?: string
  humanControlled?: boolean
  // Druid humain : toggle pré-armé « passer Cat dès qu'un Shape Shift est disponible pendant
  // la résolution de l'attaque » (le jeton se dépense À TOUT MOMENT — user-caught : les SS
  // gagnés par l'habileté elle-même, ex. l'Ult, doivent être dépensables avant la conclusion
  // pour le +2 Cat). Jamais automatique pour l'humain.
  drCatOnAttack?: boolean
  // Forgemaster humain : préférence pré-armée pour la face Forge (4-5) de Masterwork —
  // quelle armure doubler (undefined = heuristique du gain réel).
  fmForgePref?: 'helmet' | 'shield'
  // Thor : Mjolnir est-il chez l'adversaire ? (absent/false = sur son board) + compteurs de tour
  mjolnirAway?: boolean
  thrownThisTurn?: number
  ekDrawUsedThisTurn?: boolean
  // Spider-Man : le jeton Combo se dépense 1x/tour (texte vérifié) ; smAttackedThisPhase =
  // l'Offensive Roll Phase courante a produit une Attaque (condition du Combo).
  comboSpentThisTurn?: boolean
  smAttackedThisPhase?: boolean
  // Préférence de défense du joueur humain ('sense'/'counter', undefined = heuristique) ;
  // smDefenseActive = la défense résolue pour l'attaque EN COURS ('sense-swing' = Swing
  // Escape! payé, succès sur Web au lieu de Spider), posé au jet, consommé au comptage.
  smDefenseMode?: 'sense' | 'counter'
  smDefenseActive?: 'sense' | 'sense-swing' | 'counter'
  // Toggles humains pré-armés : Swing Escape! (payé seulement si ça convertit échec->succès)
  // et « dépenser Invisibility pour défendre contre l'indéfendable » (l'IA a ses heuristiques).
  swingEscapeArmed?: boolean
  smInvisDefendArmed?: boolean
  smInvisRerollArmed?: boolean
  // La défense qui vient de se résoudre a prévenu via Spider-Sense (condition d'Invisible Punch!).
  spiderSensePrevented?: boolean
  // Pyromancer : bonus permanent au stack limit de Fire Mastery (Fire Up!/Blazing Soul/
  // Burning Soul II — cap effectif = 5 + bonus) ; warmUpCpChoice = CP que le joueur humain
  // veut dépenser sur Warm Up! (l'IA a son heuristique) ; knockdownPay = préférence humaine
  // pré-armée (payer 2 CP au lieu de sauter l'Offensive Roll Phase).
  fmCapBonus?: number
  warmUpCpChoice?: number
  knockdownPay?: boolean
  // Duelist : position du jeton Footwork (-2..+2, undefined = 0 Neutral). Un seul Bonus de
  // position résolu par TOUR (offensif ou défensif) — le flag est remis à zéro pour les DEUX
  // joueurs à chaque upkeep, car le bonus défensif se consomme pendant le tour adverse.
  // duRepositionDir = préférence humaine pré-armée pour le passif Reposition ('forward'/
  // 'backward1'/'backward2', undefined = heuristique IA).
  footwork?: number
  footworkBonusUsedThisTurn?: boolean
  duRepositionDir?: 'forward' | 'forward2' | 'backward1' | 'backward2'
  // Direction pré-armée du joueur humain pour les Steps gratuits des habiletés ('forward'
  // par défaut : le Bonus offensif de la position finale paie sur l'attaque en cours).
  duStepsMode?: 'forward' | 'backward' | 'none'
  // Choix humain pré-armé pour la résolution du Disarm à l'upkeep : 'skip' = sauter l'Income,
  // sinon l'id de la carte à défausser. Consommé (remis à undefined) à la résolution.
  duDisarmChoice?: string
  // Sun Elf : cadran Sun Dial 0-5 (undefined = 0) + face (false/undefined = DUSK, true = DAWN).
  // seDawnSpendArmed = toggle humain pré-armé « ajouter la valeur du cadran à l'attaque »
  // (côté DAWN seulement ; l'IA a son heuristique). seGemArmed = dépenser Charged Gem à la
  // prochaine Main Phase (humain ; l'IA auto-dépense — jamais négatif).
  sunDial?: number
  sunDialDawn?: boolean
  seDawnSpendArmed?: boolean
  // Choix humains pré-armés (JAMAIS d'heuristique auto pour l'humain — leçon Guard Break) :
  // Solar Burst I « Choose one », Solstice! et Sashay (du) « Choose one ».
  seBurstChoice?: 'gem' | 'mark'
  seSolsticeHeal?: boolean
  duSashayHeal?: boolean
  // Disarm résolu à l'upkeep : si le porteur n'a pas défaussé, il saute son Income Phase
  // (le flag est posé à l'upkeep, consommé par playIncomePhase).
  skipIncomeThisTurn?: boolean
  // Forgemaster only (empty/zero for other heroes). `forge` = Ore card ids sitting on THE
  // FORGE (public zone: craft material / scrap fuel). `armor` = crafted Armor tier per slot
  // (0 = none, 1 = Gold, 2 = Diamond, 3 = Ultimanium) — Armor is NOT a bag token: it can't be
  // transferred/removed by generic token cards (verified leaflet: "may not be removed or
  // transferred by any means except as a result of this Hero's effects").
  forge: string[]
  armor: { helmet: number; shield: number }
}

// Verified order (official rulebook, characters/rules/Turn Phases.png, 2026-07-01):
// Upkeep -> Income -> Main1 -> OffensiveRoll -> DefensiveRoll -> Main2 -> Discard.
export type Phase =
  | 'upkeep'
  | 'income'
  | 'main1'
  | 'roll'
  | 'resolveAttack'
  | 'defense'
  | 'main2'
  | 'discard'
  | 'endOfTurn'

export interface TurnLogEntry {
  turn: number
  playerIdx: 0 | 1
  phase: Phase
  message: string
}

export interface GameState {
  turnNumber: number
  activePlayerIdx: 0 | 1
  players: [PlayerState, PlayerState]
  log: TurnLogEntry[]
  // winner === null means EITHER "game still ongoing" OR "draw" (both players at <=0 HP,
  // simultaneously) OR "timeout" — these are indistinguishable by `winner` alone, which is why
  // `gameOver` exists: loops must gate on `!gameOver` (not `winner === null`), otherwise a draw
  // (winner set to null on a mutual kill) reads as "ongoing" and spins the game to MAX_TURNS.
  winner: 0 | 1 | null
  // Set true by checkGameOver on any terminal HP state (win OR mutual-kill draw). The match/
  // self-play/replay loops stop on `!gameOver` so a draw ends immediately instead of spinning.
  gameOver: boolean
  // Golden Rule #4 (Advanced Rules): damage is accumulated and applied SIMULTANEOUSLY at the
  // conclusion of the Phase, so a mutual kill (attack + counter-damage both lethal) is a draw.
  // Indexed by playerIdx = damage queued AGAINST that player. queueDamage/flushDamage in turn.ts;
  // flushed at the end of each attack-resolution unit. Always [0,0] between resolution units.
  pendingDamage: [number, number]
  // Transient during a Defensive Roll Phase: the attack currently being defended. `remaining` is
  // the still-unprevented incoming damage, so defensive-card plays in the DRP5 response window can
  // whittle it down uniformly (via applyWindowAction), then DRP6 (finalizePendingAttackDamage)
  // queues it and applies simultaneously with the counter-damage. null outside a DRP.
  pendingAttack: { attackerIdx: 0 | 1; defenderIdx: 0 | 1; remaining: number } | null
  // Transient during the Offensive Roll Phase's "opponent may alter my dice" window (ORP2): the
  // roller and their just-rolled dice. alterDie/rerollDie actions mutate `dice` in place; once the
  // window closes the (possibly altered) dice are matched to an ability, so the roller re-decides
  // on whatever the dice became. null outside that window.
  pendingRoll: { rollerIdx: 0 | 1; dice: number[] } | null
  // Transient during the Defensive Roll Phase's DRP3 alter window: the attack context the tail of
  // resolveDefense (DRP4-6) needs but which isn't otherwise on the state (incomingDamage is a local
  // parameter). Lets the RL lookahead score a defense-roll alteration by cloning, applying it, then
  // running finalizeDefenseRoll. defenderIdx = 1 - attackerIdx. null outside that window.
  pendingDefenseRoll: { attackerIdx: 0 | 1; incomingDamage: number } | null
  // Mode boss : Naraxus lance 2 dés d'attaque et prend le plus haut (hard mode, planche vérifiée).
  bossHard?: boolean
  // Le Nevermore Die Roll de cet upkeep a déjà été résolu par la fenêtre interactive (Cull!/Feathers)
  nevermoreRollResolved?: boolean
}

export interface AbilityCandidate {
  name: string
  baseDamage: number | null
  defendable: boolean
}

// --- Unified decision model (see plan quiet-conjuring-duckling.md, Stage 2) ---------------------
// A single legal move a player can make when the engine asks them to decide, via Policy.decide.
// The engine enumerates the legal WindowActions at each decision point; the Policy picks one.
// Kept intentionally small — new action kinds (spend token, alter die, activate ability) are
// added as later stages migrate more decisions onto this model.
// Status-effect token kinds that cross-player cards (Transference! / Get That Outta Here! / What
// Status Effects?) may move or remove. Per verified hero.json token defs: all status effects EXCEPT
// covertOps ("may not be transferred or removed by any means"). The Haunted Head has its own
// dedicated card (Rolling Pumpkin! → moveHead) and is deliberately excluded here.
export type TransferableToken = 'dreadful' | 'grimPursuit' | 'agility' | 'timeBomb'

export type WindowAction =
  | { kind: 'pass' } // decline to act — a pass-pass (both players pass in a row) closes the window
  | { kind: 'playCard'; cardId: string }
  | { kind: 'alterDie'; cardId: string; dieIndex: number; delta: 1 | -1 } // Tip It!: nudge a die ±1
  | { kind: 'rerollDie'; cardId: string; dieIndex: number } // Helping Hand!: force a die reroll
  // Better D!: an additional defense Roll Attempt — reroll the roller's dice; `dieIndices`
  // restricts the reroll to chosen dice (a Roll Attempt is "up to five dice"), omitted = all.
  | { kind: 'rerollAll'; cardId: string; dieIndices?: number[] }
  // Sell a card from hand for 1 CP (official rules: allowed during your Main Phases, any card,
  // whatever its cost — same exchange rate as the forced end-of-turn sale).
  | { kind: 'sellCard'; cardId: string }
  // So Wild! (1 set) / Twice As Wild! (2 sets): set the value of any die on the in-progress roll —
  // either player may target the roller's dice (user-confirmed "any die" includes the opponent's).
  | { kind: 'setDie'; cardId: string; sets: { dieIndex: number; value: number }[] }
  // An Instant self-buff (Getting Paid!, Double/Triple Up!, Dark Surprise!, Assemble!) playable in
  // ANY response window by ANY participant; resolves immediately for the player who plays it.
  | { kind: 'playInstant'; cardId: string }
  // Transference!: move one status-effect token from one player to another (1v1: to = the other).
  | { kind: 'transferToken'; cardId: string; tokenKind: TransferableToken; fromIdx: 0 | 1; toIdx: 0 | 1 }
  // Get That Outta Here!: remove one status-effect token from a chosen player.
  | { kind: 'removeToken'; cardId: string; tokenKind: TransferableToken; targetIdx: 0 | 1 }
  // What Status Effects?: remove ALL status-effect tokens from a chosen player.
  | { kind: 'removeAllTokens'; cardId: string; targetIdx: 0 | 1 }
  // Rolling Pumpkin!: move the Haunted Head to a chosen player.
  | { kind: 'moveHead'; cardId: string; toIdx: 0 | 1 }
  // Grim Pursuit spend mode (b): after attacking, roll 1 die and add it as bonus damage (not a card).
  | { kind: 'spendGrimPursuitBonus' }
  // Black Widow's Covert Ops: spend 1 Covert Ops (once/turn, Main Phase) to put an Ability Upgrade
  // from hand into play for FREE (no CP). The key ramp toward the 4-/5-upgrade power thresholds.
  | { kind: 'covertOpsUpgrade'; cardId: string }
  // Covert Ops mode (b) (texte vérifié du jeton) : regarde le top 3 du deck ; si AUCUN
  // upgrade, cherche un upgrade du deck vers la MAIN puis mélange ; sinon remet (raté).
  | { kind: 'covertOpsSearch' }

// What kind of decision point this is, plus any context the enumeration/application needs.
export interface WindowContext {
  // 'offensiveRoll' / 'defenseRoll' both alter an in-progress roll on state.pendingRoll (ORP2 /
  // DRP3); they differ only in which extra actions are legal (Better D! is defense-only).
  windowType: 'mainPhase' | 'defense' | 'offensiveRoll' | 'defenseRoll'
  phase?: Phase // for card plays that are phase-scoped (playCard needs it)
  eludeEligible?: boolean // 'defense' window only: Elude! is offered only if the Agility roll was 5-6
}

// Handed to Policy.decide: the context plus every legal action (a response window always includes
// a { kind: 'pass' } option). The Policy must return one of `options`.
export interface DecisionRequest {
  ctx: WindowContext
  options: WindowAction[]
}
