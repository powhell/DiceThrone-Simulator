// Solveur EXACT du premier lancer, générique par héros et PAR MATCHUP.
// Même DP que engine/evaluator.py (HH) mais la valeur terminale vient de fullAbilityBoard :
// EV nette de la meilleure habileté (dégâts + jetons gagnés − ce que la défense ADVERSE
// prévient/renvoie, valeurs calibrées). Donc la politique de garde est exacte CONTRE cet
// adversaire précis — c'est ce qui rend les tables de fiche non triviales.
// Usage : node calibration/first_roll_dp.mjs <me> <opp> [outfile.json]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()

const me = process.argv[2] || 'bw'
const opp = process.argv[3] || 'hh'
const outFile = process.argv[4] || path.join(root, 'calibration', `firstroll_${me}_vs_${opp}.json`)

// État de départ standard (tour 1, jetons de setup, aucune upgrade posée).
const state = G.createInitialGameState(me, opp)
const self = state.players[0], enemy = state.players[1]
const st = G.oracleStateFor(self, enemy)

// ---- valeur terminale : meilleure habileté nette pour 5 dés donnés ----
const termCache = new Map()
function terminal(dice5) {
  const key = dice5.join('')
  let v = termCache.get(key)
  if (v === undefined) {
    const rows = G.fullAbilityBoard(me, dice5, st).filter(r => r.matched)
    v = rows.length ? Math.max(...rows.map(r => r.value)) : 0
    termCache.set(key, v)
  }
  return v
}
function terminalName(dice5) {
  const rows = G.fullAbilityBoard(me, dice5, st).filter(r => r.matched)
  if (!rows.length) return 'Whiff'
  return rows.reduce((a, b) => (b.value > a.value ? b : a)).name
}

// ---- énumérations précalculées ----
const OUTCOMES = [[[]]]
for (let n = 1; n <= 5; n++) {
  const prev = OUTCOMES[n - 1], cur = []
  for (const o of prev) for (let f = 1; f <= 6; f++) cur.push([...o, f])
  OUTCOMES.push(cur)
}
const SUBSETS = [] // indices 0..4, les 32 sous-ensembles
for (let m = 0; m < 32; m++) {
  const idx = []
  for (let i = 0; i < 5; i++) if (m & (1 << i)) idx.push(i)
  SUBSETS.push(idx)
}

// ---- DP mémoïsée ----
const memo = new Map()
function evalState(kept, rollsLeft) { // kept trié
  if (rollsLeft === 0) return terminal(kept)
  const key = kept.join('') + ':' + rollsLeft
  let v = memo.get(key)
  if (v !== undefined) return v
  const n = 5 - kept.length
  const prob = Math.pow(1 / 6, n)
  let total = 0
  for (const o of OUTCOMES[n]) {
    const full = [...kept, ...o].sort()
    total += prob * bestKeepEv(full, rollsLeft - 1)
  }
  memo.set(key, total)
  return total
}
const bkCache = new Map()
function bestKeepEv(full, rollsLeft) { // full = 5 dés triés
  if (rollsLeft === 0) return terminal(full)
  const key = full.join('') + ':' + rollsLeft
  let v = bkCache.get(key)
  if (v !== undefined) return v
  let best = -Infinity
  for (const idx of SUBSETS) {
    const kept = idx.map(i => full[i]).sort()
    const ev = evalState(kept, rollsLeft)
    if (ev > best) best = ev
  }
  bkCache.set(key, best)
  return v = best
}
function bestKeep(full, rollsLeft) {
  let best = -Infinity, keep = full
  for (const idx of SUBSETS) {
    const kept = idx.map(i => full[i]).sort()
    const ev = evalState(kept, rollsLeft)
    if (ev > best + 1e-12) { best = ev; keep = kept }
  }
  return { keep, ev: best }
}

// ---- distribution des cibles finales sous politique optimale ----
const distCache = new Map()
function distribution(kept, rollsLeft) {
  const key = kept.join('') + ':' + rollsLeft
  let d = distCache.get(key)
  if (d) return d
  d = {}
  if (rollsLeft === 0) { d[terminalName(kept)] = 1 }
  else {
    const n = 5 - kept.length
    const prob = Math.pow(1 / 6, n)
    for (const o of OUTCOMES[n]) {
      const full = [...kept, ...o].sort()
      const { keep } = bestKeep(full, rollsLeft - 1)
      const sub = distribution(keep, rollsLeft - 1)
      for (const [k, p] of Object.entries(sub)) d[k] = (d[k] || 0) + prob * p
    }
  }
  distCache.set(key, d)
  return d
}

// ---- balayage des 252 mains initiales ----
function* multisets() {
  for (let a = 1; a <= 6; a++) for (let b = a; b <= 6; b++) for (let c = b; c <= 6; c++)
    for (let d = c; d <= 6; d++) for (let e = d; e <= 6; e++) yield [a, b, c, d, e]
}
function weight(h) {
  const cnt = {}
  for (const v of h) cnt[v] = (cnt[v] || 0) + 1
  let w = 120
  for (const c of Object.values(cnt)) for (let i = 2; i <= c; i++) w /= i
  return w
}

const t0 = Date.now()
const rows = []
const agg = {}
let tot = 0, evSum = 0
for (const hand of multisets()) {
  const { keep, ev } = bestKeep(hand, 2)
  const dist = distribution(keep, 2)
  const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, p]) => [k, +p.toFixed(3)])
  const w = weight(hand)
  tot += w; evSum += ev * w
  for (const [k, p] of Object.entries(dist)) agg[k] = (agg[k] || 0) + w * p
  rows.push({ hand, keep, ev: +ev.toFixed(2), targets: top })
}
console.log(`=== ${me} vs ${opp} — politique exacte du 1er lancer (valeur nette CONTRE la défense ${opp})`)
console.log(`EV moyen d'un tour : ${(evSum / tot).toFixed(2)}`)
console.log('Cibles finales sous politique optimale :')
for (const [k, v] of Object.entries(agg).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k.padEnd(28)} ${(100 * v / tot).toFixed(1)}%`)
}
fs.writeFileSync(outFile, JSON.stringify({ me, opp, rows }, null, 0))
console.log(`252 mains -> ${outFile} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
