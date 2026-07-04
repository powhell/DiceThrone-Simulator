import { describe, it, expect } from 'vitest'
import {
  createInitialBWTokens, inflictTimeBomb, tickTimeBombsUpkeep, resolveSabotage,
  spendAgilityToHalveDamage, resolveVengeanceRider, grantAgility, advanceAllTimeBombs,
  resolveRecoil,
  TIME_BOMB_STACK_CAP, TIME_BOMB_DETONATE_DAMAGE,
} from '../../src/sim/hero/bw.rules.js'
import { createInitialPlayer, createInitialGameState } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { RNG } from '../../src/sim/rng.js'

// rollDie() = floor(rng() * 6) + 1 — pick a value strictly inside each face's bucket.
function faceValue(face: number): number {
  return (face - 0.5) / 6
}

function seqRng(faces: number[]): RNG {
  let i = 0
  return () => faceValue(faces[i++ % faces.length])
}

describe('BW Time Bomb', () => {
  it('caps the stack at 2 and ignores overflow', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    inflictTimeBomb(p, 0, 5)
    expect(p.timeBombs.length).toBe(TIME_BOMB_STACK_CAP)
  })

  it('places on 0:01 when inflictor has >=6 upgrades, else 0:02', () => {
    const p1 = createInitialPlayer('bw')
    p1.tokens = createInitialBWTokens()
    inflictTimeBomb(p1, 6, 1)
    expect(p1.timeBombs).toEqual(['0:01'])

    const p2 = createInitialPlayer('bw')
    p2.tokens = createInitialBWTokens()
    inflictTimeBomb(p2, 2, 1)
    expect(p2.timeBombs).toEqual(['0:02'])
  })

  it('upkeep: 0:02 advances to 0:01 on a non-6 roll, no damage', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    inflictTimeBomb(p, 0, 1) // 0:02
    const r = tickTimeBombsUpkeep(p, seqRng([3]))
    expect(p.timeBombs).toEqual(['0:01'])
    expect(r.selfDamage).toBe(0)
  })

  it('upkeep: 0:01 detonates for 4 dmg on a non-6 roll and is removed', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    p.timeBombs = ['0:01']
    const hpBefore = p.hp
    const r = tickTimeBombsUpkeep(p, seqRng([2]))
    expect(r.selfDamage).toBe(TIME_BOMB_DETONATE_DAMAGE)
    expect(p.hp).toBe(hpBefore - TIME_BOMB_DETONATE_DAMAGE)
    expect(p.timeBombs).toEqual([])
  })

  it('upkeep: a roll of 6 defuses regardless of position', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    p.timeBombs = ['0:01']
    const r = tickTimeBombsUpkeep(p, seqRng([6]))
    expect(r.defused).toBe(1)
    expect(r.selfDamage).toBe(0)
    expect(p.timeBombs).toEqual([])
  })
})

describe('BW Sabotage defense', () => {
  it('counts A=prevent, B=counter-dmg, C<2=no TB', () => {
    const defender = createInitialPlayer('bw')
    const state = createInitialGameState('hh', 'bw')
    state.players[1] = defender
    const r = resolveSabotage(defender, 0, seqRng([1, 3, 6]), greedyHighestDamagePolicy, state, 1)
    expect(r.damagePrevented).toBe(1) // face 1 = A (Espionage)
    expect(r.damageToAttacker).toBe(1) // face 3 = B (Batons)
    expect(r.tbInflictedOnAttacker).toBe(0) // only one C (face 6)
  })

  it('inflicts a Time Bomb on "CC" (>=2 sixes)', () => {
    const defender = createInitialPlayer('bw')
    const state = createInitialGameState('hh', 'bw')
    state.players[1] = defender
    const r = resolveSabotage(defender, 0, seqRng([6, 6, 3]), greedyHighestDamagePolicy, state, 1)
    expect(r.tbInflictedOnAttacker).toBe(1)
  })

  it('Sabotage II rolls 4 dice instead of 3', () => {
    const defender = createInitialPlayer('bw')
    const state = createInitialGameState('hh', 'bw')
    state.players[1] = defender
    // 4 faces consumed (1,1,1,1 => all A/Espionage) confirms a 4th die was rolled: prevented=4.
    const r = resolveSabotage(defender, 0, seqRng([1, 1, 1, 1]), greedyHighestDamagePolicy, state, 1, true)
    expect(r.damagePrevented).toBe(4)
  })
})

describe('BW Agility (leaflet: spend & roll 1-3 to avoid 1/2 dmg, verified)', () => {
  it('halves damage (rounded up) on a roll of 1-3', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    grantAgility(p, 1)
    const r = spendAgilityToHalveDamage(p, 5, seqRng([2]))
    expect(r.succeeded).toBe(true)
    expect(r.remainingDamage).toBe(2) // 5 - ceil(5/2) = 2
    expect((p.tokens as any).agility).toBe(0)
  })

  it('has no effect on a roll of 4-6, but still spends the token', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    grantAgility(p, 1)
    const r = spendAgilityToHalveDamage(p, 5, seqRng([5]))
    expect(r.succeeded).toBe(false)
    expect(r.remainingDamage).toBe(5)
    expect((p.tokens as any).agility).toBe(0)
  })

  it('does nothing if no Agility is available', () => {
    const p = createInitialPlayer('bw')
    p.tokens = createInitialBWTokens()
    const r = spendAgilityToHalveDamage(p, 5, seqRng([1]))
    expect(r.succeeded).toBe(false)
    expect(r.remainingDamage).toBe(5)
  })
})

describe("BW Recoil! card (verified: roll 2 dice, On Espionage +1 CP, On Widow prevent half)", () => {
  it('grants CP and halves dmg when both an Espionage and a Widow are rolled', () => {
    const r = resolveRecoil(5, seqRng([1, 6])) // 1=Espionage(A), 6=Widow(C)
    expect(r.cpGained).toBe(1)
    expect(r.damagePrevented).toBe(3) // ceil(5/2)
  })

  it('only grants CP when Espionage is rolled without a Widow', () => {
    const r = resolveRecoil(5, seqRng([1, 3])) // 1=Espionage(A), 3=Baton(B)
    expect(r.cpGained).toBe(1)
    expect(r.damagePrevented).toBe(0)
  })

  it('only prevents dmg when a Widow is rolled without Espionage', () => {
    const r = resolveRecoil(5, seqRng([4, 6])) // 4=Baton(B), 6=Widow(C)
    expect(r.cpGained).toBe(0)
    expect(r.damagePrevented).toBe(3)
  })

  it('does not double-count when both dice show the same triggering symbol', () => {
    const r = resolveRecoil(5, seqRng([6, 6])) // both Widow(C) — boolean trigger, not scaled
    expect(r.cpGained).toBe(0)
    expect(r.damagePrevented).toBe(3)
  })

  it('has no effect when neither die shows Espionage or Widow', () => {
    const r = resolveRecoil(5, seqRng([3, 4])) // both Baton(B)
    expect(r.cpGained).toBe(0)
    expect(r.damagePrevented).toBe(0)
  })
})

describe('BW Vengeance rider (verified: symbol-based, not face===1)', () => {
  it('Batons rolled deal +1 dmg each, Espionage inflicts TB (not dmg)', () => {
    const self = createInitialPlayer('bw')
    const opp = createInitialPlayer('bw')
    // faces: 1(A/Espionage), 3(B/Batons), 4(B/Batons), 2(A/Espionage)
    const r = resolveVengeanceRider(self, opp, seqRng([1, 3, 4, 2]), 4)
    expect(r.bonusDamage).toBe(2) // two Batons
    expect(r.tbInflictedOnOpponent).toBe(1) // at least one Espionage present, boolean trigger
    expect(opp.timeBombs.length).toBe(1)
  })

  it('gains 1 Covert Ops on a Widow-pair (>=2 sixes)', () => {
    const self = createInitialPlayer('bw')
    self.tokens = createInitialBWTokens()
    ;(self.tokens as any).covertOps = 0
    const opp = createInitialPlayer('bw')
    const r = resolveVengeanceRider(self, opp, seqRng([6, 6, 3, 1]), 4)
    expect(r.covertOpsGained).toBe(1)
    expect((self.tokens as any).covertOps).toBe(1)
  })

  it('rolls 5 dice when diceCount=5 (Vengeance II)', () => {
    const self = createInitialPlayer('bw')
    const opp = createInitialPlayer('bw')
    const r = resolveVengeanceRider(self, opp, seqRng([3, 3, 3, 3, 3]), 5)
    expect(r.bonusDamage).toBe(5)
  })
})

describe('BW advanceAllTimeBombs (Infiltrate: unconditional, no die roll)', () => {
  it('flips 0:02 to 0:01 without dealing damage', () => {
    const p = createInitialPlayer('bw')
    p.timeBombs = ['0:02']
    const hpBefore = p.hp
    const n = advanceAllTimeBombs(p)
    expect(n).toBe(0)
    expect(p.timeBombs).toEqual(['0:01'])
    expect(p.hp).toBe(hpBefore)
  })

  it('detonates a 0:01 for 4 dmg and removes it', () => {
    const p = createInitialPlayer('bw')
    p.timeBombs = ['0:01']
    const hpBefore = p.hp
    const n = advanceAllTimeBombs(p)
    expect(n).toBe(1)
    expect(p.timeBombs).toEqual([])
    expect(p.hp).toBe(hpBefore - TIME_BOMB_DETONATE_DAMAGE)
  })

  it('advances every stacked Time Bomb independently, unlike the roll-based Upkeep tick', () => {
    const p = createInitialPlayer('bw')
    p.timeBombs = ['0:02', '0:01']
    const n = advanceAllTimeBombs(p)
    expect(n).toBe(1) // only the 0:01 one detonates
    expect(p.timeBombs).toEqual(['0:01']) // the 0:02 one survived, advanced
  })
})
