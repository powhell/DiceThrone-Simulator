// Chaîne de générations AlphaZero (Phase 5) avec GATING (plan §3) : le candidat n'est promu
// champion que s'il gagne > 50 % de ses parties de gate ; sinon le champion reste et on
// régénère de nouvelles données avec lui (le candidat rejeté est archivé). Entraînement sur un
// TAMPON DE REJEU : les fichiers d'expérience des BUFFER_GENS dernières rondes.
// État persistant : weights2/champion.json (copie du champion courant) + chain_log.jsonl.
//
// Usage : node chain2.mjs <rounds=3> <workers=3> <gamesPerWorker=10> <sims=100> <gateGames=2>
import { spawn } from 'node:child_process'
import * as os from 'node:os'
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
    // priorité basse : les enfants héritent de BELOW_NORMAL sous Windows → la machine reste utilisable
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL) } catch {}
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

// Borne basse de l'intervalle de Wilson 95 % (même formule que bench.ts). Sert de garde
// ANTI-BRUIT au gating : on ne promeut que si tout l'IC est au-dessus du seuil (le candidat
// est significativement meilleur), pas si le simple winrate dépasse 0.5 — ce dernier laissait
// passer des promotions dans le bruit (marche aléatoire du champion, 6 fausses promotions la
// nuit du 18-19 : winrates 0.45-0.58 sur ~80 parties, IC ±11 %).
function wilsonLow(wins, n, z = 1.96) {
  if (n === 0) return 0
  const p = wins / n, z2 = z * z, denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / denom
  return Math.max(0, center - half)
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

  // 1. self-play avec le CHAMPION (reprise : on saute les fichiers déjà produits par une ronde interrompue)
  await Promise.all(Array.from({ length: workers }, (_, i) => {
    const outFile = path.join(here, 'exp2', `round${round}_w${i}.dtx2`)
    if (fs.existsSync(outFile)) { console.log(`[selfplay r${round}w${i}] existe déjà — sauté`); return Promise.resolve('') }
    const [cmd, args] = tsx(['src/sim/search/selfplay2.ts', champPath, outFile,
      String(gamesPerWorker), String(sims), String(50_000 + round * 1000 + i * 100)])
    return run(cmd, args, engine, `selfplay r${round}w${i}`)
  }))

  // 2. entraînement sur le tampon (BUFFER_GENS dernières rondes)
  const expPatterns = []
  for (let r = Math.max(0, round - BUFFER_GENS + 1); r <= round; r++) {
    expPatterns.push(path.join(here, 'exp2', `round${r}_*.dtx2`))
  }
  const candPath = path.join(here, 'weights2', `cand_r${round}.json`)
  if (fs.existsSync(candPath)) console.log(`[train2 r${round}] cand_r${round}.json existe déjà — sauté`)
  else await run(py, ['train.py', 'train2', '--net', champPath, '--exp', ...expPatterns,
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
  // Anti-bruit (diagnostic 07-19) : borne basse de Wilson > seuil (défaut 0.5) → on exige que
  // tout l'IC 95 % soit au-dessus de 50 %, donc une VRAIE amélioration, pas du bruit. Remplace
  // l'ancien `winrate > 0.5` qui promouvait sur des pièces à pile ou face. Pour que ce gate
  // laisse passer les vrais gains, il faut ASSEZ de parties de gate (sinon rien ne promeut —
  // c'est voulu : mieux vaut un champion figé qu'un champion qui dérive au hasard).
  const wLow = wilsonLow(aW, dec)
  const promoted = wLow > +(process.env.GATE_WR ?? 0.5)
  if (promoted) {
    fs.copyFileSync(candPath, champPath)
    fs.copyFileSync(candPath, path.join(here, 'weights2', `champion_r${round}.json`))
  }
  const entry = {
    round, candidateWins: aW, championWins: bW, nulls: nu,
    winrate: Number(winrate.toFixed(3)), wilsonLow: Number(wLow.toFixed(3)), promoted,
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
