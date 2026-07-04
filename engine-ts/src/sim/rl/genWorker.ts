// Experience-generation worker for the PyTorch training pipeline (chantier 2026-07-04).
// Plays N self-play games with a FROZEN network (both seats) and writes one training sample per
// (turn, perspective): the encodeState feature vector plus the game's FINAL outcome for that
// perspective (+1 win / -1 loss / 0 draw-or-timeout).
//
// Monte-Carlo targets, deliberately NOT TD(0): the previous TS trainer bootstrapped each state
// toward the network's own next prediction, which is exactly the mechanism that let it LEARN
// Terrorize and then UN-learn it 90 minutes later (self-referential drift). Final-outcome targets
// can't drift that way — the label is ground truth from the finished game.
//
// Output: binary file, little-endian —
//   magic "DTX1" (4 bytes) | featDim uint32 | sampleCount uint32 | then sampleCount rows of
//   (featDim float32 features + 1 float32 target).
// A JSON summary line prefixed "SUMMARY " goes to stdout for the orchestrator to scrape
// (games, winners, turns, and the Terrorize canary: offered/taken while generating).
//
// Run: npx tsx src/sim/rl/genWorker.ts <games> <weightsPath> <outPath> <seed>
import * as fs from 'node:fs'
import type { HeroId, GameState } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON } from './network.js'
import { encodeState, FEATURE_COUNT } from './features.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { mulberry32 } from '../rng.js'
import { playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS } from '../match.js'
import { heroTemplateFor, cardById } from '../data/load.js'

const MATCHUPS: Array<[HeroId, HeroId]> = [['hh', 'bw'], ['bw', 'hh'], ['hh', 'hh'], ['bw', 'bw']]

function outcomeFor(state: GameState, idx: 0 | 1): number {
  if (state.winner === null) return 0
  return state.winner === idx ? 1 : -1
}

function main(): void {
  const [gamesArg, weightsPath, outPath, seedArg] = process.argv.slice(2)
  const games = Number(gamesArg)
  const seedBase = Number(seedArg)
  if (!games || !weightsPath || !outPath || Number.isNaN(seedBase)) {
    console.error('usage: genWorker.ts <games> <weightsPath> <outPath> <seed>')
    process.exit(1)
  }

  const network = fromJSON(fs.readFileSync(weightsPath, 'utf-8'))
  if (network.sizes[0] !== FEATURE_COUNT) {
    throw new Error(`weights input size ${network.sizes[0]} != FEATURE_COUNT ${FEATURE_COUNT} — stale checkpoint from an older feature encoding?`)
  }

  // Canaries, tracked at the source so every training round logs them without a separate
  // analysis pass:
  //  - Terrorize: the decision whose silent regression sank a previous run.
  //  - PAID upgrades: the v1 blindness this whole pipeline exists to fix (the old network
  //    bought 0 CP-costed upgrades over 400 games; only Covert-Ops-free ones ever hit play).
  let terrorizeOffered = 0
  let terrorizeTaken = 0
  let paidUpgrades = 0
  let freeUpgrades = 0
  const base = createValueGreedyPolicy(network)
  const policy: Policy = {
    ...base,
    chooseHeadlessMayhem(state, playerIdx, canTerrorize) {
      const c = base.chooseHeadlessMayhem(state, playerIdx, canTerrorize)
      if (canTerrorize) {
        terrorizeOffered += 1
        if (c === 'terrorize') terrorizeTaken += 1
      }
      return c
    },
    decide(state, playerIdx, request) {
      const action = base.decide(state, playerIdx, request)
      if (action.kind === 'covertOpsUpgrade') freeUpgrades += 1
      else if (action.kind === 'playCard') {
        const hero = heroTemplateFor(state.players[playerIdx].heroId)
        if (cardById(hero, action.cardId)?.kind === 'upgrade') paidUpgrades += 1
      }
      return action
    },
  }

  const features: number[][] = []
  const perspectives: Array<0 | 1> = []
  const gameEnds: number[] = [] // features.length at the end of each game, to backfill targets
  const outcomes: Array<[number, number]> = [] // per game: outcome for perspective 0 / 1

  let wins0 = 0, wins1 = 0, draws = 0, timeouts = 0, totalTurns = 0
  const t0 = Date.now()

  for (let g = 0; g < games; g++) {
    const [heroA, heroB] = MATCHUPS[g % MATCHUPS.length]
    const rng = mulberry32(seedBase + g)
    const state = createInitialGameState(heroA, heroB, rng)

    while (!state.gameOver && state.turnNumber < MAX_TURNS) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      playTurn(state, activeIdx, rng, [policy, policy])
      // One sample per perspective per turn: V is queried from both perspectives during
      // lookahead, so train it on both.
      features.push(encodeState(state, 0)); perspectives.push(0)
      features.push(encodeState(state, 1)); perspectives.push(1)
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    }

    gameEnds.push(features.length)
    outcomes.push([outcomeFor(state, 0), outcomeFor(state, 1)])
    totalTurns += state.turnNumber
    if (state.winner === 0) wins0 += 1
    else if (state.winner === 1) wins1 += 1
    else if (state.gameOver) draws += 1
    else timeouts += 1
  }

  // Backfill Monte-Carlo targets: every sample of game g gets that game's final outcome from
  // the sample's own perspective.
  const targets = new Float32Array(features.length)
  let start = 0
  for (let g = 0; g < gameEnds.length; g++) {
    const end = gameEnds[g]
    for (let s = start; s < end; s++) targets[s] = outcomes[g][perspectives[s]]
    start = end
  }

  // Binary write.
  const n = features.length
  const headerSize = 4 + 4 + 4
  const buf = Buffer.alloc(headerSize + n * (FEATURE_COUNT + 1) * 4)
  buf.write('DTX1', 0, 'ascii')
  buf.writeUInt32LE(FEATURE_COUNT, 4)
  buf.writeUInt32LE(n, 8)
  let off = headerSize
  for (let s = 0; s < n; s++) {
    const row = features[s]
    for (let j = 0; j < FEATURE_COUNT; j++) { buf.writeFloatLE(row[j], off); off += 4 }
    buf.writeFloatLE(targets[s], off); off += 4
  }
  fs.writeFileSync(outPath, buf)

  const elapsed = (Date.now() - t0) / 1000
  console.log('SUMMARY ' + JSON.stringify({
    games, samples: n, wins0, wins1, draws, timeouts,
    avgTurns: totalTurns / games,
    gamesPerSec: games / elapsed,
    terrorizeOffered, terrorizeTaken, paidUpgrades, freeUpgrades,
  }))
}

main()
