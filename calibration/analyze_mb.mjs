// Analyse de la vague « jetons Mythic Brawler » (CALIB_SET=mb, results_mb/).
//   node calibration/analyze_mb.mjs
// Design apparié par (seating,seed). Valeur en équivalent-dégâts = Δwin / Δwin(1 PV de mb).
// Marginaux d'échelle : ocean2 vs ocean1, mountain2 vs mountain1, sky2 vs sky1 (le jeton n
// se lit contre le bras n-1, pas contre la base).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const resultsDir = path.join(here, 'results_mb')

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

// hhScore = score du PREMIER héros du matchup = mb (armMatchup: ['mb','bw']).
function pairedDelta(treatArm, ctrlArm) {
  const t = load(treatArm), c = load(ctrlArm)
  const diffs = []
  for (const [k, rt] of t) {
    const rc = c.get(k)
    if (rc) diffs.push(rt.hhScore - rc.hhScore)
  }
  const n = diffs.length
  if (!n) return null
  const mean = diffs.reduce((a, b) => a + b, 0) / n
  const varr = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n - 1)
  return { mean, se: Math.sqrt(varr / n), n }
}

const fmtPct = d => d == null ? '—' : `${(d.mean * 100).toFixed(2)}% ± ${(d.se * 100).toFixed(2)} (n=${d.n})`

const hp = pairedDelta('mb_hp4', 'base_mb')
const perHP = hp && { mean: hp.mean / 4, se: hp.se / 4 }
console.log('=== Étalon ===')
console.log(`mb +4 PV : Δwin ${fmtPct(hp)}  -> 1 PV = ${hp ? (perHP.mean * 100).toFixed(2) + '%' : '—'}`)

function dmgEquiv(d) {
  if (!d || !perHP || Math.abs(perHP.mean) < 1e-9) return null
  const v = d.mean / perHP.mean
  const rel = Math.sqrt((d.se / d.mean) ** 2 + (perHP.se / perHP.mean) ** 2)
  return { v, se: Math.abs(v) * (isFinite(rel) ? rel : 0) }
}
const fmtV = e => e == null ? '—' : `${e.v.toFixed(2)} ± ${e.se.toFixed(2)}`

console.log('\n=== Jetons (marginaux, en équivalent-dégâts) — encodés dans mythicbrawler/constants.ts ===')
const ROWS = [
  ['mb_cp1', 'base_mb', '+1 CP (référence)', '—'],
  ['mb_ocean1', 'base_mb', 'Ocean jeton 1', 'OCEAN_VALUE=1.1'],
  ['mb_ocean2', 'mb_ocean1', 'Ocean jeton 2 (marginal)', ''],
  ['mb_ocean3', 'mb_ocean2', 'Ocean jeton 3 (marginal)', ''],
  ['mb_mountain1', 'base_mb', 'Mountain jeton 1', 'MOUNTAIN_VALUE=1.5'],
  ['mb_mountain2', 'mb_mountain1', 'Mountain jeton 2 (marginal)', ''],
  ['mb_sky1', 'base_mb', 'Sky jeton 1', 'SKY_VALUE=1.2'],
  ['mb_sky2', 'mb_sky1', 'Sky jeton 2 (marginal)', ''],
  ['mb_concopp1', 'base_mb', 'Concussion infligée', 'CONCUSSION_VALUE=1.8'],
]
for (const [arm, ctrl, label, enc] of ROWS) {
  const d = pairedDelta(arm, ctrl)
  console.log(`${label.padEnd(28)}: Δwin ${fmtPct(d)} -> ${fmtV(dmgEquiv(d))} dmg-equiv${enc ? `  (encodé ${enc})` : ''}`)
}

const base = load('base_mb')
let to = 0, draws = 0, w = 0
for (const r of base.values()) { if (r.timeout) to++; else if (r.hhScore === 0.5) draws++; if (r.hhScore === 1) w++ }
console.log(`\nbase_mb : ${base.size} parties · mb gagne ${(100 * w / Math.max(1, base.size)).toFixed(1)}% vs bw · nuls ${draws} · timeouts ${to}`)
