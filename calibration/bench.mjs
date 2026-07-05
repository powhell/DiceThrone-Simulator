// Vitesse d'une partie value-greedy vs value-greedy (dimensionnement du banc de calibration).
import fs from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const net = G.fromJSON(JSON.stringify(win.AI_WEIGHTS))
const pol = G.createValueGreedyPolicy(net)

const N = 30
const t0 = Date.now()
let w0 = 0, w1 = 0, draw = 0, timeout = 0, turns = 0
for (let s = 1; s <= N; s++) {
  const r = G.runMatch('hh', 'bw', s, [pol, pol])
  turns += r.turns
  if (r.winner === 0) w0++
  else if (r.winner === 1) w1++
  else if (r.finalState.gameOver) draw++
  else timeout++
}
console.log(`N=${N} ms/partie=${((Date.now() - t0) / N).toFixed(1)} hh=${w0} bw=${w1} nul=${draw} timeout=${timeout} tours_moy=${(turns / N).toFixed(1)}`)
