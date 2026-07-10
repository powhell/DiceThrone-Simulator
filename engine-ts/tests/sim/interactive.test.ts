import { describe, it, expect } from 'vitest'
import { mulberry32, mulberry32Stateful } from '../../src/sim/rng.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import { createValueGreedyPolicy } from '../../src/sim/rl/valueGreedyPolicy.js'
import { createNetwork } from '../../src/sim/rl/network.js'
import { FEATURE_COUNT } from '../../src/sim/rl/features.js'
import { STARTING_HP } from '../../src/sim/data/config.js'
import {
  newHumanGame, beginHumanTurn, humanMainOptions,
  rollOffense, matchedAbilities, humanAttack, endHumanTurn, runAiTurn,
  runAiTurnUpToAlter, finishAiAlter, nextDefenseDecision, chooseDefense,
  resolveAiAttack, aiComboPending,
} from '../../src/sim/interactive.js'
import type { WindowAction } from '../../src/sim/types.js'

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

  // Combo (sm) post-mortem : si la 1re attaque de l'IA TUE l'humain, la partie est finie —
  // pas de 2e Offensive Roll Phase. Le driver ne posait jamais gameOver après resolveAiAttack
  // (playTurn le fait via checkGameOver), donc aiComboPending restait vrai et l'IA « combotait
  // un cadavre » (trouvé par la boucle différentielle du diagnostic 2026-07-09).
  it('ne dépense pas le Combo quand la première attaque a déjà tué l\'humain', () => {
    // Graines balayées jusqu'à une attaque SM qui touche (>0 dégât) un humain à 1 PV.
    for (let seed = 0; seed < 40; seed++) {
      const rng = mulberry32Stateful(seed)
      const g = newHumanGame('th', 'sm', greedyHighestDamagePolicy, rng, true)
      const ai = g.state.players[g.aiIdx]
      g.state.players[g.humanIdx].hp = 1
      ai.tokens.combo = 1
      const r0 = runAiTurnUpToAlter(g)
      expect(r0.done).toBe(false)
      finishAiAlter(g)
      for (let k = 0; k < 50; k++) {
        const p = nextDefenseDecision(g)
        if (!p) break
        chooseDefense(g, { kind: 'pass' } as WindowAction)
      }
      resolveAiAttack(g)
      if (g.state.players[g.humanIdx].hp > 0) continue // whiff/0 dégât : pas le scénario visé
      // L'humain est mort : le driver doit le savoir (gameOver) et ne pas offrir le Combo.
      expect(g.state.gameOver).toBe(true)
      expect(aiComboPending(g)).toBe(false)
      return
    }
    throw new Error('aucune graine <40 ne produit une attaque SM létale — élargir le balayage')
  })
})
