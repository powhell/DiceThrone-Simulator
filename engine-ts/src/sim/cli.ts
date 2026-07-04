// Node-runnable harness — validates the rules engine end to end (build-order step 5)
// before any ML is attempted. Run: npx tsx src/sim/cli.ts [n]
import { runMatch, MAX_TURNS } from './match.js'
import { greedyHighestDamagePolicy } from './policy.js'
import type { HeroId } from './types.js'

interface BatchStats {
  winsA: number
  winsB: number
  draws: number
  timeouts: number
  totalTurns: number
  invariantViolations: string[]
}

function runBatch(heroA: HeroId, heroB: HeroId, n: number): BatchStats {
  const stats: BatchStats = { winsA: 0, winsB: 0, draws: 0, timeouts: 0, totalTurns: 0, invariantViolations: [] }

  for (let i = 0; i < n; i++) {
    const result = runMatch(heroA, heroB, i, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    stats.totalTurns += result.turns

    if (result.turns >= MAX_TURNS) stats.timeouts += 1
    else if (result.winner === 0) stats.winsA += 1
    else if (result.winner === 1) stats.winsB += 1
    else stats.draws += 1 // ended before MAX_TURNS with no winner = mutual-kill draw

    for (const p of result.finalState.players) {
      if (p.cp < 0) stats.invariantViolations.push(`seed ${i}: negative CP (${p.cp}) for ${p.heroId}`)
      if (p.hp > 10000 || p.hp < -10000) stats.invariantViolations.push(`seed ${i}: implausible HP (${p.hp}) for ${p.heroId}`)
      if (p.timeBombs.length > 2) {
        stats.invariantViolations.push(`seed ${i}: Time Bomb stack cap exceeded`)
      }
      if (p.heroId === 'hh' && (p.tokens as any).dreadful > 5) {
        stats.invariantViolations.push(`seed ${i}: Dreadful cap exceeded`)
      }
    }
  }

  return stats
}

function report(heroA: HeroId, heroB: HeroId, n: number): void {
  const s = runBatch(heroA, heroB, n)
  console.log(
    `${heroA} vs ${heroB} (n=${n}): ${heroA} wins ${s.winsA}, ${heroB} wins ${s.winsB}, `
    + `draws ${s.draws}, timeouts ${s.timeouts}, avg turns ${(s.totalTurns / n).toFixed(1)}, `
    + `invariant violations ${s.invariantViolations.length}`,
  )
  for (const v of s.invariantViolations.slice(0, 5)) console.log(`  - ${v}`)
}

const N = Number(process.argv[2] ?? 200)
report('hh', 'hh', N)
report('bw', 'bw', N)
report('hh', 'bw', N)
report('bw', 'hh', N)
