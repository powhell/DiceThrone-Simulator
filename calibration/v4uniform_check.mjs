// Lit results_v4uniform/games.jsonl (le checkpoint) et affiche le score À TOUT MOMENT —
// même pendant la run, même après un kill (sur les parties déjà jouées).
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// sims en 1er argument (défaut 500) : node calibration/v4uniform_check.mjs 800
const here = path.dirname(fileURLToPath(import.meta.url))
const SIMS = Number(process.argv[2] ?? 500)
const f = path.join(here, 'results_v4uniform', `games_s${SIMS}.jsonl`)
console.log(`(sims ${SIMS})`)
if (!fs.existsSync(f)) { console.log(`Aucun checkpoint encore pour sims ${SIMS}.`); process.exit(0) }

let a = 0, b = 0, nu = 0
for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
  if (!line) continue
  try { const r = JSON.parse(line).r; if (r === 'A') a++; else if (r === 'B') b++; else nu++ } catch {}
}
const dec = a + b, wr = dec ? a / dec : 0
function wilson(w, n, z = 1.96) { if (!n) return [0, 1]; const p = w / n, z2 = z * z, d = 1 + z2 / n; const c = (p + z2 / (2 * n)) / d; const h = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / d; return [Math.max(0, c - h), Math.min(1, c + h)] }
const [lo, hi] = wilson(a, dec)
console.log(`Parties jouées : ${a + b + nu}  (A=v4-uniforme ${a} · B=value-greedy ${b} · nuls ${nu})`)
console.log(`v4-uniforme vs value-greedy : ${(wr * 100).toFixed(1)}%   IC95 ${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(1)}%`)
console.log(`Verdict : ${dec < 200 ? 'pas encore assez de parties (vise 400+)' : lo > 0.5 ? '>50% -> on bat value-greedy' : wr >= 0.42 ? 'nettement > 33% -> les priors warm nuisaient' : wr >= 0.36 ? 'gain marginal' : '~33% -> on plafonne, value-greedy reste devant'}`)
