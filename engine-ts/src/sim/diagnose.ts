// One-off diagnostic: breaks down WHERE damage comes from in hh-vs-bw matches, by parsing
// the existing turn.ts log lines. Not part of the engine's public surface — just answers
// "why is the win rate so lopsided" with numbers instead of guesses.
// Run: npx tsx src/sim/diagnose.ts [n]
import { createInitialGameState, MAX_TURNS } from './match.js'
import { playTurn } from './turn.js'
import { greedyHighestDamagePolicy } from './policy.js'
import { mulberry32 } from './rng.js'
import type { HeroId } from './types.js'

interface Breakdown {
  matches: number
  hpLost: [number, number] // total HP lost by [player0, player1], summed across matches
  sabotageCounterDmg: [number, number] // dmg dealt back to the attacker BY the defender's Sabotage, credited to the attacker who received it
  sabotagePrevented: [number, number] // dmg prevented BY each player's own Sabotage
  terrorizeDmgDealt: [number, number] // Terrorize dmg each player inflicted on the opponent
  hallowedReckoningZeroMitigationCount: [number, number] // times each player's HH defense fired with the 0-mitigation stub
  wins: [number, number]
}

function emptyBreakdown(): Breakdown {
  return {
    matches: 0,
    hpLost: [0, 0],
    sabotageCounterDmg: [0, 0],
    sabotagePrevented: [0, 0],
    terrorizeDmgDealt: [0, 0],
    hallowedReckoningZeroMitigationCount: [0, 0],
    wins: [0, 0],
  }
}

function runOneAndAnalyze(heroA: HeroId, heroB: HeroId, seed: number, acc: Breakdown): void {
  const state = createInitialGameState(heroA, heroB)
  const rng = mulberry32(seed)
  const startHp: [number, number] = [state.players[0].hp, state.players[1].hp]

  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    playTurn(state, activeIdx, rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }

  acc.matches += 1
  if (state.winner !== null) acc.wins[state.winner] += 1

  const finalHp: [number, number] = [state.players[0].hp, state.players[1].hp]
  acc.hpLost[0] += Math.max(0, startHp[0] - finalHp[0])
  acc.hpLost[1] += Math.max(0, startHp[1] - finalHp[1])

  for (const entry of state.log) {
    const defenderIdx = entry.playerIdx
    const attackerIdx = (1 - defenderIdx) as 0 | 1

    const sabo = entry.message.match(/^Sabotage: prevented (\d+), (\d+) dmg back, (\d+) TB inflicted/)
    if (sabo) {
      acc.sabotagePrevented[defenderIdx] += Number(sabo[1])
      // "dmg back" lands on the attacker — credit it to the attacker as damage THEY took.
      acc.sabotageCounterDmg[attackerIdx] += Number(sabo[2])
    }

    if (entry.message.startsWith('TODO(user): Hallowed Reckoning')) {
      acc.hallowedReckoningZeroMitigationCount[defenderIdx] += 1
    }

    const terrorize = entry.message.match(/^Terrorize: (\d+) dmg to opponent/)
    if (terrorize) {
      // playerIdx here is the HH player who triggered their own Terrorize (attacker role).
      acc.terrorizeDmgDealt[entry.playerIdx] += Number(terrorize[1])
    }
  }
}

function report(heroA: HeroId, heroB: HeroId, n: number): void {
  const acc = emptyBreakdown()
  for (let seed = 0; seed < n; seed++) runOneAndAnalyze(heroA, heroB, seed, acc)

  const label = (idx: 0 | 1) => (idx === 0 ? heroA : heroB)
  console.log(`\n=== ${heroA} (p0) vs ${heroB} (p1), n=${n} ===`)
  console.log(`wins: ${label(0)}=${acc.wins[0]} ${label(1)}=${acc.wins[1]}`)
  for (const idx of [0, 1] as const) {
    console.log(`-- ${label(idx)} (player ${idx}) --`)
    console.log(`  avg HP lost per match:               ${(acc.hpLost[idx] / n).toFixed(2)}`)
    console.log(`  avg Sabotage counter-dmg TAKEN:       ${(acc.sabotageCounterDmg[idx] / n).toFixed(2)}  (only nonzero if opponent is bw)`)
    console.log(`  avg dmg PREVENTED by own Sabotage:    ${(acc.sabotagePrevented[idx] / n).toFixed(2)}  (only nonzero if this player is bw)`)
    console.log(`  avg Terrorize dmg DEALT to opponent:  ${(acc.terrorizeDmgDealt[idx] / n).toFixed(2)}  (only nonzero if this player is hh)`)
    console.log(`  avg times own defense had 0% mitig.:  ${(acc.hallowedReckoningZeroMitigationCount[idx] / n).toFixed(2)}  (only nonzero if this player is hh)`)
  }
}

const N = Number(process.argv[2] ?? 300)
report('hh', 'bw', N)
report('bw', 'hh', N)
