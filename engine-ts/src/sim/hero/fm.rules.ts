// Forgemaster (fm) — règles vérifiées depuis les scans (characters/forge_master/):
// Mine / The Forge / Crafting / Scrap / Armor / défense Masterwork.
// v1 : les décisions Mine/Craft sont des heuristiques automatiques (TODO(user): les exposer
// comme décisions de Policy quand on branchera le RL et l'UI interactive).
import type { PlayerState, Tokens } from '../types.js'
import type { RNG } from '../rng.js'
import { rollDie } from '../rng.js'
import { emptyBag } from '../tokens.js'
import { fmHero } from '../data/load.js'

export function createInitialFMTokens(): Tokens {
  return emptyBag() // aucun jeton de statut propre — tout vit dans forge[]/armor
}

// Rang de valeur d'un Ore (pour "révèle le meilleur" / tutor) : Ultimanium > Diamond > Gold.
const ORE_RANK: Record<string, number> = { 'ultimanium-ore': 3, 'diamond-ore': 2, 'gold-ore': 1 }
export function isOre(cardId: string): boolean { return cardId in ORE_RANK }

export function armorCount(p: PlayerState): number {
  return (p.armor.helmet > 0 ? 1 : 0) + (p.armor.shield > 0 ? 1 : 0)
}

// "Mine your deck" (Forging Info Card) : regarde les 3 cartes du dessus. Révèle UN Ore ->
// The Forge, OU ne révèle rien et gagne 1 CP (légal même sans Ore vu). Le reste va SOUS le
// deck (ordre au choix — v1 : ordre d'origine). revealAll = A Good Haul ("you may reveal all
// ORE cards that are Mined in this way").
// Heuristique v1 : révéler le meilleur Ore trouvé (jamais préférer le CP à un Ore) ;
// revealAll : tout Ore trouvé va sur la Forge.
export function mine(self: PlayerState, revealAll = false): { revealed: string[]; cpGained: number } {
  const top = self.deck.splice(0, Math.min(3, self.deck.length))
  const ores = top.filter(isOre).sort((a, b) => ORE_RANK[b] - ORE_RANK[a])
  const revealed = revealAll ? ores : ores.slice(0, 1)
  for (const id of revealed) top.splice(top.indexOf(id), 1)
  self.forge.push(...revealed)
  self.deck.push(...top) // dessous du deck
  const cpGained = revealed.length === 0 ? 1 : 0
  self.cp += cpGained
  return { revealed, cpGained }
}

// Final Touches! : cherche le meilleur Ore du deck -> Forge, puis shuffle (si aucun Ore :
// ignorer l'effet mais shuffle quand même — clarification vérifiée du leaflet).
export function tutorOreToForge(self: PlayerState, rng: RNG): string | null {
  const best = self.deck.filter(isOre).sort((a, b) => ORE_RANK[b] - ORE_RANK[a])[0] ?? null
  if (best) {
    self.deck.splice(self.deck.indexOf(best), 1)
    self.forge.push(best)
  }
  // shuffle in place (Fisher-Yates avec le rng du match, déterministe par seed)
  for (let i = self.deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [self.deck[i], self.deck[j]] = [self.deck[j], self.deck[i]]
  }
  return best
}

// Crafting (Main Phase) : v1 auto-greedy — monte toujours la pièce la plus haute craftable,
// bouclier avant casque à tier égal (la prévention protège les PV, le contre ne fait que
// puncher). Ore consommés -> dessous du deck. Retourne l'armure craftée ou null.
export function craftOnce(self: PlayerState): { armorId: string; slot: 'helmet' | 'shield'; tier: number } | null {
  const armors = (fmHero.armors ?? []).slice().sort((a, b) => (b.tier - a.tier) || (a.slot === 'shield' ? -1 : 1))
  for (const a of armors) {
    const cur = self.armor[a.slot]
    if (cur >= a.tier) continue                        // déjà cette pièce (ou mieux)
    if (a.tier > 1 && cur !== a.tier - 1) continue     // chaîne : il faut la pièce du tier précédent
    // blueprint : tous les Ore requis présents sur la Forge ?
    const need = Object.entries(a.blueprint.ore)
    if (!need.every(([oreId, n]) => self.forge.filter(x => x === oreId).length >= n)) continue
    for (const [oreId, n] of need) {
      for (let k = 0; k < n; k++) {
        self.forge.splice(self.forge.indexOf(oreId), 1)
        self.deck.push(oreId) // dessous du deck (règle vérifiée)
      }
    }
    self.armor[a.slot] = a.tier
    return { armorId: a.id, slot: a.slot, tier: a.tier }
  }
  return null
}

// Effets d'armure quand le porteur est Attaqué (leaflet ARMOR, vérifié) :
// casque = contre-dégâts 1/2/3 (dégâts NORMAUX seulement) ; bouclier = prévient 1/2 (normaux) ;
// bouclier Ultimanium (tier 3) = prévient 2 contre TOUT sauf Ultimate/collatéral.
// doubling : Masterwork (Forge = double UNE armure, Anvil = double jusqu'à 2 différentes).
export type AttackDamageKind = 'normal' | 'undefendable' | 'ultimate'
const HELMET_COUNTER = [0, 1, 2, 3]
const SHIELD_PREVENT = [0, 1, 2, 2]
export function armorEffects(
  self: PlayerState, kind: AttackDamageKind,
  doubling: { helmet?: boolean; shield?: boolean } = {},
): { prevented: number; counter: number } {
  if (kind === 'ultimate') return { prevented: 0, counter: 0 }
  let prevented = 0, counter = 0
  if (kind === 'normal' && self.armor.helmet > 0) {
    counter = HELMET_COUNTER[self.armor.helmet] * (doubling.helmet ? 2 : 1)
  }
  if (self.armor.shield > 0 && (kind === 'normal' || self.armor.shield >= 3)) {
    prevented = SHIELD_PREVENT[self.armor.shield] * (doubling.shield ? 2 : 1)
  }
  return { prevented, counter }
}

// Défense Masterwork : 1 dé. Pick (1-3) = Mine ; Forge (4-5) = double UNE armure (v1 : le
// bouclier s'il existe, sinon le casque) ; Anvil (6) = double jusqu'à 2 armures différentes.
export function rollMasterworkDie(rng: RNG): number {
  return rollDie(rng)
}
export function masterworkOutcome(face: number, self: PlayerState): { mines: boolean; doubling: { helmet?: boolean; shield?: boolean } } {
  if (face <= 3) return { mines: true, doubling: {} }
  if (face <= 5) {
    if (self.armor.shield > 0) return { mines: false, doubling: { shield: true } }
    return { mines: false, doubling: { helmet: self.armor.helmet > 0 } }
  }
  return { mines: false, doubling: { helmet: self.armor.helmet > 0, shield: self.armor.shield > 0 } }
}
