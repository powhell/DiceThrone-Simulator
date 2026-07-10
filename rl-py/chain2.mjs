// Chaîne de générations AlphaZero (Phase 5) avec GATING (plan §3) : le candidat n'est promu
// champion que s'il gagne > 50 % de ses parties de gate ; sinon le champion reste et on
// régénère de nouvelles données avec lui (le candidat rejeté est archivé). Entraînement sur un
// TAMPON DE REJEU : les fichiers d'expérience des BUFFER_GENS dernières rondes.
// État persistant : weights2/champion.json (copie du champion courant) + chain_log.jsonl.
//
// Usage : node chain2.mjs <rounds=3> <workers=3> <gamesPerWorker=10> <sims=100> <gateGames=2>
import { spawn } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const engine = path.join(here, '..', 'engine-ts')
const py = path.join(here, 'venv', 'Scripts', 'python.exe')
const tsxCli = path.join(engine, 'node_modules', 'tsx', 'dist', 'cli.mjs')

const [rArg, wArg, gArg, sArg, ggArg] = process.argv.slice(2)
const rounds = Number(rArg ?? 3)
const workers = Number(wArg ?? 3)
const gamesPerWorker = Number(gArg ?? 10)
const sims = Number(sArg ?? 100)
const gateGames = Number(ggArg ?? 2)
const BUFFER_GENS = 3

const champPath = path.join(here, 'weights2', 'champion.json')
if (!fs.existsSync(champPath)) {
  fs.copyFileSync(path.join(here, 'weights2', 'gen0.json'), champPath)
  console.log('champion initialisé depuis gen0.json')
}
fs.mkdirSync(path.join(here, 'exp2'), { recursive: true })

function run(cmd, args, cwd, tag) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: false })
    let out = ''
    p.stdout.on('data', d => { out += d })
    p.stderr.on('data', d => { out += d })
    p.on('close', code => {
      const tail = out.split('\n').filter(l => l.trim()).slice(-1).join('')
      console.log(`[${tag}] exit=${code} ${tail.slice(0, 220)}`)
      code === 0 ? resolve(out) : reject(new Error(`${tag} exit ${code}`))
    })
  })
}
const tsx = (args) => [process.execPath, [tsxCli, ...args]]

function log(entry) {
  fs.appendFileSync(path.join(here, 'chain_log.jsonl'), JSON.stringify(entry) + '\n')
}

let round0 = 0
// reprend la numérotation là où le log s'était arrêté (relançable)
const logPath = path.join(here, 'chain_log.jsonl')
if (fs.existsSync(logPath)) {
  const lines = fs.readFileSync(logPath, 'utf-8').trim().split('\n')
  if (lines.length && lines[lines.length - 1]) round0 = JSON.parse(lines[lines.length - 1]).round + 1
}

for (let round = round0; round < round0 + rounds; round++) {
  const t0 = Date.now()
  console.log(`\n===== ronde ${round} (champion: ${fs.existsSync(champPath) ? 'ok' : 'MANQUANT'})`)

  // 1. self-play avec le CHAMPION
  await Promise.all(Array.from({ length: workers }, (_, i) => {
    const [cmd, args] = tsx(['src/sim/search/selfplay2.ts', champPath,
      path.join(here, 'exp2', `round${round}_w${i}.dtx2`),
      String(gamesPerWorker), String(sims), String(50_000 + round * 1000 + i * 100)])
    return run(cmd, args, engine, `selfplay r${round}w${i}`)
  }))

  // 2. entraînement sur le tampon (BUFFER_GENS dernières rondes)
  const expPatterns = []
  for (let r = Math.max(0, round - BUFFER_GENS + 1); r <= round; r++) {
    expPatterns.push(path.join(here, 'exp2', `round${r}_*.dtx2`))
  }
  const candPath = path.join(here, 'weights2', `cand_r${round}.json`)
  await run(py, ['train.py', 'train2', '--net', champPath, '--exp', ...expPatterns,
    '--out', candPath, '--epochs', '4', '--batch', '512'], here, `train2 r${round}`)

  // 2b. parité
  await run(py, ['train.py', 'parity2', '--net', candPath, '--out', path.join(here, 'exp2', 'parity_chain.json'), '--n', '4'], here, 'parity2')
  { const [cmd, args] = tsx(['src/sim/rl/checkParity2.ts', candPath, path.join(here, 'exp2', 'parity_chain.json')]); await run(cmd, args, engine, 'checkParity2') }

  // 3. gate candidat vs champion
  const outs = await Promise.all(Array.from({ length: workers }, (_, i) => {
    const [cmd, args] = tsx(['src/sim/search/gate3.ts', candPath, champPath,
      String(gateGames), String(sims), String(90_000 + round * 1000 + i * 50)])
    return run(cmd, args, engine, `gate r${round}w${i}`)
  }))
  let aW = 0, bW = 0, nu = 0
  for (const out of outs) {
    const m = out.match(/RESULT (\{.*\})/)
    if (m) { const r = JSON.parse(m[1]); aW += r.aWins; bW += r.bWins; nu += r.nulls }
  }
  const dec = aW + bW
  const winrate = dec ? aW / dec : 0.5
  const promoted = winrate > 0.5
  if (promoted) {
    fs.copyFileSync(candPath, champPath)
    fs.copyFileSync(candPath, path.join(here, 'weights2', `champion_r${round}.json`))
  }
  const entry = {
    round, candidateWins: aW, championWins: bW, nulls: nu,
    winrate: Number(winrate.toFixed(3)), promoted,
    minutes: Number(((Date.now() - t0) / 60000).toFixed(1)),
  }
  // Jalon BASELINE une ronde sur deux : le champion courant vs value-greedy (la vraie métrique
  // de progrès — le gate interne ne mesure que candidat-vs-champion).
  if (round % 2 === 1) {
    const outs2 = await Promise.all(Array.from({ length: Math.min(workers, 4) }, (_, i) => {
      const [cmd, args] = tsx(['src/sim/search/gate3.ts', champPath, 'vg',
        String(gateGames), String(sims), String(70_000 + round * 1000 + i * 50)])
      return run(cmd, args, engine, `baseline r${round}w${i}`)
    }))
    let vW = 0, vL = 0, vN = 0
    for (const out of outs2) {
      const m = out.match(/RESULT (\{.*\})/)
      if (m) { const r = JSON.parse(m[1]); vW += r.aWins; vL += r.bWins; vN += r.nulls }
    }
    entry.baseline = { championWins: vW, vgWins: vL, nulls: vN, winrate: Number(((vW + vL) ? vW / (vW + vL) : 0.5).toFixed(3)) }
  }
  log(entry)
  console.log('ROUND_RESULT ' + JSON.stringify(entry))
}
console.log('CHAIN_DONE')
