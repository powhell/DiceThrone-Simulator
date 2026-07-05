// Loads the JSON character templates (see schema.ts) as typed data. This is the sim
// engine's only source of ability/card facts — no hand-tuned EV constants.
import type { HeroTemplate, CommonCardsTemplate, AbilityTemplate, CardTemplate } from './schema.js'
import hhHeroJson from './characters/hh/hero.json'
import bwHeroJson from './characters/bw/hero.json'
import fmHeroJson from './characters/fm/hero.json'
import commonCardsJson from './common-cards.json'

export const hhHero = hhHeroJson as unknown as HeroTemplate
export const bwHero = bwHeroJson as unknown as HeroTemplate
export const fmHero = fmHeroJson as unknown as HeroTemplate
export const commonCards = commonCardsJson as unknown as CommonCardsTemplate

// Naraxus (boss) : template minimal construit en dur — pas de cartes, pas d'habiletés de
// board au sens héros (ses 6 attaques vivent dans sim/hero/nx.rules.ts + turn.ts).
export const nxHero: HeroTemplate = {
  id: 'nx', name: 'Naraxus the Devourer',
  diceAnatomy: '1 dé (2 en hard mode, garde le plus haut) — la face choisit son attaque.',
  startingHp: 65, cpIncomePerTurn: null,
  source: 'Planche Naraxus_Battle (scan user 2026-07-05), mode normal + hard vérifiés.',
  tokens: [], flags: [], abilities: [], passives: [],
  defense: { name: 'Dragon Scales', diceCount: '1', text: 'Roll 1 die: on 1 prevent 1, on 2-5 prevent 3, on 6 prevent 5. Activates against any defendable dmg.', verified: true },
  cards: [],
}

export function heroTemplateFor(heroId: 'hh' | 'bw' | 'fm' | 'nx'): HeroTemplate {
  return heroId === 'hh' ? hhHero : heroId === 'fm' ? fmHero : heroId === 'nx' ? nxHero : bwHero
}

// Searches both the hero's base abilities and every card's altAbility (e.g. Cleave II's
// Ghostly Charge) — a name only reaches here as a resolveMatchedAbilities candidate when its
// gating upgrade is actually in play (see characters/<hero>/abilities.ts getCandidates()), so
// no extra "is the upgrade active" check is needed at lookup time.
export function abilityByBoardName(hero: HeroTemplate, boardName: string): AbilityTemplate | undefined {
  const base = hero.abilities.find(a => a.boardName === boardName)
  if (base) return base
  for (const card of hero.cards) {
    if (card.altAbility?.boardName === boardName) return card.altAbility
  }
  return undefined
}

export function cardById(hero: HeroTemplate, cardId: string): CardTemplate | undefined {
  return hero.cards.find(c => c.id === cardId) ?? commonCards.cards.find(c => c.id === cardId)
}

// Like abilityByBoardName, but also applies the effective numbers once the ability's own
// Hero Upgrade ("II") card is in play (AbilityTemplate.upgradedBy) — e.g. Cleave 3A deals 5
// dmg instead of 4 once cleave-ii is in upgradesInPlay. This is the lookup real ability
// resolution (turn.ts) and Policy candidate scoring (ability-resolver.ts) should use; plain
// abilityByBoardName is for callers that only need the raw/base data (e.g. verify-coverage.ts).
export function resolvedAbilityByBoardName(
  hero: HeroTemplate,
  boardName: string,
  upgradeIds: string[],
): AbilityTemplate | undefined {
  const base = abilityByBoardName(hero, boardName)
  if (!base?.upgradedBy) return base
  if (!upgradeIds.includes(base.upgradedBy.upgradeId)) return base
  return {
    ...base,
    baseDamage: base.upgradedBy.baseDamage ?? base.baseDamage,
    tokensGrantedToSelf: base.upgradedBy.tokensGrantedToSelf ?? base.tokensGrantedToSelf,
    cpGain: base.upgradedBy.cpGain ?? base.cpGain,
    // Grapple II makes the CP gain unconditional — drop the >=N-upgrades gate so applyBWAbility
    // doesn't also grant it a second time via cpGainIfUpgradesAtLeast.
    cpGainIfUpgradesAtLeast: base.upgradedBy.cpGain != null ? undefined : base.cpGainIfUpgradesAtLeast,
  }
}
