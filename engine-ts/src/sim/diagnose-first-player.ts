// One-off diagnostic: is the first-player win-rate skew seen in cli.ts (~60-76% of decisive
// matches, vs the ~5% the user recalls from real competitive Dice Throne) caused by
// greedyHighestDamagePolicy's naive snowballing (always buys every affordable upgrade ASAP,
// always takes the highest-known-damage move, no comeback behavior), or a real bug in the
// turn economy (income/CP/card draw/upkeep)? If a much weaker/randomized policy shows a
// similarly large skew, that points to a rules bug, not just a naive policy. If the skew
// shrinks a lot, it's the policy.
// Run: npx tsx src/sim/diagnose-first-player.ts [n]
import { createInitialGameState, MAX_TURNS } from './match.js'
import { playTurn } from './turn.js'
import { greedyHighestDamagePolicy } from './policy.js'
import type { Policy } from './policy.js'
import { mulberry32 } from './rng.js'
import type { RNG } from './rng.js'
import type { HeroId, WindowAction } from './types.js'

// Makes legal but unoptimized/randomized choices at the two decision points most implicated in
// the snowball hypothesis (which ability to activate, whether/what upgrades to buy) — plus
// coin-flips everywhere else so it's not accidentally deterministic in a way that hides bugs.
// Its own randomness comes from a dedicated RNG instance (seeded per-match for reproducibility)
// rather than the match's dice-rolling RNG, so it doesn't perturb dice outcomes.
function createRandomPolicy(seed: number): Policy {
  const rng: RNG = mulberry32(seed)
  const shuffle = <T>(arr: T[]): T[] => arr.map(v => [rng(), v] as const).sort((a, b) => a[0] - b[0]).map(([, v]) => v)

  return {
    chooseMidRollCards: () => [],
    // Random decision: in a Main Phase window, half the time play a random affordable upgrade
    // offered (unlike greedy, doesn't always buy everything), otherwise pass. The window
    // re-enumerates after each play, so this buys a random subset over successive calls.
    decide(_state, _playerIdx, request): WindowAction {
      const plays = request.options.filter(o => o.kind === 'playCard')
      if (plays.length > 0 && rng() < 0.5) return shuffle(plays)[0]
      return { kind: 'pass' }
    },
    chooseSabotageReroll: () => rng() < 0.5,
    chooseAbility(_state, _playerIdx, candidates) {
      return candidates[Math.floor(rng() * candidates.length)].name
    },
    chooseHeadlessMayhem: (_state, _playerIdx, canTerrorize) => (canTerrorize && rng() < 0.5 ? 'terrorize' : 'none'),
    chooseCardsToDiscard(state, playerIdx, maxHandSize) {
      const hand = state.players[playerIdx].hand
      const overflow = hand.length - maxHandSize
      return overflow > 0 ? shuffle(hand).slice(0, overflow) : []
    },
    chooseHorrifyBonus: () => (rng() < 0.5 ? 'dreadful' : 'grimPursuit'),
    chooseAttackModifierCards: () => [],
    chooseRollManipulationCards: () => [],
  }
}

interface BatchStats {
  winsP0: number
  winsP1: number
  timeouts: number
}

function runBatch(heroA: HeroId, heroB: HeroId, n: number, makePolicies: (seed: number) => [Policy, Policy]): BatchStats {
  const stats: BatchStats = { winsP0: 0, winsP1: 0, timeouts: 0 }
  for (let seed = 0; seed < n; seed++) {
    const rng = mulberry32(seed)
    const state = createInitialGameState(heroA, heroB, rng)
    const policies = makePolicies(seed)

    while (!state.gameOver && state.turnNumber < MAX_TURNS) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      playTurn(state, activeIdx, rng, policies)
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    }

    if (state.winner === null) stats.timeouts += 1
    else if (state.winner === 0) stats.winsP0 += 1
    else stats.winsP1 += 1
  }
  return stats
}

function report(label: string, heroA: HeroId, heroB: HeroId, n: number, makePolicies: (seed: number) => [Policy, Policy]): void {
  const s = runBatch(heroA, heroB, n, makePolicies)
  const decisive = s.winsP0 + s.winsP1
  const p0Rate = decisive > 0 ? ((100 * s.winsP0) / decisive).toFixed(1) : 'n/a'
  console.log(`${label} — ${heroA}(p0) vs ${heroB}(p1), n=${n}: p0 wins ${s.winsP0}, p1 wins ${s.winsP1}, timeouts ${s.timeouts}, decisive p0-winrate=${p0Rate}%`)
}

const N = Number(process.argv[2] ?? 300)

console.log('=== baseline: greedyHighestDamagePolicy on both sides ===')
report('greedy', 'hh', 'bw', N, () => [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
report('greedy', 'bw', 'hh', N, () => [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
report('greedy', 'hh', 'hh', N, () => [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
report('greedy', 'bw', 'bw', N, () => [greedyHighestDamagePolicy, greedyHighestDamagePolicy])

console.log('\n=== random (legal but unoptimized) on both sides ===')
report('random', 'hh', 'bw', N, seed => [createRandomPolicy(seed * 2), createRandomPolicy(seed * 2 + 1)])
report('random', 'bw', 'hh', N, seed => [createRandomPolicy(seed * 2), createRandomPolicy(seed * 2 + 1)])
report('random', 'hh', 'hh', N, seed => [createRandomPolicy(seed * 2), createRandomPolicy(seed * 2 + 1)])
report('random', 'bw', 'bw', N, seed => [createRandomPolicy(seed * 2), createRandomPolicy(seed * 2 + 1)])
