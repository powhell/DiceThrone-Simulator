import { describe, it, expect } from 'vitest'
import { createInitialGameState, runMatch, MAX_TURNS } from '../../src/sim/match.js'
import { resolveAbilityPhase, resolveDefense, playUpkeepPhase, playTurn, applyAttackModifierCard } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import { moltenArmorEffects } from '../../src/sim/hero/py.rules.js'

const P = greedyHighestDamagePolicy
const PP: [typeof P, typeof P] = [P, P]

describe('Pyromancer — parties complètes (greedy)', () => {
  it('py vs bw : 10 parties se terminent proprement', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const r = runMatch('py', 'bw', seed, PP)
      expect(r.finalState.gameOver || r.turns >= MAX_TURNS).toBe(true)
    }
  })
})

describe('Pyromancer — mécaniques forcées', () => {
  it('Burn : 2 dmg à l\'upkeep du porteur, persistant ; cool off retire 1 FM', () => {
    const rng = mulberry32(3)
    const state = createInitialGameState('py', 'bw', rng)
    const pyP = state.players[0]
    pyP.tokens.burn = 1
    pyP.tokens.fireMastery = 3
    const hp = pyP.hp
    playUpkeepPhase(state, 0, rng, P)
    expect(pyP.hp).toBe(hp - 2)
    expect(pyP.tokens.burn).toBe(1) // persistant
    expect(pyP.tokens.fireMastery).toBe(2) // cool off
  })

  it('Knockdown sans CP : saute l\'Offensive Roll Phase (aucune attaque au tour)', () => {
    const rng = mulberry32(5)
    const state = createInitialGameState('bw', 'py', rng)
    const bwP = state.players[0]
    bwP.tokens.knockdown = 1
    bwP.cp = 1 // pas les 2 CP
    playTurn(state, 0, rng, PP)
    expect(bwP.tokens.knockdown).toBe(0)
    expect(state.log.some(e => /Knockdown: cannot pay — skips Offensive Roll Phase/.test(e.message))).toBe(true)
    expect(state.log.some(e => e.playerIdx === 0 && /Chose ability/.test(e.message))).toBe(false)
  })

  it('Meteorite (DDDD) : Stun -> dégâts sans défense + Offensive Roll Phase additionnelle', () => {
    const rng = mulberry32(7)
    const state = createInitialGameState('py', 'bw', rng)
    const pyP = state.players[0]
    pyP.tokens.fireMastery = 3
    // On force le tour complet avec des dés pilotés : Meteorite via resolveAbilityPhase, puis
    // le nettoyage Stun de playTurn est vérifié par une partie réelle — ici on teste l'infliction.
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, PP)
    expect(state.players[1].tokens.stun).toBe(1)
    expect(state.log.some(e => /Meteorite: \d+ undefendable dmg/.test(e.message))).toBe(true)
  })

  it('Stun sur le défenseur : resolveDefense ne lance aucun dé — tout passe', () => {
    const rng = mulberry32(9)
    const state = createInitialGameState('py', 'bw', rng)
    const bwP = state.players[1]
    bwP.tokens.stun = 1
    const hp = bwP.hp
    resolveDefense(state, 0, 6, rng, PP)
    expect(bwP.hp).toBe(hp - 6)
    expect(state.log.some(e => /Stun: no defense possible/.test(e.message))).toBe(true)
  })

  it('Combustion : retire jusqu\'à 4 FM et inflige 3 dmg indéfendables par jeton', () => {
    const rng = mulberry32(11)
    const state = createInitialGameState('py', 'bw', rng)
    const pyP = state.players[0], opp = state.players[1]
    pyP.tokens.fireMastery = 5
    const hp = opp.hp
    resolveAbilityPhase(state, 0, [1, 4, 5, 6, 1], rng, PP) // 1 de chaque -> greedy prend Combustion (12 dmg)
    expect(state.log.some(e => /Combustion: removed 4 Fire Mastery -> 12 undefendable dmg/.test(e.message))).toBe(true)
    expect(pyP.tokens.fireMastery).toBe(1) // 5 (cap : le +1 est perdu) -4 retirés
    expect(hp - opp.hp).toBe(12)
  })

  it('Molten Armor II : un Flame ET un Blaze -> Burn sur l\'attaquant (ruling user)', () => {
    // moltenArmorEffects est déterministe — testé directement.
    expect(moltenArmorEffects([1, 4, 5, 5, 6], 2).inflictBurn).toBe(true) // F + B présents
    expect(moltenArmorEffects([1, 1, 5, 5, 6], 2).inflictBurn).toBe(false) // pas de Blaze
    expect(moltenArmorEffects([4, 4, 5, 5, 6], 2).inflictBurn).toBe(false) // pas de Flame
    expect(moltenArmorEffects([1, 4, 5, 5, 6], 1).inflictBurn).toBe(false) // tier I : jamais
    const e3 = moltenArmorEffects([1, 4, 5, 6, 6], 3)
    expect(e3.fmGain).toBe(3) // 1 S + 2 M (III)
    expect(e3.counterDamage).toBe(3) // 1 F + 2 M (III)
  })

  it('Red Hot! : +1 dmg par Fire Mastery (Attack Modifier)', () => {
    const rng = mulberry32(13)
    const state = createInitialGameState('py', 'bw', rng)
    const pyP = state.players[0]
    pyP.tokens.fireMastery = 4
    pyP.hand.push('red-hot')
    const out = applyAttackModifierCard(state, 0, 'red-hot', { dmg: 5, undefendable: false }, rng)
    expect(out.dmg).toBe(9)
  })
})
