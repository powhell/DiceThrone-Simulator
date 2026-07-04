// Single-process self-play TD(0) training driver. Run: npx tsx src/sim/rl/train.ts [games]
// Resumes from weights/latest.json if it exists, otherwise starts from a fresh network.
// Periodically checkpoints and evaluates the current network against greedyHighestDamagePolicy
// across all 4 matchups — that win-rate trending upward over hours is the actual "is it
// learning" signal (see the RL plan, 2026-07-02).
//
// For actually using this machine's multiple cores over a long run, see trainParallel.ts
// instead — this single-process version exists to keep the core self-play/TD logic (in
// trainCore.ts) easy to validate/debug before parallelizing it.
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  playSelfPlayGame, runEvalReport, loadNetworkFrom, createFreshNetwork, saveNetworkTo, MATCHUPS,
} from './trainCore.js'

const CHECKPOINT_EVERY = 50 // games
const CHECKPOINT_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'weights', 'latest.json')

const NUM_GAMES = Number(process.argv[2] ?? 200)

let network = loadNetworkFrom(CHECKPOINT_PATH)
if (network) console.log(`Resuming from checkpoint: ${CHECKPOINT_PATH}`)
else {
  console.log('No checkpoint found, starting from a fresh network.')
  network = createFreshNetwork(Date.now() % 2 ** 31)
}

console.log(`Training for ${NUM_GAMES} self-play games (checkpointing every ${CHECKPOINT_EVERY} to ${CHECKPOINT_PATH})`)
const startTime = Date.now()

for (let i = 0; i < NUM_GAMES; i++) {
  const [heroA, heroB] = MATCHUPS[i % MATCHUPS.length]
  playSelfPlayGame(network, heroA, heroB, 1_000_000 + i)

  if ((i + 1) % CHECKPOINT_EVERY === 0 || i + 1 === NUM_GAMES) {
    saveNetworkTo(CHECKPOINT_PATH, network)
    const elapsedSec = (Date.now() - startTime) / 1000
    console.log(`[game ${i + 1}/${NUM_GAMES}] checkpoint saved (${elapsedSec.toFixed(1)}s elapsed, ${((i + 1) / elapsedSec).toFixed(2)} games/s)`)
    runEvalReport(network, 5_000_000 + i)
  }
}

console.log('Training complete.')
