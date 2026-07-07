// Network-vs-network evaluation — replaces greedy as the primary progress metric (greedy
// saturated: the old best.json already beat it ~98%, leaving the metric no resolution; see
// project memory). Plays netA vs netB across all 4 matchups with SEAT ALTERNATION (half the
// games A sits p0, half A sits p1) so first-player advantage cancels out of the comparison.
// netB may be the literal string "greedy" to keep the old scripted baseline as a secondary
// sanity check.
//
// Prints one "RESULT " JSON line: aWins/bWins/draws/timeouts + aWinrate (decisive games only).
//
// Run: npx tsx src/sim/rl/evalNets.ts <netA.json> <netB.json|greedy> <gamesPerMatchup> <seed>
import * as fs from 'node:fs'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON } from './network.js'
import { FEATURE_COUNT } from './features.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { greedyHighestDamagePolicy } from '../policy.js'
import { runMatch, runBossMatch } from '../match.js'

// Miroirs (hh-hh, bw-bw) retirés à la demande du user (2026-07-05) : ils coûtent la moitié
// du budget de calcul pour des règles spéciales non modélisées (unicité Head/armures) et
// n'informent pas l'équilibre inter-héros.
import { EVAL_MATCHUPS as MATCHUPS } from './matchups.js' // v3 : 10 matchups couvrant les 8 héros

function loadPolicy(pathOrGreedy: string): Policy {
  if (pathOrGreedy === 'greedy') return greedyHighestDamagePolicy
  const net = fromJSON(fs.readFileSync(pathOrGreedy, 'utf-8'))
  if (net.sizes[0] !== FEATURE_COUNT) {
    throw new Error(`weights ${pathOrGreedy}: input size ${net.sizes[0]} != FEATURE_COUNT ${FEATURE_COUNT}`)
  }
  return createValueGreedyPolicy(net)
}

function main(): void {
  const [aPath, bPath, gamesArg, seedArg] = process.argv.slice(2)
  const gamesPerMatchup = Number(gamesArg ?? 20)
  const seedBase = Number(seedArg ?? 7000)
  if (!aPath || !bPath) {
    console.error('usage: evalNets.ts <netA.json> <netB.json|greedy> <gamesPerMatchup> <seed>')
    process.exit(1)
  }
  const polA = loadPolicy(aPath)
  const polB = loadPolicy(bPath)

  let aWins = 0, bWins = 0, draws = 0, timeouts = 0
  let seed = seedBase
  for (const [heroA, heroB] of MATCHUPS) {
    for (let g = 0; g < gamesPerMatchup; g++) {
      // Seat alternation: even games A sits p0, odd games A sits p1 (same hero pairing).
      const aSeat: 0 | 1 = g % 2 === 0 ? 0 : 1
      const policies: [Policy, Policy] = aSeat === 0 ? [polA, polB] : [polB, polA]
      const r = heroB === 'nx' ? runBossMatch(heroA, seed++, policies[0], (seed % 2 === 1)) : runMatch(heroA, heroB, seed++, policies)
      if (r.winner === null) {
        if (r.finalState.gameOver) draws += 1
        else timeouts += 1
      } else if (r.winner === aSeat) aWins += 1
      else bWins += 1
    }
  }

  const decisive = aWins + bWins
  console.log('RESULT ' + JSON.stringify({
    aWins, bWins, draws, timeouts,
    aWinrate: decisive > 0 ? aWins / decisive : 0.5,
  }))
}

main()
