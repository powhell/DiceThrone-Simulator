// Matrice CIBLÉE équipe tournoi (sm/bw/fm vs les 9 autres, les deux sens) sur le moteur
// corrigé (post-fix gameOver + taxe calibrée). Parallélisable par tranches :
//   node calibration/matrix_team.mjs <workerIdx> <numWorkers> [games=48]
// Chaque tranche écrit calibration/matrix_${process.env.SEED_BASE ? 'p2_' : ''}${process.env.TEAM_LIST ? process.env.TEAM_LIST.replace(/,/g,'') : 'team'}_w<idx>.json ; fusion : matrix_team_merge.
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL)
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const pol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const [wIdxArg, nWArg, gamesArg] = process.argv.slice(2)
const W_IDX = +(wIdxArg ?? 0), N_W = +(nWArg ?? 1), GAMES = +(gamesArg ?? 48)
const SEED_BASE = +(process.env.SEED_BASE ?? 0) // parties NEUVES pour une 2e passe

const TEAM = (process.env.TEAM_LIST || 'sm,bw,fm').split(',')
const ALL = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se']
const pairs = []
for (const a of ALL) for (const b of ALL) {
  if (a === b) continue
  if (!TEAM.includes(a) && !TEAM.includes(b)) continue
  pairs.push([a, b])
}
const mine = pairs.filter((_, i) => i % N_W === W_IDX)

const cells = {}
const t0 = Date.now()
for (const [a, b] of mine) {
  let w = 0, n = 0, nul = 0, to = 0
  for (let s = SEED_BASE + 1; s <= SEED_BASE + GAMES; s++) {
    const r = G.runMatch(a, b, s, [pol, pol])
    if (!r.finalState.gameOver) { to++; continue }
    if (r.winner === null) { nul++; continue }
    n++
    if (r.finalState.players[r.winner].heroId === a) w++
  }
  cells[`${a}-${b}`] = { w, n, nul, to }
  console.log(`${a}-${b}: ${w}/${n} (nuls ${nul}, to ${to}) — ${((Date.now() - t0) / 60000).toFixed(1)} min`)
}
fs.writeFileSync(path.join(root, `calibration/matrix_${process.env.SEED_BASE ? 'p2_' : ''}${process.env.TEAM_LIST ? process.env.TEAM_LIST.replace(/,/g,'') : 'team'}_w${W_IDX}.json`), JSON.stringify(cells))
console.log(`DONE w${W_IDX}: ${mine.length} paires`)
