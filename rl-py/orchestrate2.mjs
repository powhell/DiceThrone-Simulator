// Orchestrateur d'UNE génération de la boucle AlphaZero (Phase 5) :
//   1. self-play : W workers MCTS(genN) en parallèle -> exp2/genN_*.dtx2
//   2. train2    : genN + expérience -> genN+1 (PyTorch, CUDA si dispo)
//   3. gate      : MCTS(genN+1) vs MCTS(genN) en G parties (paires miroir, Wilson)
// Imprime GEN_RESULT (json) à la fin. Détaché de Claude — relançable tel quel.
//
// Usage : node orchestrate2.mjs <gen> [workers=3] [gamesPerWorker=10] [sims=100] [gateGames=2]
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const engine = path.join(here, '..', 'engine-ts')
const py = path.join(here, 'venv', 'Scripts', 'python.exe')
// Node >= 20 sur Windows : spawn('npx.cmd') sans shell => EINVAL. On invoque node directement
// sur le CLI de tsx installé dans engine-ts.
const tsxCli = path.join(engine, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const tsx = (args) => [process.execPath, [tsxCli, ...args]]

const [genArg, wArg, gArg, sArg, ggArg] = process.argv.slice(2)
const gen = Number(genArg ?? 0)
const workers = Number(wArg ?? 3)
const gamesPerWorker = Number(gArg ?? 10)
const sims = Number(sArg ?? 100)
const gateGames = Number(ggArg ?? 2) // par matchup et par worker de gate

const netN = path.join(here, 'weights2', `gen${gen}.json`)
const netN1 = path.join(here, 'weights2', `gen${gen + 1}.json`)
if (!fs.existsSync(netN)) { console.error(`réseau manquant : ${netN}`); process.exit(1) }
fs.mkdirSync(path.join(here, 'exp2'), { recursive: true })

function run(cmd, args, cwd, tag) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: false })
    let out = ''
    p.stdout.on('data', d => { out += d })
    p.stderr.on('data', d => { out += d })
    p.on('close', code => {
      const tail = out.split('\n').filter(l => l.trim()).slice(-2).join(' | ')
      console.log(`[${tag}] exit=${code} ${tail}`)
      code === 0 ? resolve(out) : reject(new Error(`${tag} exit ${code}: ${tail}`))
    })
  })
}

const t0 = Date.now()
console.log(`=== génération ${gen} -> ${gen + 1} : ${workers} workers × ${gamesPerWorker} parties à ${sims} sims`)

// 1. self-play en parallèle
await Promise.all(Array.from({ length: workers }, (_, i) => {
  const [cmd, args] = tsx(['src/sim/search/selfplay2.ts', netN,
    path.join(here, 'exp2', `gen${gen}_w${i}.dtx2`),
    String(gamesPerWorker), String(sims), String(1000 * (gen + 1) + i * 100)])
  return run(cmd, args, engine, `selfplay w${i}`)
}))
console.log(`self-play fini (${((Date.now() - t0) / 60000).toFixed(1)} min)`)

// 2. entraînement
await run(py, ['train.py', 'train2', '--net', netN,
  '--exp', path.join(here, 'exp2', `gen${gen}_*.dtx2`),
  '--out', netN1, '--epochs', '4', '--batch', '512'], here, 'train2')

// 2b. parité (le contrat ne doit jamais dériver)
await run(py, ['train.py', 'parity2', '--net', netN1, '--out', path.join(here, 'exp2', 'parity_gate.json'), '--n', '4'], here, 'parity2-gen')
{
  const [cmd, args] = tsx(['src/sim/rl/checkParity2.ts', netN1, path.join(here, 'exp2', 'parity_gate.json')])
  await run(cmd, args, engine, 'checkParity2')
}

// 3. gate genN+1 vs genN (workers en parallèle, graines distinctes)
const gateOuts = await Promise.all(Array.from({ length: workers }, (_, i) => {
  const [cmd, args] = tsx(['src/sim/search/gate3.ts', netN1, netN,
    String(gateGames), String(sims), String(9000 * (gen + 1) + i * 50)])
  return run(cmd, args, engine, `gate w${i}`)
}))
let aW = 0, bW = 0, nu = 0
for (const out of gateOuts) {
  const m = out.match(/RESULT (\{.*\})/)
  if (m) { const r = JSON.parse(m[1]); aW += r.aWins; bW += r.bWins; nu += r.nulls }
}
const dec = aW + bW
console.log('GEN_RESULT ' + JSON.stringify({
  gen: gen + 1, candidateWins: aW, championWins: bW, nulls: nu,
  winrate: dec ? aW / dec : 0.5,
  minutes: Number(((Date.now() - t0) / 60000).toFixed(1)),
}))
