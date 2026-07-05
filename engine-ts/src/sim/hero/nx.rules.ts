// Naraxus the Devourer — boss coopératif (planche vérifiée, scan user 2026-07-05).
// PAS un héros jouable : 0 cartes, CP infini, 1 dé / 1 tentative, 6 attaques indexées par la
// face. Hard mode : lance 2 dés, prend le plus haut (une seule attaque).
import type { PlayerState, Tokens } from '../types.js'
import { emptyBag } from '../tokens.js'

// PV de départ selon le nombre de héros (1/2/3/4) — 1v1 dans ce moteur : 65.
export const NX_HP_BY_HEROES = [65, 65, 70, 75]
export const NX_HEAL_CAP = 65 // soin Swoop cappé au max de départ (solo)

export function createInitialNXTokens(): Tokens {
  return emptyBag()
}

export const NX_ABILITIES: Record<number, string> = {
  1: 'Swoop', 2: 'Ember Spark', 3: 'Gashing Bite',
  4: 'Hoarding', 5: 'Thundering Roar', 6: "Dragon's Might",
}

// Pour l'UI/l'info d'attaque : dégâts de base + défendabilité par face.
export function nxAttackInfo(face: number): { name: string; dmg: number; defendable: boolean } {
  switch (face) {
    case 1: return { name: 'Swoop', dmg: 3, defendable: false }
    case 2: return { name: 'Ember Spark', dmg: 8, defendable: true }
    case 3: return { name: 'Gashing Bite', dmg: 0, defendable: true } // 4 dés, somme des 2 plus hauts
    case 4: return { name: 'Hoarding', dmg: 9, defendable: true }
    case 5: return { name: 'Thundering Roar', dmg: 8, defendable: false }
    default: return { name: "Dragon's Might", dmg: 10, defendable: true }
  }
}

// Swoop : retire 1 jeton de statut ALÉATOIRE de Naraxus (bag ou Time Bomb).
export function removeRandomStatus(self: PlayerState, rand: () => number): string | null {
  const pool: string[] = []
  for (const [k, v] of Object.entries(self.tokens)) if (v > 0 && k !== 'head') pool.push(k)
  for (let i = 0; i < self.timeBombs.length; i++) pool.push('timeBomb')
  if (!pool.length) return null
  const pick = pool[Math.floor(rand() * pool.length)]
  if (pick === 'timeBomb') self.timeBombs.pop()
  else (self.tokens as any)[pick] -= 1
  return pick
}

// Dragon Scales (défense, contre tout dégât défendable) : 1 dé -> prévient 1 / 3 / 5.
export function dragonScalesPrevent(face: number): number {
  if (face === 1) return 1
  if (face <= 5) return 3
  return 5
}
