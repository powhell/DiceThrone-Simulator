import { describe, it, expect } from 'vitest'
import { resolveOffensiveAlterWindow, enumerateWindowActions } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import { createInitialGameState } from '../../src/sim/match.js'
import { mulberry32 } from '../../src/sim/rng.js'

// Opponent policy that, in the ORP2 offensive-alter window, plays a specific die-altering action
// (once — the card is spent), passing to greedy everywhere else.
function opponentThatPlays(match: (o: { kind: string; dieIndex?: number; delta?: number }) => boolean): Policy {
  return {
    ...greedyHighestDamagePolicy,
    decide(state, idx, request) {
      if (request.ctx.windowType === 'offensiveRoll') {
        const chosen = request.options.find(match)
        if (chosen) return chosen
      }
      return greedyHighestDamagePolicy.decide(state, idx, request)
    },
  }
}

describe('ORP2 offensive-alter window', () => {
  it('greedy vs greedy: nobody alters, dice pass through unchanged', () => {
    const state = createInitialGameState('hh', 'bw')
    const dice = [4, 4, 4, 4, 4]
    const final = resolveOffensiveAlterWindow(state, 0, dice, mulberry32(1), [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(final).toEqual([4, 4, 4, 4, 4])
  })

  it("Tip It! played by the opponent nudges one of the roller's dice by -1 and costs 1 CP", () => {
    const state = createInitialGameState('hh', 'bw') // roller = 0 (hh), opponent = 1 (bw)
    const opp = state.players[1]
    opp.hand = ['tip-it']
    opp.cp = 5
    const tipDownDie0 = opponentThatPlays(o => o.kind === 'alterDie' && o.dieIndex === 0 && o.delta === -1)
    const final = resolveOffensiveAlterWindow(state, 0, [4, 4, 4, 4, 4], mulberry32(1), [greedyHighestDamagePolicy, tipDownDie0])
    expect(final[0]).toBe(3)
    expect(final.slice(1)).toEqual([4, 4, 4, 4])
    expect(opp.cp).toBe(4)
    expect(opp.hand).not.toContain('tip-it')
    expect(opp.discard).toContain('tip-it')
  })

  it("Helping Hand! played by the opponent rerolls one of the roller's dice and costs 1 CP", () => {
    const state = createInitialGameState('hh', 'bw')
    const opp = state.players[1]
    opp.hand = ['helping-hand']
    opp.cp = 5
    const rerollDie2 = opponentThatPlays(o => o.kind === 'rerollDie' && o.dieIndex === 2)
    const final = resolveOffensiveAlterWindow(state, 0, [4, 4, 4, 4, 4], mulberry32(7), [greedyHighestDamagePolicy, rerollDie2])
    expect(final[2]).toBeGreaterThanOrEqual(1)
    expect(final[2]).toBeLessThanOrEqual(6)
    expect([final[0], final[1], final[3], final[4]]).toEqual([4, 4, 4, 4])
    expect(opp.cp).toBe(4)
    expect(opp.hand).not.toContain('helping-hand')
  })

  it('the roller is offered Tip It! on their own dice but never Helping Hand!', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[0].hand = ['tip-it', 'helping-hand']
    state.players[0].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [4, 4, 4, 4, 4] }
    const options = enumerateWindowActions(state, 0, { windowType: 'offensiveRoll' })
    expect(options.some(o => o.kind === 'alterDie')).toBe(true)
    expect(options.some(o => o.kind === 'rerollDie')).toBe(false) // Helping Hand! targets an opponent's dice
    state.pendingRoll = null
  })

  it('the opponent is offered Helping Hand! against the roller', () => {
    const state = createInitialGameState('hh', 'bw')
    state.players[1].hand = ['helping-hand']
    state.players[1].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [4, 4, 4, 4, 4] }
    const options = enumerateWindowActions(state, 1, { windowType: 'offensiveRoll' })
    expect(options.filter(o => o.kind === 'rerollDie')).toHaveLength(5) // one per die
    state.pendingRoll = null
  })
})
