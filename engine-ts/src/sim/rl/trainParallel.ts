// Multi-process self-play training — the actual "use this machine's many cores for hours"
// driver (see the RL plan's v1.1). Each round: spawn `workers` independent `npx tsx
// trainWorker.ts` child processes, each starting from the SAME canonical checkpoint and playing
// `gamesPerRound` self-play games with its own local TD updates; once all finish, average their
// resulting weights (network.ts's averageNetworks — simple parameter averaging, no
// gradient-level synchronization needed) into the new canonical checkpoint, evaluate, repeat.
// Frequent syncing (small gamesPerRound) keeps workers from diverging too far apart between
// averages.
//
// Run: npx tsx src/sim/rl/trainParallel.ts [totalGames] [workers] [gamesPerRound] [evalEveryNRounds]
//
// Eval (runEvalReport: 4 matchups x 20 games, single-process, using the same expensive
// nested-lookahead policy on one side) is NOT cheap relative to one round of parallel
// self-play — with small/frequent rounds (the default gamesPerRound=5) it can easily dominate
// total wall-clock time and defeat the point of parallelizing. Only eval every
// `evalEveryNRounds` rounds (default 5) to keep it a minority of the time spent.
import * as os from 'node:os'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { averageNetworks } from './network.js'
import { loadNetworkFrom, createFreshNetwork, saveNetworkTo, runEvalReport } from './trainCore.js'

const RL_DIR = path.dirname(fileURLToPath(import.meta.url))
const WORKER_SCRIPT = path.join(RL_DIR, 'trainWorker.ts')
const CHECKPOINT_PATH = path.join(RL_DIR, 'weights', 'latest.json')
// Self-play TD(0) can regress over a long run (observed: ~50-75% winrate vs greedy collapsing
// to ~5-16% over 1000 games — vanilla TD self-play instability, no target network/gradient
// clipping). `latest.json` keeps evolving no matter what (that's how training explores), but
// `best.json` is ONLY overwritten when eval winrate hits a new high, so a regression never
// destroys the best result reached so far.
const BEST_CHECKPOINT_PATH = path.join(RL_DIR, 'weights', 'best.json')
const workerOutputPath = (slot: number) => path.join(RL_DIR, 'weights', `worker-${slot}.json`)

function runWorker(gamesPerRound: number, inputPath: string, outputPath: string, workerSeed: number): Promise<void> {
  return new Promise((resolve, reject) => {
    // shell:true + an args array does NOT auto-quote elements containing spaces (this repo's
    // own path has one — "DiceThrone Simulator") — must build and quote a single command
    // string ourselves rather than relying on spawn's array-join-under-a-shell behavior.
    const command = `npx tsx "${WORKER_SCRIPT}" ${gamesPerRound} "${inputPath}" "${outputPath}" ${workerSeed}`
    const child = spawn(command, { stdio: 'inherit', shell: true })
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`trainWorker exited with code ${code} (seed ${workerSeed})`))
    })
    child.on('error', reject)
  })
}

async function main(): Promise<void> {
  const totalGames = Number(process.argv[2] ?? 2000)
  // Deliberately conservative default: a prior run at `os.cpus().length - 2` workers (~20 on
  // this machine) pushed CPU core temps to ~100°C (near a 13700K's Tjmax) sustained for hours —
  // a real thermal risk, not just noise. Default to roughly a quarter of the logical cores;
  // pass an explicit worker count on the command line to go higher, with temps monitored.
  const workers = Number(process.argv[3] ?? Math.max(1, Math.floor(os.cpus().length / 4)))
  const gamesPerRound = Number(process.argv[4] ?? 5)
  const evalEveryNRounds = Number(process.argv[5] ?? 5)
  const numRounds = Math.ceil(totalGames / (workers * gamesPerRound))

  let network = loadNetworkFrom(CHECKPOINT_PATH)
  if (network) console.log(`Resuming from checkpoint: ${CHECKPOINT_PATH}`)
  else {
    console.log('No checkpoint found, starting from a fresh network.')
    network = createFreshNetwork(Date.now() % 2 ** 31)
  }
  saveNetworkTo(CHECKPOINT_PATH, network)

  console.log(`Parallel training: ${totalGames} games target, ${workers} workers, ${gamesPerRound} games/round/worker, ${numRounds} rounds.`)
  const startTime = Date.now()
  let gamesPlayed = 0
  let bestWinRate = -1

  // best.json may already exist from a prior run — don't treat a fresh run's first eval as
  // automatically "the best" if a stronger checkpoint is already sitting on disk.
  const existingBest = loadNetworkFrom(BEST_CHECKPOINT_PATH)
  if (existingBest) {
    bestWinRate = runEvalReport(existingBest, 9_000_000)
    console.log(`Existing best.json winrate: ${(bestWinRate * 100).toFixed(1)}%`)
  }

  for (let round = 0; round < numRounds; round++) {
    const outputPaths = Array.from({ length: workers }, (_, w) => workerOutputPath(w))
    await Promise.all(
      outputPaths.map((outputPath, w) => runWorker(gamesPerRound, CHECKPOINT_PATH, outputPath, round * workers + w)),
    )

    const workerNetworks = outputPaths.map(p => loadNetworkFrom(p)!)
    network = averageNetworks(workerNetworks)
    saveNetworkTo(CHECKPOINT_PATH, network)

    gamesPlayed += workers * gamesPerRound
    const elapsedSec = (Date.now() - startTime) / 1000
    console.log(`[round ${round + 1}/${numRounds}] ~${gamesPlayed} games played (${elapsedSec.toFixed(1)}s elapsed, ${(gamesPlayed / elapsedSec).toFixed(2)} games/s)`)
    if ((round + 1) % evalEveryNRounds === 0 || round + 1 === numRounds) {
      const winRate = runEvalReport(network, 5_000_000 + round)
      if (winRate > bestWinRate) {
        bestWinRate = winRate
        saveNetworkTo(BEST_CHECKPOINT_PATH, network)
        console.log(`  new best (${(winRate * 100).toFixed(1)}%) saved to ${BEST_CHECKPOINT_PATH}`)
      } else {
        console.log(`  no improvement (best so far: ${(bestWinRate * 100).toFixed(1)}%) — best.json left untouched`)
      }
    }
  }

  console.log('Parallel training complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
