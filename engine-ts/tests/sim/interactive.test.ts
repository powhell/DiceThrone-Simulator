import { describe, it, expect } from 'vitest'
import { mulberry32 } from '../../src/sim/rng.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import { createValueGreedyPolicy } from '../../src/sim/rl/valueGreedyPolicy.js'
import { createNetwork } from '../../src/sim/rl/network.js'
import { FEATURE_COUNT } from '../../src/sim/rl/features.js'
import { STARTING_HP } from '../../src/sim/data/config.js'
import {
  newHumanGame, beginHumanTurn, humanMainOptions,
  rollOffense, matchedAbilities, humanAttack, endHumanTurn, runAiTurn,
} from '../../src/sim/interactive.js'

// Drives a full human-vs-AI game the way the UI will: human turn (roll once, keep all, attack with
// the highest-damage matched ability) then AI turn, until the game ends.
function playScriptedGame(ai: Policy, seed: number) {
  const rng = mulberry32(seed)
  const g = newHumanGame('hh', 'bw', ai, rng, true)
  let guard = 0
  const optionsSeen: number[] = []
  while (!g.state.gameOver && guard++ < 300) {
    beginHumanTurn(g)
    if (g.state.gameOver) break
    // main1: the UI always gets at least a { kind:'pass' } option to show.
    optionsSeen.push(humanMainOptions(g, 'main1').length)
    // offensive roll: single roll, keep everything (a minimal but legal human choice).
    const dice = rollOffense(g, null, [])
    const cands = matchedAbilities(g, dice)
    if (cands.length) {
      const best = cands.reduce((a, b) => (b.baseDamage ?? 0) > (a.baseDamage ?? 0) ? b : a)
      humanAttack(g, dice, best.name)
    }
    endHumanTurn(g)
    if (g.state.gameOver) break
    runAiTurn(g)
  }
  return { g, guard, optionsSeen }
}

describe('interactive driver (human vs AI, sync)', () => {
  it('plays a full game to completion vs the greedy AI without crashing', () => {
    const { g, guard } = playScriptedGame(greedyHighestDamagePolicy, 12345)
    expect(g.state.gameOver).toBe(true)          // reached a real terminal state, not the guard
    expect(guard).toBeLessThan(300)
    expect([0, 1, null]).toContain(g.state.winner)
    // a decisive game ends with exactly one player dead; a draw with both.
    const [p0, p1] = g.state.players
    if (g.state.winner === 0) expect(p1.hp).toBeLessThanOrEqual(0)
    else if (g.state.winner === 1) expect(p0.hp).toBeLessThanOrEqual(0)
    else { expect(p0.hp).toBeLessThanOrEqual(0); expect(p1.hp).toBeLessThanOrEqual(0) }
    expect(Math.max(p0.hp, p1.hp)).toBeLessThanOrEqual(STARTING_HP)
  })

  it('plays a full game vs the learned (network) AI — exercises the AI-turn engine path', () => {
    const net = createNetwork([FEATURE_COUNT, 12, 6, 1], mulberry32(7))
    const { g } = playScriptedGame(createValueGreedyPolicy(net), 999)
    expect(g.state.gameOver).toBe(true)
    expect([0, 1, null]).toContain(g.state.winner)
  })

  it('always offers the human at least a pass in the Main Phase', () => {
    const rng = mulberry32(3)
    const g = newHumanGame('bw', 'hh', greedyHighestDamagePolicy, rng, true)
    beginHumanTurn(g)
    const opts = humanMainOptions(g, 'main1')
    expect(opts.length).toBeGreaterThanOrEqual(1)
    expect(opts.some(o => o.kind === 'pass')).toBe(true)
  })
})
