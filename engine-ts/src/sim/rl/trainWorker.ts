// One round of self-play training, run as its own OS process (spawned by trainParallel.ts via
// child_process — not worker_threads, which would need extra plumbing to run .ts files under
// tsx's loader inside a worker thread; a separate `npx tsx` process sidesteps that entirely and
// is just as effective for this embarrassingly-parallel workload).
//
// Run: npx tsx src/sim/rl/trainWorker.ts <gamesToPlay> <inputWeightsPath> <outputWeightsPath> <workerSeed>
// Loads the network from inputWeightsPath (must already exist — trainParallel.ts always writes
// the canonical checkpoint before spawning workers), plays `gamesToPlay` self-play games with
// local TD updates, writes the result to outputWeightsPath, then exits. Does its own thing in
// isolation — trainParallel.ts is responsible for averaging this worker's output together with
// its siblings' after every round.
import { playSelfPlayGame, loadNetworkFrom, saveNetworkTo, MATCHUPS } from './trainCore.js'

const gamesToPlay = Number(process.argv[2])
const inputPath = process.argv[3]
const outputPath = process.argv[4]
const workerSeed = Number(process.argv[5] ?? 0)

const network = loadNetworkFrom(inputPath)
if (!network) {
  console.error(`trainWorker: no checkpoint found at ${inputPath}`)
  process.exit(1)
}

for (let i = 0; i < gamesToPlay; i++) {
  const [heroA, heroB] = MATCHUPS[i % MATCHUPS.length]
  // Seed offset by workerSeed so sibling workers in the same round don't all play the exact
  // same sequence of games.
  playSelfPlayGame(network, heroA, heroB, workerSeed * 10_000_000 + i)
}

saveNetworkTo(outputPath, network)
