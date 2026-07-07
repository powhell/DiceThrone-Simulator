import { describe, it, expect } from 'vitest'
import { createInitialGameState, runMatch, MAX_TURNS } from '../../src/sim/match.js'
import { resolveAbilityPhase, resolveDefense, applyAttackModifierCard } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'

const P = greedyHighestDamagePolicy
const PP: [typeof P, typeof P] = [P, P]

describe('Spider-Man — parties complètes (greedy)', () => {
  it('sm vs bw : 10 parties se terminent proprement, Combo dépensé au moins une fois', () => {
    let comboSeen = 0
    for (let seed = 1; seed <= 10; seed++) {
      const r = runMatch('sm', 'bw', seed, PP)
      expect(r.finalState.gameOver || r.turns >= MAX_TURNS).toBe(true)
      if (r.finalState.log.some(e => /Combo spent: additional Offensive Roll Phase/.test(e.message))) comboSeen++
    }
    expect(comboSeen).toBeGreaterThan(0)
  })
})

describe('Spider-Man — mécaniques forcées', () => {
  it('Webbed : la prochaine attaque normale subie devient indéfendable, jeton retiré', () => {
    const rng = mulberry32(3)
    const state = createInitialGameState('bw', 'sm', rng)
    const bwP = state.players[0], smP = state.players[1]
    // sm a infligé Webbed à bw : la prochaine attaque NORMALE de sm contre bw passe sans défense
    bwP.tokens.webbed = 1
    const hpBefore = bwP.hp
    resolveDefense(state, 1, 6, rng, PP) // attaque défendable de 6 du sm (idx 1) contre bw (idx 0)
    expect(bwP.tokens.webbed).toBe(0)
    expect(bwP.hp).toBe(hpBefore - 6) // aucune prévention : pas de jet de défense
    expect(state.log.some(e => /Webbed: incoming attack becomes UNDEFENDABLE/.test(e.message))).toBe(true)
    void smP
  })

  it('Invisibility : défend contre une attaque indéfendable (Grapple bw CCCC)', () => {
    const rng = mulberry32(5)
    const state = createInitialGameState('bw', 'sm', rng)
    const smP = state.players[1]
    smP.tokens.invisibility = 1
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, PP) // Grapple : 6 indéfendables
    expect(state.log.some(e => /Invisibility spent: defending/.test(e.message))).toBe(true)
    expect(smP.tokens.invisibility).toBe(0)
    // une défense a bien été jouée (Spider-Sense ou Counterpunch loggée)
    expect(state.log.some(e => /Defensive Ability: (Spider-Sense|Counterpunch)/.test(e.message))).toBe(true)
  })

  it('Ensnare (petite suite) : dégâts puis Webbed infligé (2 dmg isolés)', () => {
    const rng = mulberry32(7)
    const state = createInitialGameState('sm', 'bw', rng)
    const opp = state.players[1]
    const hpBefore = opp.hp
    resolveAbilityPhase(state, 0, [1, 2, 3, 4, 4], rng, PP) // 3 Thwip seulement : Ensnare (5) bat Punch 3A (4)
    expect(state.log.some(e => /Chose ability: Ensnare/.test(e.message))).toBe(true)
    expect(opp.tokens.webbed).toBe(1)
    expect(state.log.some(e => /Ensnare: Webbed inflicted/.test(e.message))).toBe(true)
    expect(hpBefore - opp.hp).toBeGreaterThanOrEqual(2) // au minimum les 2 iso du jeton
  })

  it("Ambush! : défausse Invisibility -> +3 dégâts (Attack Modifier)", () => {
    const rng = mulberry32(9)
    const state = createInitialGameState('sm', 'bw', rng)
    const smP = state.players[0]
    smP.tokens.invisibility = 1
    smP.hand.push('ambush')
    const out = applyAttackModifierCard(state, 0, 'ambush', { dmg: 5, undefendable: false }, rng)
    expect(out.dmg).toBe(8)
    expect(smP.tokens.invisibility).toBe(0)
  })

  it('Venom Shockwave (ULT) : Invisibility + Webbed + 13 indéfendables', () => {
    const rng = mulberry32(11)
    const state = createInitialGameState('sm', 'bw', rng)
    const smP = state.players[0], opp = state.players[1]
    const hpBefore = opp.hp
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 6], rng, PP)
    expect(smP.tokens.invisibility).toBe(1)
    expect(opp.tokens.webbed).toBe(1)
    expect(hpBefore - opp.hp).toBe(15) // 13 ULT + 2 iso du Webbed (bw : pas d'armure)
  })
})
