// Analyse v5 (générique) : chaque bras vs sa base (design apparié par (seating,seed)),
// converti en équivalent-dégâts via l'étalon +4 PV du même héros.
//   node calibration/analyze_v5.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ARMS, armHero, armBase, RESULTS_DIRNAME } from './arms.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const resultsDir = path.join(here, RESULTS_DIRNAME)

function load(arm) {
  const f = path.join(resultsDir, arm + '.jsonl')
  const map = new Map()
  if (!fs.existsSync(f)) return map
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue
    try { const r = JSON.parse(line); map.set(r.seating + ':' + r.seed, r) } catch (e) {}
  }
  return map
}

// hhScore = score du PREMIER héros du matchup. Pour les bras bw_*, le héros mesuré est bw -> 1-score.
function pairedDelta(treatArm, ctrlArm, hero) {
  const t = load(treatArm), c = load(ctrlArm)
  const diffs = []
  for (const [k, rt] of t) {
    const rc = c.get(k)
    if (!rc) continue
    const st = hero === 'bw' ? 1 - rt.hhScore : rt.hhScore
    const sc = hero === 'bw' ? 1 - rc.hhScore : rc.hhScore
    diffs.push(st - sc)
  }
  const n = diffs.length
  if (!n) return null
  const mean = diffs.reduce((a, b) => a + b, 0) / n
  const varr = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)
  return { mean, se: Math.sqrt(varr / n), n }
}

// Étalons 1 PV par héros
const perHP = {}
console.log('=== Étalons (valeur d\'1 PV en points de win-rate) ===')
for (const arm of Object.keys(ARMS)) {
  if (!arm.endsWith('_hp4')) continue
  const hero = armHero(arm)
  const d = pairedDelta(arm, armBase(arm), hero)
  if (d) perHP[hero] = { mean: d.mean / 4, se: d.se / 4 }
  console.log(`${hero} +4 PV : Δwin ${d ? (d.mean * 100).toFixed(2) + '% ± ' + (d.se * 100).toFixed(2) + ' (n=' + d.n + ')' : '—'} -> 1 PV = ${d ? (d.mean / 4 * 100).toFixed(2) + '%' : '—'}`)
}

function dmgEquiv(d, hero) {
  const hp = perHP[hero]
  if (!d || !hp || Math.abs(hp.mean) < 1e-9) return null
  const v = d.mean / hp.mean
  const rel = Math.sqrt((d.se / d.mean) ** 2 + (hp.se / hp.mean) ** 2)
  return { v, se: Math.abs(v) * (isFinite(rel) ? rel : 0) }
}
const fmtV = e => e == null ? '—' : `${e.v.toFixed(2)} ± ${e.se.toFixed(2)}`

console.log('\n=== Valeurs en équivalent-dégâts (mesuré | encodé actuel) ===')
const ENCODED = {
  rv_cp1: 'CP 0.75?', dr_cp1: 'CP 0.75', th_cp1: 'CP 1.3', sm_cp1: 'CP 1.3', py_cp1: 'CP 1.3',
  rv_feather1: 'Feather ~1', rv_feather2: '2 Feathers', rv_nvopp: 'position corbeau (non encodé)',
  dr_ss1: 'SHAPE_SHIFT 1.2', dr_regen1: 'REGEN2 2.2', dr_woundopp1: 'WOUND 1.6',
  th_ek1: 'EK 0.6/jeton', th_ek2: 'EK cumul 2', th_ek4: 'EK cumul 4', th_gb1: 'GB 0.9', th_gb2: 'GB cumul 2', th_mjaway: 'position (non encodé)',
  sm_combo1: 'COMBO 4.0', sm_invis1: 'INVIS 1.5', sm_webbedopp1: 'WEBBED 3.5',
  py_fm1: 'FM 1.0 (x1)', py_fm2: 'FM cumul 2', py_fm3: 'FM cumul 3', py_fm5: 'FM cumul 5',
  py_burnopp1: 'BURN 2.5', py_kdopp1: 'KNOCKDOWN 2.2',
}
for (const arm of Object.keys(ARMS)) {
  if (arm === 'base' || arm.startsWith('base_') || arm.endsWith('_hp4')) continue
  const hero = armHero(arm)
  const d = pairedDelta(arm, armBase(arm), hero)
  const eq = dmgEquiv(d, hero)
  console.log(`${arm.padEnd(15)} Δwin ${d ? ((d.mean * 100).toFixed(2) + '% ± ' + (d.se * 100).toFixed(2)).padEnd(16) : '—'.padEnd(16)} -> ${fmtV(eq).padEnd(14)} (${ENCODED[arm] ?? ''})`)
}
