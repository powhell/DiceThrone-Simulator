import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../src/sim/match.js'
import { enumerateWindowActions, applyWindowAction } from '../../src/sim/turn.js'
import { mulberry32 } from '../../src/sim/rng.js'

describe('sellCard (Main Phase sale, +1 CP)', () => {
  it('is enumerated for every hand card of the active player and applies correctly', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hand = ['cleave-ii', 'tip-it']
    state.players[0].cp = 0
    const opts = enumerateWindowActions(state, 0, { windowType: 'mainPhase', phase: 'main1' })
    const sells = opts.filter(o => o.kind === 'sellCard')
    expect(sells.map(s => s.kind === 'sellCard' && s.cardId).sort()).toEqual(['cleave-ii', 'tip-it'])
    applyWindowAction(state, 0, { kind: 'sellCard', cardId: 'tip-it' }, { windowType: 'mainPhase', phase: 'main1' }, mulberry32(1))
    expect(state.players[0].hand).toEqual(['cleave-ii'])
    expect(state.players[0].discard).toContain('tip-it')
    expect(state.players[0].cp).toBe(1)
  })

  it('is not offered to the non-active player', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[1].hand = ['recoil']
    const opts = enumerateWindowActions(state, 1, { windowType: 'mainPhase', phase: 'main1' })
    expect(opts.some(o => o.kind === 'sellCard')).toBe(false)
  })
})

describe('Ride Down matcher: exactly AAABB (regression, user-caught)', () => {
  it('AABBB (2 Axes + 3 Horseshoes) does NOT activate Ride Down', async () => {
    const { resolveMatchedAbilities } = await import('../../src/sim/ability-resolver.js')
    // faces 1-3 = A, 4-5 = B for hh: [1,2,4,4,5] = AABBB
    const cands = resolveMatchedAbilities('hh', [1, 2, 4, 4, 5], { dreadful: 0, hasHead: true })
    expect(cands.map(c => c.name)).not.toContain('Ride Down (AAABB)')
  })
  it('AAABB (3 Axes + 2 Horseshoes) does activate Ride Down', async () => {
    const { resolveMatchedAbilities } = await import('../../src/sim/ability-resolver.js')
    const cands = resolveMatchedAbilities('hh', [1, 2, 3, 4, 5], { dreadful: 0, hasHead: true })
    expect(cands.some(c => c.name.startsWith('Ride Down'))).toBe(true)
  })
})

describe('Better D! with die selection (rerollAll.dieIndices)', () => {
  it('rerolls only the chosen dice, leaving the others untouched', () => {
    const state = createInitialGameState('bw', 'hh')
    state.players[0].hand = ['better-d']
    state.players[0].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [6, 6, 1] }
    applyWindowAction(state, 0, { kind: 'rerollAll', cardId: 'better-d', dieIndices: [2] },
      { windowType: 'defenseRoll' }, mulberry32(3))
    expect(state.pendingRoll.dice[0]).toBe(6)
    expect(state.pendingRoll.dice[1]).toBe(6)
    expect(state.pendingRoll.dice[2]).toBeGreaterThanOrEqual(1)
    expect(state.players[0].hand).not.toContain('better-d')
  })
})
