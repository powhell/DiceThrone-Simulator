// Passe de confirmation post-calibration jetons mb (2026-07-17) : mb vs bw, greedy des 2 côtés,
// valeurs marginales calibrées dans le bundle. Baseline pré-calibration : 47,5 % (3 600 parties).
// Usage : node calibration/confirm_mb.mjs [--n 5000] [--workers 4]
// Résultats appendus dans calibration/results_mb/confirm.jsonl (reprise auto sur les seeds déjà faits).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'

const self = fileURLToPath(import.meta.url)
const root = path.dirname(path.dirname(self))
const OUT = path.join(root, 'calibration/results_mb/confirm.jsonl')

if (!isMainThread) {
  const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
  const pol = G.greedyHighestDamagePolicy
  for (const seed of workerData.seeds) {
    const seating = seed % 2
    const [hA, hB] = seating === 0 ? ['mb', 'bw'] : ['bw', 'mb']
    const r = G.runMatch(hA, hB, seed, [pol, pol])
    const mbIdx = seating === 0 ? 0 : 1
    const res = r.winner === mbIdx ? 'W' : r.winner === 1 - mbIdx ? 'L' : r.finalState.gameOver ? 'D' : 'T'
    parentPort.postMessage({ seed, res, turns: r.turns })
  }
  process.exit(0)
}

const argVal = (name, dflt) => {
  const i = process.argv.indexOf('--' + name)
  return i >= 0 ? Number(process.argv[i + 1]) : dflt
}
const N = argVal('n', 5000)
const N_WORKERS = argVal('workers', 4)

const done = new Set()
if (fs.existsSync(OUT)) for (const l of fs.readFileSync(OUT, 'utf8').split('\n')) {
  if (l.trim()) done.add(JSON.parse(l).seed)
}
const todo = []
for (let s = 1; s <= N; s++) if (!done.has(s)) todo.push(s)
console.log(`confirm mb : ${N} parties, déjà faites=${done.size}, restantes=${todo.length}, workers=${N_WORKERS}`)

const chunks = Array.from({ length: N_WORKERS }, () => [])
todo.forEach((s, i) => chunks[i % N_WORKERS].push(s))
const t0 = Date.now()
let finished = 0
let alive = 0
for (const seeds of chunks) {
  if (!seeds.length) continue
  alive++
  const w = new Worker(self, { workerData: { seeds } })
  w.on('message', m => {
    fs.appendFileSync(OUT, JSON.stringify(m) + '\n')
    finished++
    if (finished % 250 === 0) {
      const rate = finished / ((Date.now() - t0) / 1000)
      console.log(`${finished}/${todo.length} · ${rate.toFixed(1)}/s · ETA ${((todo.length - finished) / rate / 60).toFixed(0)} min`)
    }
  })
  w.on('exit', () => { if (--alive === 0) report() })
}
if (alive === 0) report()

function report() {
  let w = 0, l = 0, d = 0, t = 0
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line).res
    if (r === 'W') w++
    else if (r === 'L') l++
    else if (r === 'D') d++
    else t++
  }
  const wr = 100 * w / (w + l)
  const moe = 196 * Math.sqrt(wr / 100 * (1 - wr / 100) / (w + l))
  console.log(`FINI : ${w + l + d + t} parties · mb ${wr.toFixed(1)}% ± ${moe.toFixed(1)} (${w}W/${l}L) · nuls=${d} · timeouts=${t}`)
  console.log(`baseline pré-calibration : 47.5% ± 1.7 (3600 parties)`)
}
