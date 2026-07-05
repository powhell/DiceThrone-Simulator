// Runner de calibration contrefactuelle. Parallélise sur worker_threads, écrit un JSONL
// par bras dans calibration/results/ (reprise automatique : les (seating,seed) déjà
// présents sont sautés). Usage :
//   node calibration/run.mjs [--seeds 1800] [--workers 8]
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { Worker } from 'worker_threads'
import { ARMS } from './arms.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const resultsDir = path.join(here, 'results')
fs.mkdirSync(resultsDir, { recursive: true })

const argv = process.argv.slice(2)
const argVal = (name, dflt) => {
  const i = argv.indexOf('--' + name)
  return i >= 0 ? +argv[i + 1] : dflt
}
const N_SEEDS = argVal('seeds', 1800)
// Conservateur par défaut : 1/3 des cœurs, cap 8 (longue durée, machine utilisée à côté).
const N_WORKERS = argVal('workers', Math.min(8, Math.max(2, Math.floor(os.cpus().length / 3))))
const CHUNK = 20

// ---- construit la liste des tâches restantes (reprise) ----
const done = new Map() // arm -> Set("seating:seed")
for (const arm of Object.keys(ARMS)) {
  const f = path.join(resultsDir, arm + '.jsonl')
  const set = new Set()
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      if (!line) continue
      try { const r = JSON.parse(line); set.add(r.seating + ':' + r.seed) } catch (e) {}
    }
  }
  done.set(arm, set)
}

const tasks = []
for (const arm of Object.keys(ARMS)) {
  for (const seating of [0, 1]) {
    let batch = []
    for (let seed = 1; seed <= N_SEEDS; seed++) {
      if (done.get(arm).has(seating + ':' + seed)) continue
      batch.push(seed)
      if (batch.length === CHUNK) { tasks.push({ arm, seating, seeds: batch }); batch = [] }
    }
    if (batch.length) tasks.push({ arm, seating, seeds: batch })
  }
}
// Mélange les tâches pour que la progression couvre tous les bras uniformément
// (un arrêt en cours de route laisse quand même des paires analysables partout).
for (let i = tasks.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1)); [tasks[i], tasks[j]] = [tasks[j], tasks[i]]
}

const totalGames = tasks.reduce((a, t) => a + t.seeds.length, 0)
const alreadyDone = [...done.values()].reduce((a, s) => a + s.size, 0)
console.log(`bras=${Object.keys(ARMS).length} seeds=${N_SEEDS} seatings=2 -> ${Object.keys(ARMS).length * N_SEEDS * 2} parties au total`)
console.log(`déjà faites=${alreadyDone} restantes=${totalGames} workers=${N_WORKERS}`)
if (!totalGames) { console.log('Tout est déjà calculé.'); process.exit(0) }

const streams = new Map() // arm -> WriteStream (append)
const streamFor = arm => {
  if (!streams.has(arm)) streams.set(arm, fs.createWriteStream(path.join(resultsDir, arm + '.jsonl'), { flags: 'a' }))
  return streams.get(arm)
}

let doneGames = 0, ti = 0
const t0 = Date.now()
let lastPrint = 0

let active = 0
for (let k = 0; k < N_WORKERS; k++) {
  const w = new Worker(path.join(here, 'worker.mjs'))
  active++
  w.on('message', results => {
    for (const r of results) streamFor(r.arm).write(JSON.stringify(r) + '\n')
    doneGames += results.length
    const now = Date.now()
    if (now - lastPrint > 30000) {
      lastPrint = now
      const rate = doneGames / ((now - t0) / 1000)
      const eta = (totalGames - doneGames) / rate
      console.log(`${doneGames}/${totalGames} parties · ${rate.toFixed(1)}/s · ETA ${(eta / 3600).toFixed(2)} h`)
    }
    if (ti < tasks.length) w.postMessage(tasks[ti++])
    else { w.terminate(); if (--active === 0) finish() }
  })
  w.on('error', e => { console.error('worker error:', e); process.exit(1) })
  w.postMessage(tasks[ti++])
  if (ti >= tasks.length) break
}

function finish() {
  for (const s of streams.values()) s.end()
  console.log(`FINI : ${doneGames} parties en ${((Date.now() - t0) / 3600000).toFixed(2)} h. Analyse : node calibration/analyze.mjs`)
}
