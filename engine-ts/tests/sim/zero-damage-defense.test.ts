// Une habileté à 0 dégât (Infiltrate : pure utilité) n'est pas une Attaque à défendre —
// le défenseur ne roule PAS sa défense (user-caught : HH roulait Hallowed Reckoning contre
// Infiltrate et farmait contre-dégâts + Dreadful gratuits).
import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../src/sim/match.js'
import { resolveAbilityPhase } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import type { Policy } from '../../src/sim/policy.js'

describe('zero-damage abilities skip the defense roll', () => {
  it('BW Infiltrate: no defense window, no counter-damage, Time Bomb still lands', () => {
    const rng = mulberry32(7)
    const state = createInitialGameState('bw', 'hh', rng)
    const bwIdx = 0
    const hh = state.players[1]
    hh.tokens.dreadful = 3 // une défense roulerait 4 dés — l'exploit serait visible
    const hpBefore = { bw: state.players[0].hp, hh: hh.hp }
    const dreadfulBefore = hh.tokens.dreadful

    const forceInfiltrate: Policy = { ...greedyHighestDamagePolicy, chooseAbility: () => 'Infiltrate' }
    // 1,2 = Espionage (A), 3 = Batons (B), 6 = Widow (C) -> AABC + un 5e dé quelconque
    resolveAbilityPhase(state, bwIdx, [1, 2, 3, 6, 3], rng, [forceInfiltrate, greedyHighestDamagePolicy])

    const logText = state.log.map(l => l.message).join('\n')
    expect(logText).toContain('no defense roll')
    expect(logText).not.toMatch(/Hallowed Reckoning|Defense dice/)
    // pas de contre-dégâts encaissés par BW, pas de Dreadful farmé par HH
    expect(state.players[0].hp).toBe(hpBefore.bw)
    expect(hh.tokens.dreadful).toBe(dreadfulBefore)
    // l'utilité d'Infiltrate est bien passée : TB posée + Agility gagnée
    expect(hh.timeBombs.length).toBe(1)
    expect(state.players[0].tokens.agility).toBe(1)
    // et HH n'a pris aucun dégât (0 dmg)
    expect(hh.hp).toBe(hpBefore.hh)
  })
})
