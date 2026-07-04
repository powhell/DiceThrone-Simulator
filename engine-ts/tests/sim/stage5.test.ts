import { describe, it, expect } from 'vitest'
import {
  enumerateWindowActions, applyWindowAction, resolveAbilityPhase,
} from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import { createInitialGameState } from '../../src/sim/match.js'
import { mulberry32 } from '../../src/sim/rng.js'
import type { WindowAction, WindowContext } from '../../src/sim/types.js'
import { clearCache } from '../../src/index.js'

const MAIN: WindowContext = { windowType: 'mainPhase', phase: 'main2' }
const OFF: WindowContext = { windowType: 'offensiveRoll' }

// ------------------------------------------------------------------ 5e: So Wild! / Twice As Wild!
describe('5e — So Wild! / Twice As Wild! (setDie, adverse targeting)', () => {
  it('So Wild! played by the opponent sets one of the roller\'s dice to a chosen value, costs 2 CP', () => {
    const state = createInitialGameState('hh', 'bw') // roller 0, opponent 1
    const opp = state.players[1]
    opp.hand = ['so-wild']; opp.cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [4, 4, 4, 4, 4] }
    const set = enumerateWindowActions(state, 1, OFF).find(
      (o): o is Extract<WindowAction, { kind: 'setDie' }> => o.kind === 'setDie' && o.cardId === 'so-wild' && o.sets[0].dieIndex === 2 && o.sets[0].value === 6,
    )!
    applyWindowAction(state, 1, set, OFF, mulberry32(1))
    expect(state.pendingRoll!.dice).toEqual([4, 4, 6, 4, 4])
    expect(opp.cp).toBe(3)
    expect(opp.hand).not.toContain('so-wild')
  })

  it('Twice As Wild! sets two dice at once, costs 3 CP', () => {
    const state = createInitialGameState('hh', 'bw')
    const self = state.players[0]
    self.hand = ['twice-as-wild']; self.cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [1, 1, 1, 1, 1] }
    const set = enumerateWindowActions(state, 0, OFF).find(
      (o): o is Extract<WindowAction, { kind: 'setDie' }> =>
        o.kind === 'setDie' && o.cardId === 'twice-as-wild'
        && o.sets.length === 2 && o.sets[0].dieIndex === 0 && o.sets[0].value === 6 && o.sets[1].dieIndex === 1 && o.sets[1].value === 6,
    )!
    applyWindowAction(state, 0, set, OFF, mulberry32(1))
    expect(state.pendingRoll!.dice).toEqual([6, 6, 1, 1, 1])
    expect(self.cp).toBe(2)
  })

  it('is offered to BOTH participants on the roller\'s dice', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hand = ['so-wild']; state.players[0].cp = 5
    state.players[1].hand = ['so-wild']; state.players[1].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [3, 3, 3, 3, 3] }
    expect(enumerateWindowActions(state, 0, OFF).some(o => o.kind === 'setDie')).toBe(true)
    expect(enumerateWindowActions(state, 1, OFF).some(o => o.kind === 'setDie')).toBe(true)
  })
})

// ------------------------------------------------------------------------------- 5b: Instants
describe('5b — Instant self-buffs as interruptions', () => {
  it('Getting Paid! grants 2 CP and leaves the hand (any window)', () => {
    const state = createInitialGameState('hh', 'bw')
    const self = state.players[0]
    self.hand = ['getting-paid']; self.cp = 3
    applyWindowAction(state, 0, { kind: 'playInstant', cardId: 'getting-paid' }, OFF, mulberry32(1))
    expect(self.cp).toBe(5) // 0 cost, +2
    expect(self.hand).not.toContain('getting-paid')
    expect(self.discard).toContain('getting-paid')
  })

  it('Dark Surprise! (HH instant) grants 2 Dreadful', () => {
    const state = createInitialGameState('hh', 'bw')
    const self = state.players[0]
    self.hand = ['dark-surprise']; self.cp = 5
    applyWindowAction(state, 0, { kind: 'playInstant', cardId: 'dark-surprise' }, MAIN, mulberry32(1))
    expect(self.tokens.dreadful).toBe(2)
    expect(self.cp).toBe(3)
  })

  it('the opponent is offered their Instants during the active player\'s Main Phase, but NOT upgrades', () => {
    const state = createInitialGameState('hh', 'bw') // active = 0
    const opp = state.players[1]
    opp.hand = ['getting-paid', 'baton-strike-ii'] // an instant + a BW upgrade
    opp.cp = 5
    const opts = enumerateWindowActions(state, 1, MAIN)
    expect(opts.some(o => o.kind === 'playInstant' && o.cardId === 'getting-paid')).toBe(true)
    expect(opts.some(o => o.kind === 'playCard')).toBe(false) // upgrades are the active player's only
  })

  it('Dancing Pumpkin!: +2 Grim Pursuit without the Head, +2 Dreadful with it', () => {
    const noHead = createInitialGameState('hh', 'bw')
    noHead.players[0].tokens.head = 0
    noHead.players[0].hand = ['dancing-pumpkin']; noHead.players[0].cp = 5
    applyWindowAction(noHead, 0, { kind: 'playInstant', cardId: 'dancing-pumpkin' }, MAIN, mulberry32(1))
    expect(noHead.players[0].tokens.grimPursuit).toBe(2)
    expect(noHead.players[0].tokens.dreadful).toBe(0)

    const withHead = createInitialGameState('hh', 'bw')
    withHead.players[0].tokens.head = 1
    withHead.players[0].hand = ['dancing-pumpkin']; withHead.players[0].cp = 5
    applyWindowAction(withHead, 0, { kind: 'playInstant', cardId: 'dancing-pumpkin' }, MAIN, mulberry32(1))
    expect(withHead.players[0].tokens.dreadful).toBe(2)
    expect(withHead.players[0].tokens.grimPursuit).toBe(0)
  })
})

// -------------------------------------------------------------------- 5c: cross-player token cards
describe('5c — cross-player status-effect cards', () => {
  it('Transference! moves an Agility token from BW(1) to HH(0)', () => {
    const state = createInitialGameState('hh', 'bw') // active 0 = HH
    const [hh, bw] = state.players
    hh.hand = ['transference']; hh.cp = 5
    bw.tokens.agility = 1
    const move = enumerateWindowActions(state, 0, MAIN).find(
      (o): o is Extract<WindowAction, { kind: 'transferToken' }> =>
        o.kind === 'transferToken' && o.tokenKind === 'agility' && o.fromIdx === 1 && o.toIdx === 0,
    )!
    applyWindowAction(state, 0, move, MAIN, mulberry32(1))
    expect(bw.tokens.agility).toBe(0)
    expect(hh.tokens.agility).toBe(1) // HH now holds BW's status token
    expect(hh.cp).toBe(3)
  })

  it('Transference! can send a Time Bomb back onto the inflictor (positional token)', () => {
    const state = createInitialGameState('hh', 'bw') // active 0 = HH, holds a Time Bomb from BW
    const [hh, bw] = state.players
    hh.hand = ['transference']; hh.cp = 5
    hh.timeBombs = ['0:01']
    const move: WindowAction = { kind: 'transferToken', cardId: 'transference', tokenKind: 'timeBomb', fromIdx: 0, toIdx: 1 }
    applyWindowAction(state, 0, move, MAIN, mulberry32(1))
    expect(hh.timeBombs).toEqual([])
    expect(bw.timeBombs).toEqual(['0:01']) // position preserved
  })

  it('Get That Outta Here! removes one status token from a chosen player', () => {
    const state = createInitialGameState('bw', 'hh')
    const [bw, hh] = state.players
    bw.hand = ['get-that-outta-here']; bw.cp = 5
    hh.tokens.dreadful = 3
    const rm = enumerateWindowActions(state, 0, MAIN).find(
      (o): o is Extract<WindowAction, { kind: 'removeToken' }> =>
        o.kind === 'removeToken' && o.tokenKind === 'dreadful' && o.targetIdx === 1,
    )!
    applyWindowAction(state, 0, rm, MAIN, mulberry32(1))
    expect(hh.tokens.dreadful).toBe(2)
  })

  it('What Status Effects? clears dreadful/agility/timeBomb but NOT covertOps', () => {
    const state = createInitialGameState('bw', 'bw')
    const target = state.players[1]
    target.tokens.agility = 2
    target.tokens.covertOps = 3
    target.timeBombs = ['0:02', '0:01']
    state.players[0].hand = ['what-status-effects']; state.players[0].cp = 5
    applyWindowAction(state, 0, { kind: 'removeAllTokens', cardId: 'what-status-effects', targetIdx: 1 }, MAIN, mulberry32(1))
    expect(target.tokens.agility).toBe(0)
    expect(target.timeBombs).toEqual([])
    expect(target.tokens.covertOps).toBe(3) // "may not be transferred or removed by any means"
  })

  it('covertOps is never offered as a transferable token', () => {
    const state = createInitialGameState('bw', 'bw')
    state.players[0].hand = ['transference', 'get-that-outta-here']; state.players[0].cp = 9
    state.players[0].tokens.covertOps = 3 // present, but not transferable
    state.players[1].tokens.covertOps = 3
    const opts = enumerateWindowActions(state, 0, MAIN)
    expect(opts.some(o => (o.kind === 'transferToken' || o.kind === 'removeToken') && (o as any).tokenKind === 'covertOps')).toBe(false)
  })

  it('Rolling Pumpkin! (HH card) moves the Haunted Head to a chosen player', () => {
    const state = createInitialGameState('hh', 'bw')
    const [hh, bw] = state.players
    hh.tokens.head = 1
    hh.hand = ['rolling-pumpkin']; hh.cp = 5
    applyWindowAction(state, 0, { kind: 'moveHead', cardId: 'rolling-pumpkin', toIdx: 1 }, OFF, mulberry32(1))
    expect(hh.tokens.head).toBe(0)
    expect(bw.tokens.head).toBe(1) // head handed to the opponent
  })
})

// --------------------------------------------------------------------- 5d: Grim Pursuit spend (b)
describe('5d — Grim Pursuit spend mode (b) as a decision', () => {
  const spender: Policy = { ...greedyHighestDamagePolicy, chooseGrimPursuitSpend: () => true }

  it('spends 1 Grim Pursuit for bonus damage when the policy opts in, once per turn', () => {
    clearCache()
    const rng = mulberry32(40)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    self.tokens.grimPursuit = 1
    const oppHpBefore = opp.hp
    // [1,4,4,4,6]: b=3,c=1 → Reap (undefendable, 3 base dmg), so bonus lands directly.
    resolveAbilityPhase(state, 0, [1, 4, 4, 4, 6], rng, [spender, greedyHighestDamagePolicy])
    expect(self.tokens.grimPursuit).toBe(0)
    expect(self.grimPursuitBonusUsedThisTurn).toBe(true)
    expect(opp.hp).toBeLessThanOrEqual(oppHpBefore - 4) // 3 base + >=1 bonus
  })

  it('greedy never spends Grim Pursuit (no chooseGrimPursuitSpend)', () => {
    clearCache()
    const rng = mulberry32(40)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    self.tokens.grimPursuit = 1
    const oppHpBefore = opp.hp
    resolveAbilityPhase(state, 0, [1, 4, 4, 4, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(self.tokens.grimPursuit).toBe(1) // untouched
    expect(opp.hp).toBe(oppHpBefore - 3) // Reap base only
  })

  it('does not spend again once used this turn', () => {
    clearCache()
    const rng = mulberry32(40)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self] = state.players
    self.tokens.grimPursuit = 2
    self.grimPursuitBonusUsedThisTurn = true // already used
    resolveAbilityPhase(state, 0, [1, 4, 4, 4, 6], rng, [spender, greedyHighestDamagePolicy])
    expect(self.tokens.grimPursuit).toBe(2) // guard blocks a second spend
  })
})
