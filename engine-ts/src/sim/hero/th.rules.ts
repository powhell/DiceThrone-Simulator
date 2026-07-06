// Thor — mécaniques propres (SPEC.md vérifiée + rulings user 2026-07-06).
// Mjölnir : compagnon qui navette. Throw = 1 dmg isolé indéfendable + part chez l'adversaire.
// Retrieve = revient + 1 Electrokinesis. Défausser 1 carte pour le faire à tout moment.
import type { PlayerState, Tokens } from '../types.js'
import type { RNG } from '../rng.js'
import { emptyBag } from '../tokens.js'

export const EK_CAP = 4
export const GB_CAP = 2

export function createInitialTHTokens(): Tokens {
  return emptyBag() // Mjölnir de départ est sur PlayerState.mjolnirAway (false = home)
}

export function mjolnirHome(p: PlayerState): boolean {
  return p.mjolnirAway !== true
}

export function gainEk(p: PlayerState, n: number): number {
  const before = p.tokens.electrokinesis ?? 0
  p.tokens.electrokinesis = Math.min(EK_CAP, before + n)
  return p.tokens.electrokinesis - before
}

export function gainGb(p: PlayerState, n: number): number {
  const before = p.tokens.guardBreak ?? 0
  p.tokens.guardBreak = Math.min(GB_CAP, before + n)
  return p.tokens.guardBreak - before
}

// Une navette : si le marteau est home -> Throw (1 dmg isolé chez l'adversaire, retour: dmg),
// sinon -> Retrieve (+1 EK). Retourne ce qui s'est passé pour le log/les dégâts.
export function shuttleOnce(self: PlayerState): { action: 'throw' | 'retrieve'; damage: number; ekGained: number } {
  if (mjolnirHome(self)) {
    self.mjolnirAway = true
    self.thrownThisTurn = (self.thrownThisTurn ?? 0) + 1
    return { action: 'throw', damage: 1, ekGained: 0 }
  }
  self.mjolnirAway = false
  return { action: 'retrieve', damage: 0, ekGained: gainEk(self, 1) }
}

// « Throw or Retrieve up to N times » : chaque pas donne 1 dmg ou 1 EK — toujours rentable,
// on fait les N pas. Retourne les dégâts isolés cumulés (indéfendables) et l'EK gagné.
export function shuttle(self: PlayerState, times: number): { damage: number; ekGained: number; throws: number; retrieves: number } {
  let damage = 0, ekGained = 0, throws = 0, retrieves = 0
  for (let i = 0; i < times; i++) {
    const r = shuttleOnce(self)
    damage += r.damage
    ekGained += r.ekGained
    if (r.action === 'throw') throws += 1
    else retrieves += 1
  }
  return { damage, ekGained, throws, retrieves }
}

// Guard Break : à la conclusion d'une attaque défendable, dépenser des jetons un par un —
// d6 4-5 => indéfendable (ruling user : dépense libre, on s'arrête au succès).
export function tryGuardBreak(self: PlayerState, rng: RNG, maxTokens?: number): { spent: number; rolls: number[]; success: boolean } {
  const avail = Math.min(self.tokens.guardBreak ?? 0, maxTokens ?? GB_CAP)
  const rolls: number[] = []
  let spent = 0
  for (let i = 0; i < avail; i++) {
    spent += 1
    self.tokens.guardBreak = (self.tokens.guardBreak ?? 0) - 1
    const d = Math.floor(rng() * 6) + 1
    rolls.push(d)
    if (d === 4 || d === 5) return { spent, rolls, success: true }
  }
  return { spent, rolls, success: false }
}

// Chain Lightning : lance N d6, dégâts = somme des 2 meilleurs.
export function chainLightningRoll(rng: RNG, diceCount: number): { dice: number[]; total: number } {
  const dice: number[] = []
  for (let i = 0; i < diceCount; i++) dice.push(Math.floor(rng() * 6) + 1)
  const sorted = [...dice].sort((a, b) => b - a)
  return { dice, total: sorted[0] + sorted[1] }
}

// Odinforce : lance 5 d6 -> {>=2 marteaux : 1 navette}, {>=2 dignes : +1 CP}, {+1 EK par tonnerre}.
// (« On XX » déclenche UNE fois — ruling user.) Le II permet UNE relance complète optionnelle.
export function odinforceRoll(rng: RNG): { dice: number[]; hammers: number; worthies: number; thunders: number } {
  const dice: number[] = []
  for (let i = 0; i < 5; i++) dice.push(Math.floor(rng() * 6) + 1)
  return {
    dice,
    hammers: dice.filter(d => d <= 3).length,
    worthies: dice.filter(d => d === 4 || d === 5).length,
    thunders: dice.filter(d => d === 6).length,
  }
}

// Thunder Wheel (défense) : 3 dés (4 en II). >=2 marteaux -> 1 navette (II : 1 PAR paire).
// Prévient 2 x dignes. +1 EK par tonnerre.
export function thunderWheelEffects(dice: number[], upgraded: boolean): { shuttles: number; prevented: number; ekGain: number } {
  const h = dice.filter(d => d <= 3).length
  const w = dice.filter(d => d === 4 || d === 5).length
  const t = dice.filter(d => d === 6).length
  return {
    shuttles: upgraded ? Math.floor(h / 2) : (h >= 2 ? 1 : 0),
    prevented: 2 * w,
    ekGain: t,
  }
}
