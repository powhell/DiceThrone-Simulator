// Template schema for character data. Design goal: every field is either a verified real
// rule fact or an explicit null/`verified: false` placeholder — no hand-tuned "damage
// equivalent" heuristics allowed in this layer (those live only in the deprecated
// characters/*/constants.ts, which this template replaces as the source of truth for sim/).
//
// Authored as JSON (see characters/<id>/hero.json) so it's easy to fill in by hand or by
// feeding card scans/photos to an AI and asking for output in this exact shape.

export type TokenKind = 'dreadful' | 'grimPursuit' | 'agility' | 'covertOps' | 'timeBomb'

// A stacking counter resource (Dreadful, Agility, Covert Ops, ...).
export interface TokenTemplate {
  id: TokenKind
  name: string
  startingCount: number
  stackCap: number | null // null = uncapped
  description: string
}

// A boolean hero-state flag that isn't a stacking counter (e.g. HH's Haunted Head location).
export interface FlagTemplate {
  id: string
  name: string
  startingValue: boolean
  description: string
}

export interface AbilityTemplate {
  id: string
  // Must exactly match the `name` string produced by <hero>Config.buildAbilityBoard()
  // (engine-ts/src/characters/<hero>/abilities.ts) — that's how ability-resolver.ts
  // correlates the DP's real dice-pattern match against this data.
  boardName: string
  dicePattern: string // human-readable, e.g. "AAA" or "Small Straight (4 consecutive)"
  baseDamage: number | null // null = TODO(user): not yet verified/known
  defendable: boolean | null // null = unknown
  tokensGrantedToSelf?: Partial<Record<TokenKind, number>>
  tokensInflictedOnOpponent?: Partial<Record<TokenKind, number>>
  cpGain?: number
  cardDraw?: number
  bonusDamagePerUpgrade?: number
  thresholdBonus?: { upgradesAtLeast: number; bonusDamage: number }
  // Conditional CP gain based on upgrade count (BW's Grapple: "if >=2 Ability Upgrades in
  // play, gain 1 CP" — becomes unconditional on the upgraded version, modeled by omitting
  // this field and using cpGain instead).
  cpGainIfUpgradesAtLeast?: { upgradesAtLeast: number; cpGain: number }
  // Hero-specific conditional effects (HH's Haunted Head bonuses).
  tokensGrantedIfHasHead?: Partial<Record<TokenKind, number>>
  cardDrawIfHasHead?: boolean
  // Hero-specific special effects (BW).
  advancesAllTimeBombsInPlay?: boolean
  searchUpgradesIntoPlay?: number
  // On N-of-a-kind by face VALUE (not symbol count) among the resolved dice, grant a bonus
  // (HH's Cleave: "On 4-of-a-kind (#'s), gain Dreadful"; FM's Pick Axe: "On 4-of-a-kind
  // (#'s), gain 1 CP" — hence the optional cpGain).
  numberMatchBonus?: { ofAKind: number; tokensGranted?: Partial<Record<TokenKind, number>>; cpGain?: number }
  // Forgemaster (fm) ability effects — see characters/fm/hero.json and the leaflet's
  // Forging Info Card for the Mine/Forge vocabulary.
  minesDeck?: boolean                 // "Mine your deck" as part of resolving this ability
  revealAllMinedOre?: boolean         // A Good Haul: reveal ALL Ore in the mined top-3, all go to The Forge
  searchOreToForge?: number           // Final Touches!: tutor N Ore from deck onto The Forge, then shuffle
  thresholdBonusArmor?: { armorAtLeast: number; bonusDamage: number } // Armored Up: "+2 dmg if you have 2 Armor"
  // A secondary dice roll resolved as part of this ability (HH's Spectral Assault: roll N
  // extra dice, tally symbols for bonus effects). diceCount is a human-readable formula.
  bonusRoll?: {
    diceCount: string
    perSymbolDamage?: Partial<Record<'A' | 'B' | 'C', number>>
    undefendableOnSymbolPair?: 'A' | 'B' | 'C'
    perSymbolTokens?: Partial<Record<'A' | 'B' | 'C', { token: TokenKind; amount: number }>>
    addRolledValueAsDamage?: boolean // FM's Furnace: "roll 1 die: Add dmg equal to the value rolled"
  }
  // Some Hero Upgrade ("II") cards replace this ability's own printed numbers when in play
  // (distinct from `altAbility` on CardTemplate, which is a wholly separate new ability the
  // same II card unlocks). E.g. HH's Cleave II changes Cleave 3A's dmg from 4 to 5, and lowers
  // its number-match threshold; BW's Hacked II changes Hacked's base dmg from 5 to 6 (on top
  // of the existing >=3-upgrades +2 threshold bonus, giving the printed "8 dmg instead").
  // `upgradeId` names the Hero Upgrade card id that activates this override.
  upgradedBy?: {
    upgradeId: string
    baseDamage?: number
    tokensGrantedToSelf?: Partial<Record<TokenKind, number>>
    // BW's Grapple: base card requires >=2 Ability Upgrades in play for its CP gain
    // (`cpGainIfUpgradesAtLeast`); Grapple II makes it unconditional. Setting `cpGain` here
    // replaces (not adds to) the base ability's `cpGainIfUpgradesAtLeast` once upgraded — see
    // resolvedAbilityByBoardName, which drops the conditional field whenever this is set.
    cpGain?: number
  }
  notes?: string
  verified: boolean
}

export interface CardEffectTemplate {
  damage?: number
  tokensGrantedToSelf?: Partial<Record<TokenKind, number>>
  tokensInflictedOnOpponent?: Partial<Record<TokenKind, number>>
  cpGain?: number
  cardDraw?: number
  heal?: number
  rerollOwnDie?: boolean // fm Diamond Ore scrap: "You may re-roll 1 of your dice"
  setOwnDieTo?: number   // fm Ultimanium Ore scrap: "Change the value of one of your dice to a 6"
  other?: string // anything real but not yet modeled structurally
}

export interface CardTemplate {
  id: string
  name: string
  // 'ore' (Forgemaster): not playable from hand like an action — placed on THE FORGE
  // (Mining/Main Phase), used as Crafting material or for its one-shot Scrap Effect.
  kind: 'upgrade' | 'action' | 'ultimate' | 'ore'
  cpCost: number | null
  // Number of identical copies in the hero's deck (Forgemaster is the only hero with
  // duplicated cards — Gold Ore x9, Diamond Ore x6). Omitted = 1.
  count?: number
  // kind:'ore' only. The Scrap Effect: choose ONE of these options, then discard the card.
  // Only performable while the Ore sits on THE FORGE (verified leaflet clarification).
  scrapOptions?: CardEffectTemplate[]
  text: string // literal card text, once transcribed
  effect: CardEffectTemplate | null // structured effect, filled in once `text` is verified
  // Some Hero Upgrade cards unlock a second, differently-named dice-triggered ability once
  // the upgrade is in play (e.g. HH's "Cleave II" also unlocks "Ghostly Charge"; BW's guide
  // called this pattern "alt-attack" for Infiltrate/Widow's Gauntlets/Grapple/Vengeance).
  // Same shape as a board AbilityTemplate — it's a real ability, just gated by this card.
  altAbility?: AbilityTemplate | null
  // kind:'upgrade' only. The named Hero Board space this card occupies (verified rulebook,
  // "Hero Upgrades": "place the card onto the space with the same name on your Hero Board").
  // Playing a card whose upgradeSlot already has an upgrade in play REPLACES it and only
  // costs the difference in CP ("upgrading from level II to level III, pay only the
  // difference"). Not the same as the ability's `id` — e.g. HH's 3 Cleave board entries
  // (cleave_3a/4a/5a) all share the single upgradeSlot "cleave".
  upgradeSlot?: string
  // kind:'action' only. When the card may legally be played (verified rulebook, "Action
  // Cards"). 'instant' cards can technically be played at any time/interrupt anything, but
  // this engine only offers them during Main Phase for now (TODO(user): true interrupt
  // timing not modeled). 'rollPhase' cards (dice manipulation, extra rolls, attack modifiers,
  // post-Attack prevention) are wired — see turn.ts's isCardPlayableNow comment for exactly
  // where each one is resolved (not through playCard()'s dispatcher at all). Still TODO(user):
  // Helping Hand! (opponent-interrupt timing) and Better D! (no Defensive Roll Phase reroll
  // step exists).
  actionTiming?: 'instant' | 'mainPhase' | 'rollPhase'
  verified: boolean
}

// Upkeep/end-of-turn choices that aren't triggered by a dice pattern (e.g. HH's Terrorize).
export interface PassiveTemplate {
  id: string
  name: string
  trigger: string // e.g. "Upkeep Phase (player's choice)", "end of your turn"
  text: string
  verified: boolean
}

// A hero's defense-roll ability (HH's Hallowed Reckoning, BW's Sabotage). Kept as
// descriptive text + a few structured hints rather than a fully generic executable spec —
// the actual resolution logic is hand-written per hero (hero/{hh,bw}.rules.ts), same as the
// rest of the engine; this is for verify.html display + as a spec to implement against.
export interface DefenseTemplate {
  name: string
  diceCount: string // e.g. "1 + Dreadful (up to 5 total)"
  text: string
  verified: boolean
}

// Forgemaster Armor (leaflet "ARMOR — Unique Status Effect", stack limit 1 Helmet / 1 Shield).
// Crafted during Main Phase from Blueprint Ore on THE FORGE (+ the previous-tier Armor, which
// returns to the leaflet). May not be removed or transferred except by this hero's effects.
export interface ArmorTemplate {
  id: string
  name: string
  slot: 'helmet' | 'shield'
  tier: number // 1 = Gold, 2 = Diamond, 3 = Ultimanium
  blueprint: { ore: Record<string, number>; requiresArmorId?: string }
  effectText: string // verified leaflet text of what activating it does
  verified: boolean
}

export interface HeroTemplate {
  id: string
  name: string
  diceAnatomy: string
  startingHp: number | null
  cpIncomePerTurn: number | null
  setupNotes?: string
  source: string // provenance note, e.g. "UNVERIFIED draft ported from deleted strategy guide"
  tokens: TokenTemplate[]
  flags: FlagTemplate[]
  abilities: AbilityTemplate[]
  passives?: PassiveTemplate[]
  defense?: DefenseTemplate | null
  cards: CardTemplate[]
  armors?: ArmorTemplate[] // Forgemaster only
}

export interface CommonCardsTemplate {
  source: string
  cards: CardTemplate[]
}

export interface VerificationReport {
  heroId: string
  totalAbilities: number
  verifiedAbilities: number
  totalCards: number
  verifiedCards: number
  unverifiedNames: string[]
}

export function reportVerification(hero: HeroTemplate): VerificationReport {
  const unverifiedNames: string[] = []
  for (const a of hero.abilities) if (!a.verified) unverifiedNames.push(`ability: ${a.boardName}`)
  for (const c of hero.cards) if (!c.verified) unverifiedNames.push(`card: ${c.name}`)
  return {
    heroId: hero.id,
    totalAbilities: hero.abilities.length,
    verifiedAbilities: hero.abilities.filter(a => a.verified).length,
    totalCards: hero.cards.length,
    verifiedCards: hero.cards.filter(c => c.verified).length,
    unverifiedNames,
  }
}
