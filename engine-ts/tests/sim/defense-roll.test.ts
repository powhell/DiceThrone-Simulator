import { describe, it, expect } from 'vitest'
import { enumerateWindowActions, applyWindowAction } from '../../src/sim/turn.js'
import { createInitialGameState } from '../../src/sim/match.js'

// DRP3 defense-roll alter window: pendingRoll.rollerIdx is the DEFENDER (they rolled the defense
// dice). The attacker is the non-roller.
const CTX = { windowType: 'defenseRoll' as const }

describe('DRP3 defense-roll alter window', () => {
  it('the attacker (non-roller) may Tip It! and Helping Hand! the defender dice, but not Better D!', () => {
    const state = createInitialGameState('hh', 'bw') // attacker = 0, defender = 1
    state.players[0].hand = ['tip-it', 'helping-hand', 'better-d']
    state.players[0].cp = 5
    state.pendingRoll = { rollerIdx: 1, dice: [4, 4, 4] }
    const options = enumerateWindowActions(state, 0, CTX)
    expect(options.some(o => o.kind === 'alterDie')).toBe(true) // Tip It!
    expect(options.filter(o => o.kind === 'rerollDie')).toHaveLength(3) // Helping Hand!, one per die
    expect(options.some(o => o.kind === 'rerollAll')).toBe(false) // Better D! is the roller's only
    state.pendingRoll = null
  })

  it('the defender (roller) may Tip It! and Better D! their own dice, but not Helping Hand!', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[1].hand = ['tip-it', 'helping-hand', 'better-d']
    state.players[1].cp = 5
    state.pendingRoll = { rollerIdx: 1, dice: [4, 4, 4] }
    const options = enumerateWindowActions(state, 1, CTX)
    expect(options.some(o => o.kind === 'alterDie')).toBe(true) // Tip It!
    expect(options.some(o => o.kind === 'rerollAll')).toBe(true) // Better D!
    expect(options.some(o => o.kind === 'rerollDie')).toBe(false) // Helping Hand! targets an opponent
    state.pendingRoll = null
  })

  it('Better D! (rerollAll) rerolls every die and is spent (costs 0 CP)', () => {
    const state = createInitialGameState('bw', 'hh') // defender bw = player 0
    const def = state.players[0]
    def.hand = ['better-d']
    def.cp = 3
    state.pendingRoll = { rollerIdx: 0, dice: [4, 4, 4] }
    // rng always returns 0 -> every die becomes 1 + floor(0*6) = 1
    applyWindowAction(state, 0, { kind: 'rerollAll', cardId: 'better-d' }, CTX, () => 0)
    expect(state.pendingRoll!.dice).toEqual([1, 1, 1])
    expect(def.hand).not.toContain('better-d')
    expect(def.discard).toContain('better-d')
    expect(def.cp).toBe(3) // Better D! is free
    state.pendingRoll = null
  })
})
