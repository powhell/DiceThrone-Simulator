// Enumerates the legal candidate actions for each Policy decision method, so valueGreedyPolicy
// can score every one via lookahead.ts and pick the best. Pure functions — no state mutation,
// no RNG. See the RL plan (2026-07-02) for the v1 simplifications noted per method (full subset
// search where the branching factor is small enough, restricted searches where it isn't).
import type { AbilityCandidate, PlayerState } from '../types.js'
import { hasHead } from '../tokens.js'
import type { RollManipulationChoice } from '../policy.js'
import { cardById } from '../data/load.js'
import type { CardTemplate, HeroTemplate } from '../data/schema.js'

function powerset<T>(items: T[]): T[][] {
  let result: T[][] = [[]]
  for (const item of items) result = result.concat(result.map(subset => [...subset, item]))
  return result
}

function combinations<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (items.length < k) return []
  const [first, ...rest] = items
  return [...combinations(rest, k - 1).map(c => [first, ...c]), ...combinations(rest, k)]
}

// chooseAbility: the DP oracle already hands us the full legal candidate list — nothing to
// enumerate, just pass it through (kept as a function for a consistent call shape everywhere).
export function enumerateAbilityCandidates(candidates: AbilityCandidate[]): AbilityCandidate[] {
  return candidates
}

export function enumerateHorrifyBonus(): Array<'dreadful' | 'grimPursuit'> {
  return ['dreadful', 'grimPursuit']
}

export function enumerateHeadlessMayhem(self: PlayerState, canTerrorize: boolean): Array<'terrorize' | 'giveHead' | 'none'> {
  const options: Array<'terrorize' | 'giveHead' | 'none'> = ['none']
  if (canTerrorize) options.push('terrorize')
  if (hasHead(self)) options.push('giveHead')
  return options
}

export function enumerateSabotageReroll(): boolean[] {
  return [true, false]
}

// chooseMainPhaseCards / chooseMidRollCards: full subset search over the hand's upgrade cards,
// pre-filtered to subsets whose independently-computed CP cost (ignoring same-slot interactions
// WITHIN the subset — a deliberate v1 simplification; playCard() re-validates and gracefully
// skips at apply time regardless, so this can't corrupt a lookahead, only under-explore a rare
// edge case) fits the current CP budget. Hand is capped at 6 cards, so at most 2^6=64 subsets.
export function enumerateAffordableUpgradeSubsets(self: PlayerState, hero: HeroTemplate): string[][] {
  const upgradeCards = self.hand
    .map(id => cardById(hero, id))
    .filter((c): c is CardTemplate => !!c && c.kind === 'upgrade' && c.cpCost != null)
    .sort((a, b) => (a.cpCost ?? 0) - (b.cpCost ?? 0))

  const costOf = (card: CardTemplate): number => {
    const existingId = self.upgradesInPlay.find(id => cardById(hero, id)?.upgradeSlot === card.upgradeSlot)
    const existingCost = existingId ? (cardById(hero, existingId)?.cpCost ?? 0) : 0
    return Math.max(0, (card.cpCost ?? 0) - existingCost)
  }

  return powerset(upgradeCards)
    .filter(subset => subset.reduce((sum, c) => sum + costOf(c), 0) <= self.cp)
    .map(subset => subset.map(c => c.id))
}

// chooseCardsToDiscard: v1 only enumerates selling EXACTLY the required overflow (not extra
// for CP) — a stated simplification, not a hard engine limitation.
export function enumerateDiscardSubsets(hand: string[], maxHandSize: number): string[][] {
  const overflow = hand.length - maxHandSize
  if (overflow <= 0) return [[]]
  return combinations(hand, overflow)
}

// chooseDefensiveCards / chooseAttackModifierCards: eligibleCardIds is already pre-filtered by
// turn.ts to <=4 ids, so a full subset search is cheap and exact.
export function enumerateSmallCardSubsets(eligibleCardIds: string[]): string[][] {
  return powerset(eligibleCardIds)
}

// chooseRollManipulationCards: v1 restricts each decision to AT MOST ONE card play (matches how
// the real hook fires once per roll-phase iteration) plus the always-available "play nothing".
// Per-card candidate counts (die INDEX into the current `dice` array, and VALUE where the card
// allows a free choice):
//  - six-it: 1 die, value fixed at 6 (card text: "change... to a 6").
//  - so-wild: 1 die, any of the 6 values (card text: genuinely free choice).
//  - samesies: 1 die set to match another die's CURRENT value (card text: copy, not free pick).
//  - twice-as-wild: 2 dice, values restricted to {6, current die values} rather than the full
//    6x6 per-pair search — a stated v1 simplification (the useful values are almost always "max
//    it out" or "match an existing die", not an arbitrary middling value).
//  - try-try-again: reroll 1 or 2 dice, no value search (rerolled fresh by the engine).
//  - one-more-time: no dice/value choice at all, grants an extra Roll Attempt.
function enumerateForCard(cardId: string, dice: number[]): RollManipulationChoice[] {
  const n = dice.length
  const out: RollManipulationChoice[] = []
  if (cardId === 'six-it' || cardId === 'radiant-exchange') {
    // radiant-exchange (se) : même géométrie que Six-It! (1 dé -> 6), coût cadran géré au apply
    for (let i = 0; i < n; i++) out.push({ cardId, dieIndices: [i], values: [6] })
  } else if (cardId === 'heavy-hand') {
    // Heavy Hand! (mb) : change 1 de tes dés en 1, 2 ou 3 (carte vérifiée). Le chiffre compte
    // pour les suites/of-a-kind, pas seulement le symbole — on énumère les trois valeurs.
    for (let i = 0; i < n; i++) {
      for (const v of [1, 2, 3]) if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] })
    }
  } else if (cardId === 'so-wild') {
    // Pruned from the full 1-6 value search to {6} ∪ current die values (same rationale as
    // twice-as-wild below): the useful sets are "max it out" or "match an existing die" —
    // keeps the scorer's candidate count bounded now that these are actually scored.
    const soWildValues = Array.from(new Set([6, ...dice]))
    for (let i = 0; i < n; i++) {
      for (const v of soWildValues) {
        if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] })
      }
    }
  } else if (cardId === 'he-is-worthy' || cardId === 'quick-footwork') {
    // Thor / Duelist : change 1 de tes des en 4 ou 5 (cartes verifiees, meme effet)
    for (let i = 0; i < n; i++) {
      for (const v of [4, 5]) if (v !== dice[i]) out.push({ cardId, dieIndices: [i], values: [v] })
    }
  } else if (cardId === 'samesies') {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j) out.push({ cardId, dieIndices: [i], values: [dice[j]] })
      }
    }
  } else if (cardId === 'twice-as-wild') {
    // Tightened now that these get scored (was {6} ∪ all current values, ~360 pairs·value² in
    // the worst case): {6, most frequent current value} — "complete the N-of-a-kind" and "max
    // out" cover the real uses; caps the pair search at 10·2² = 40 candidates.
    const counts = new Map<number, number>()
    for (const d of dice) counts.set(d, (counts.get(d) ?? 0) + 1)
    const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
    const candidateValues = Array.from(new Set([6, mode]))
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (const v1 of candidateValues) {
          for (const v2 of candidateValues) {
            out.push({ cardId, dieIndices: [i, j], values: [v1, v2] })
          }
        }
      }
    }
  } else if (cardId === 'try-try-again') {
    for (let i = 0; i < n; i++) out.push({ cardId, dieIndices: [i] })
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) out.push({ cardId, dieIndices: [i, j] })
    }
  } else if (cardId === 'one-more-time') {
    out.push({ cardId })
  }
  return out
}

export function enumerateRollManipulationChoices(dice: number[], eligibleCardIds: string[]): RollManipulationChoice[][] {
  const options: RollManipulationChoice[][] = [[]] // "play nothing" is always legal
  for (const cardId of eligibleCardIds) {
    for (const choice of enumerateForCard(cardId, dice)) options.push([choice])
  }
  return options
}
