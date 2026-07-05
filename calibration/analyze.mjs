// Analyse des résultats de calibration (design apparié par (seating,seed)).
//   node calibration/analyze.mjs
// Valeur d'un actif en équivalent-dégâts = Δwin(actif) / Δwin(1 PV du même héros).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { armHero } from './arms.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const resultsDir = path.join(here, 'results')

function load(arm) {
  const f = path.join(resultsDir, arm + '.jsonl')
  const map = new Map() // "seating:seed" -> record
  if (!fs.existsSync(f)) return map
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line) continue
    try { const r = JSON.parse(line); map.set(r.seating + ':' + r.seed, r) } catch (e) {}
  }
  return map
}

// Δ moyen (score du héros `hero`) entre deux bras, apparié par seed. SE = sd/sqrt(n).
function pairedDelta(treatArm, ctrlArm, hero) {
  const t = load(treatArm), c = load(ctrlArm)
  const diffs = []
  for (const [k, rt] of t) {
    const rc = c.get(k)
    if (!rc) continue
    const st = hero === 'hh' ? rt.hhScore : 1 - rt.hhScore
    const sc = hero === 'hh' ? rc.hhScore : 1 - rc.hhScore
    diffs.push(st - sc)
  }
  const n = diffs.length
  if (!n) return null
  const mean = diffs.reduce((a, b) => a + b, 0) / n
  const varr = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)
  return { mean, se: Math.sqrt(varr / n), n }
}

const fmtPct = d => d == null ? '—' : `${(d.mean * 100).toFixed(2)}% ± ${(d.se * 100).toFixed(2)} (n=${d.n})`

// ---- étalons PV ----
const hpHH = pairedDelta('hh_hp4', 'base', 'hh')
const hpBW = pairedDelta('bw_hp4', 'base', 'bw')
const perHP = { hh: hpHH && { mean: hpHH.mean / 4, se: hpHH.se / 4 }, bw: hpBW && { mean: hpBW.mean / 4, se: hpBW.se / 4 } }
console.log('=== Étalons (valeur d\'1 PV en win-rate) ===')
console.log(`HH +4 PV : Δwin ${fmtPct(hpHH)}  -> 1 PV = ${hpHH ? (hpHH.mean / 4 * 100).toFixed(2) + '%' : '—'}`)
console.log(`BW +4 PV : Δwin ${fmtPct(hpBW)}  -> 1 PV = ${hpBW ? (hpBW.mean / 4 * 100).toFixed(2) + '%' : '—'}`)

function dmgEquiv(d, hero) {
  const hp = perHP[hero]
  if (!d || !hp || Math.abs(hp.mean) < 1e-9) return null
  const v = d.mean / hp.mean
  const rel = Math.sqrt((d.se / d.mean) ** 2 + (hp.se / hp.mean) ** 2)
  return { v, se: Math.abs(v) * (isFinite(rel) ? rel : 0) }
}
const fmtV = e => e == null ? '—' : `${e.v.toFixed(2)} ± ${e.se.toFixed(2)}`

// ---- échelle Dreadful ----
console.log('\n=== Échelle Dreadful (marginal du jeton n, encodé MARGINAL_VALUE=[3,3,3,5,0.5]) ===')
const CURRENT = [3.0, 3.0, 3.0, 5.0, 0.5]
for (let d = 0; d < 5; d++) {
  const delta = pairedDelta(`hh_dread${d + 1}`, `hh_dread${d}`, 'hh')
  const eq = dmgEquiv(delta, 'hh')
  console.log(`jeton ${d + 1} (${d}->${d + 1}) : Δwin ${fmtPct(delta)} -> ${fmtV(eq)} dmg-equiv (encodé ${CURRENT[d]})`)
}

// ---- autres actifs ----
console.log('\n=== Autres actifs (vs base) ===')
const OTHERS = [
  ['hh_cp1',     'CP (HH)',            1.5],
  ['hh_card1',   'pioche 1 (HH)',      2.0],
  ['hh_grim1',   'Grim Pursuit',       1.66],
  ['hh_tb1',     'Time Bomb infligée', 2.8],
  ['bw_cp1',     'CP (BW)',            1.5],
  ['bw_card1',   'pioche 1 (BW)',      2.0],
  ['bw_agility1','Agility',            2.0],
  ['bw_covert1', 'Covert Ops',         1.5],
]
for (const [arm, label, enc] of OTHERS) {
  const hero = armHero(arm)
  const delta = pairedDelta(arm, 'base', hero)
  const eq = dmgEquiv(delta, hero)
  console.log(`${label.padEnd(20)}: Δwin ${fmtPct(delta)} -> ${fmtV(eq)} dmg-equiv (encodé ${enc})`)
}

// ---- santé du run ----
const base = load('base')
let to = 0, draws = 0, hhw = 0
for (const r of base.values()) { if (r.timeout) to++; else if (r.hhScore === 0.5) draws++; if (r.hhScore === 1) hhw++ }
console.log(`\nbase : ${base.size} parties · HH gagne ${(100 * hhw / Math.max(1, base.size)).toFixed(1)}% · nuls ${draws} · timeouts ${to}`)
