import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../src/sim/match.js'
import { enumerateWindowActions, applyWindowAction } from '../../src/sim/turn.js'
import { mulberry32 } from '../../src/sim/rng.js'

const mainCtx = { windowType: 'mainPhase' as const, phase: 'main1' as const }

function bwGame() {
  const g = createInitialGameState('bw', 'hh', mulberry32(7))
  g.activePlayerIdx = 0
  const bw = g.players[0]
  bw.hand = ['baton-strike-ii']   // a 1-CP upgrade
  bw.cp = 0                        // prove it's FREE (can't afford the CP path)
  bw.tokens.covertOps = 3
  bw.covertOpsUsedThisTurn = false
  bw.upgradesInPlay = []
  return g
}

describe('Covert Ops — free upgrade into play', () => {
  it('is offered in the Main Phase when BW has a Covert Ops token and a placeable upgrade', () => {
    const g = bwGame()
    const opts = enumerateWindowActions(g, 0, mainCtx)
    expect(opts.some(o => o.kind === 'covertOpsUpgrade' && o.cardId === 'baton-strike-ii')).toBe(true)
    // With 0 CP the paid path must NOT be offered — proving Covert Ops is the free route.
    expect(opts.some(o => o.kind === 'playCard' && o.cardId === 'baton-strike-ii')).toBe(false)
  })

  it('spends 1 Covert Ops (not CP) and puts the upgrade into play', () => {
    const g = bwGame(); const bw = g.players[0]
    applyWindowAction(g, 0, { kind: 'covertOpsUpgrade', cardId: 'baton-strike-ii' }, mainCtx, mulberry32(1))
    expect(bw.upgradesInPlay).toContain('baton-strike-ii')
    expect(bw.hand).not.toContain('baton-strike-ii')
    expect(bw.tokens.covertOps).toBe(2)   // spent exactly one
    expect(bw.cp).toBe(0)                  // free — no CP paid
    expect(bw.covertOpsUsedThisTurn).toBe(true)
    expect(bw.upgradesPlayedThisTurn).toBe(1) // counts for Subversion! synergy
  })

  it('is once per turn — no second Covert Ops upgrade offered after using it', () => {
    const g = bwGame(); const bw = g.players[0]
    bw.hand = ['baton-strike-ii', 'hacked-ii']
    applyWindowAction(g, 0, { kind: 'covertOpsUpgrade', cardId: 'baton-strike-ii' }, mainCtx, mulberry32(1))
    const opts = enumerateWindowActions(g, 0, mainCtx)
    expect(opts.some(o => o.kind === 'covertOpsUpgrade')).toBe(false)
    expect(bw.tokens.covertOps).toBe(2) // second upgrade not placed
  })

  it('HH is never offered Covert Ops (no such token)', () => {
    const g = createInitialGameState('hh', 'bw', mulberry32(3))
    g.activePlayerIdx = 0
    g.players[0].hand = ['cleave-ii']
    const opts = enumerateWindowActions(g, 0, mainCtx)
    expect(opts.some(o => o.kind === 'covertOpsUpgrade')).toBe(false)
  })
})
