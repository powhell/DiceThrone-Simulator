// GROS TEST NUIT — MCTS(v4, priors UNIFORMES) vs value-greedy, AVEC CHECKPOINT.
// Chaque partie est écrite dans results_v4uniform/games.jsonl AU FUR ET À MESURE :
// si ça meurt (harness, veille, coupure), tu gardes toutes les parties déjà jouées.
// Vérifier le score à tout moment (même pendant / après un kill) : node calibration/v4uniform_check.mjs
import { spawn } from 'node:child_process'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const engine = path.join(here, '..', 'engine-ts')
const tsxCli = path.join(engine, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const outDir = path.join(here, 'results_v4uniform')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, 'games.jsonl')

const SIMS = 500, MAX_CHANCE = '20', GPM = 21   // ~11 matchups × 22 × 4 workers = ~970 parties
const SEEDS = [86000, 87000, 88000, 89000]

// repart à neuf (une run = un dataset propre ; en cas de mort, le partiel reste lisible)
const stream = fs.createWriteStream(outFile, { flags: 'w' })
let a = 0, b = 0, nu = 0, t0 = Date.now()

function worker(seed) {
  return new Promise(resolve => {
    const p = spawn(process.execPath,
      [tsxCli, 'src/sim/search/gate3.ts', 'v4', 'vg', String(GPM), String(SIMS), String(seed)],
      { cwd: engine, env: { ...process.env, MAX_CHANCE } })
    try { os.setPriority(p.pid, os.constants.priority.PRIORITY_BELOW_NORMAL) } catch {}
    let buf = ''
    p.stdout.on('data', d => {
      buf += d
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1)
        const m = line.match(/game (\S+) seed=(\d+) aSeat=(\d) -> (A|B|null)/)
        if (m) {
          const r = m[4]
          stream.write(JSON.stringify({ seed: +m[2], matchup: m[1], aSeat: +m[3], r }) + '\n')
          if (r === 'A') a++; else if (r === 'B') b++; else nu++
          const done = a + b + nu, dec = a + b
          if (done % 10 === 0) {
            const rate = done / ((Date.now() - t0) / 60000)
            console.log(`${done} parties · v4-uniforme ${dec ? (100 * a / dec).toFixed(1) : '?'}% (A=${a} B=${b} nuls=${nu}) · ${rate.toFixed(1)}/min`)
          }
        }
      }
    })
    p.stderr.on('data', () => {})
    p.on('close', () => resolve())
  })
}

console.log(`GROS TEST NUIT (checkpoint) — MCTS(v4 uniforme) vs value-greedy, sims=${SIMS}, MAX_CHANCE=${MAX_CHANCE}, ~970 parties`)
console.log(`Checkpoint: ${outFile}  ·  score à tout moment: node calibration/v4uniform_check.mjs`)
await Promise.all(SEEDS.map(worker))
stream.end()
const dec = a + b
console.log('\n===== FINI =====')
console.log(`v4-uniforme vs value-greedy : ${a}-${b} (nuls ${nu}) = ${dec ? (100 * a / dec).toFixed(1) : '?'}%`)
console.log(`Verdict via: node calibration/v4uniform_check.mjs`)
