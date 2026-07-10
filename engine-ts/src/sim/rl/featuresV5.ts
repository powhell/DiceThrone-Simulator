// v5 (Phase 4 du PLAN_STRONG_AI) — layout STABLE : ajouter un héros ne redimensionne plus le
// vecteur d'entrée. Le v4 (features.ts) dérivait ses largeurs des kits présents (identité
// one-hot = nombre de héros, upgrades = max des kits, main = plus gros deck, jetons nommés à la
// main) → chaque nouveau héros invalidait TOUS les poids. Ici, chaque bloc a un CAP FIGÉ avec
// réserve, et les identités (héros, jetons) passent par des REGISTRES append-only : un nouveau
// héros consomme des slots libres, le layout ne bouge pas. Re-trainer ne redevient nécessaire
// que si un cap déborde (les marges sont testées : tests/sim/featuresV5.test.ts).
//
// Ce module est L'ENTRÉE DU RÉSEAU Phase 4-5 (2 têtes, entraîné côté rl-py). features.ts (v4)
// reste tel quel pour le réseau valeur actuellement déployé — les deux coexistent le temps de
// la transition.
import type { GameState, PlayerState, HeroId } from '../types.js'
import { STARTING_HP, HEAL_CAP_ABOVE_STARTING, CP_CAP, MAX_HAND_SIZE } from '../data/config.js'
import { heroTemplateFor } from '../data/load.js'
import { buildFullDeck, MAX_TURNS } from '../match.js'

const MAX_HP = STARTING_HP + HEAL_CAP_ABOVE_STARTING
const MAX_UPGRADES_IN_PLAY = 8
const MAX_UPGRADES_PLAYED_PER_TURN = 4

// ---- Caps figés (la réserve est la garantie de stabilité — testée) -------------------------
export const HERO_SLOTS = 16    // identité one-hot ; 10 utilisés
export const UPGRADE_SLOTS = 12 // plus gros kit actuel : 10 (py)
export const HAND_SLOTS = 48    // plus gros deck actuel : 33 (fm, copies incluses)
export const TOKEN_SLOTS = 32   // 24 jetons enregistrés
const SPARE_SCALARS = 4         // mécaniques futures hors-jeton (piste, cadran…) sans resize

// ---- Registres append-only (l'ORDRE est le contrat : ne jamais réordonner, seulement APPEND) -
const HERO_REGISTRY: HeroId[] = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se']

// jeton -> [slot implicite = ordre, cap de normalisation]
const TOKEN_REGISTRY: Array<[string, number]> = [
  ['dreadful', 6], ['grimPursuit', 3], ['head', 1], ['agility', 4], ['covertOps', 4],
  ['feather', 5], ['hex', 1], ['nevermore', 1], ['shapeShift', 2], ['regen2', 2],
  ['regen1', 2], ['wound', 2], ['electrokinesis', 4], ['guardBreak', 2], ['combo', 1],
  ['webbed', 1], ['invisibility', 1], ['fireMastery', 7], ['burn', 1], ['knockdown', 1],
  ['stun', 1], ['disarm', 1], ['chargedGem', 1], ['sunMarked', 1],
]

interface HeroEncoding {
  upgradeIds: string[]
  deckIndex: Map<string, number>
  deckSize: number
}
const encCache = new Map<HeroId, HeroEncoding>()
function encodingFor(heroId: HeroId): HeroEncoding {
  let e = encCache.get(heroId)
  if (!e) {
    const hero = heroTemplateFor(heroId)
    const deck = buildFullDeck(heroId)
    e = {
      upgradeIds: hero.cards.filter(c => c.kind === 'upgrade').map(c => c.id),
      deckIndex: new Map(deck.map((id, i) => [id, i])),
      deckSize: deck.length,
    }
    encCache.set(heroId, e)
  }
  return e
}

// ---- Marges (exposées pour le test de stabilité) --------------------------------------------
export function heroSlotsUsed(): number { return HERO_REGISTRY.length }
export function maxUpgradesUsed(): number {
  return Math.max(...HERO_REGISTRY.map(h => encodingFor(h).upgradeIds.length))
}
export function maxDeckUsed(): number {
  return Math.max(...HERO_REGISTRY.map(h => encodingFor(h).deckSize))
}
export function tokenSlotsUsed(): number { return TOKEN_REGISTRY.length }

// ---- Encodage --------------------------------------------------------------------------------
function encodePlayerV5(p: PlayerState): number[] {
  const enc = encodingFor(p.heroId === 'nx' ? 'hh' : p.heroId) // nx jamais dans le pool réseau
  const out: number[] = [
    p.hp / MAX_HP,
    p.cp / CP_CAP,
    p.hand.length / MAX_HAND_SIZE,
    p.deck.length / enc.deckSize,
    p.discard.length / enc.deckSize,
    p.upgradesInPlay.length / MAX_UPGRADES_IN_PLAY,
    p.timeBombs.length / 3,
    p.upgradesPlayedThisTurn / MAX_UPGRADES_PLAYED_PER_TURN,
  ]
  // identité : one-hot dans un registre à réserve
  const heroSlot = HERO_REGISTRY.indexOf(p.heroId)
  for (let i = 0; i < HERO_SLOTS; i++) out.push(i === heroSlot ? 1 : 0)
  // état bespoke figé (forge/armures fm, cadrans, formes…) — liste GELÉE + réserve
  out.push(
    p.forge.filter(id => id === 'gold-ore').length / 9,
    p.forge.filter(id => id === 'diamond-ore').length / 6,
    p.forge.filter(id => id === 'ultimanium-ore').length,
    p.armor.helmet / 3,
    p.armor.shield / 3,
    (p.fmCapBonus ?? 0) / 2,
    (p.nevermoreDial ?? 0) / 3,
    p.form === 'druid' ? 1 : 0,
    p.form === 'cat' ? 1 : 0,
    p.form === 'bear' ? 1 : 0,
    p.mjolnirAway === true ? 1 : 0,
    (p.footwork ?? 0) / 2,
    p.footworkBonusUsedThisTurn === true ? 1 : 0,
    (p.sunDial ?? 0) / 5,
    p.sunDialDawn === true ? 1 : 0,
  )
  for (let i = 0; i < SPARE_SCALARS; i++) out.push(0)
  // jetons : slots du registre, normalisés à leur cap
  const bag = p.tokens as unknown as Record<string, number | undefined>
  for (let i = 0; i < TOKEN_SLOTS; i++) {
    if (i < TOKEN_REGISTRY.length) {
      const [key, cap] = TOKEN_REGISTRY[i]
      out.push((bag[key] ?? 0) / cap)
    } else out.push(0)
  }
  // upgrades en jeu : one-hot du kit, padded
  const upg = new Array<number>(UPGRADE_SLOTS).fill(0)
  for (const id of p.upgradesInPlay) {
    const idx = enc.upgradeIds.indexOf(id)
    if (idx >= 0 && idx < UPGRADE_SLOTS) upg[idx] = 1
  }
  out.push(...upg)
  return out
}

function encodeHandV5(p: PlayerState): number[] {
  const enc = encodingFor(p.heroId === 'nx' ? 'hh' : p.heroId)
  const out = new Array<number>(HAND_SLOTS).fill(0)
  for (const id of p.hand) {
    const idx = enc.deckIndex.get(id)
    if (idx !== undefined && idx < HAND_SLOTS) out[idx] = 1
  }
  return out
}

export function encodeStateV5(state: GameState, forPlayerIdx: 0 | 1): number[] {
  const self = state.players[forPlayerIdx]
  const opp = state.players[(1 - forPlayerIdx) as 0 | 1]
  return [
    state.turnNumber / MAX_TURNS,
    ...encodePlayerV5(self),
    ...encodeHandV5(self),
    ...encodePlayerV5(opp),
  ]
}

// 8 scalaires + HERO_SLOTS + 15 bespoke + SPARE_SCALARS + TOKEN_SLOTS + UPGRADE_SLOTS
export const PLAYER_BLOCK_SIZE_V5 = 8 + HERO_SLOTS + 15 + SPARE_SCALARS + TOKEN_SLOTS + UPGRADE_SLOTS
export const FEATURE_COUNT_V5 = 1 + (PLAYER_BLOCK_SIZE_V5 + HAND_SLOTS) + PLAYER_BLOCK_SIZE_V5
