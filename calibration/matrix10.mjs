// Matrice complète 10 héros (v4) : toutes les paires ordonnées, réseau des deux côtés.
// Usage (APRÈS déploiement de best.json -> ai-weights.js) :
//   node calibration/matrix10.mjs [--games 24] [--out calibration/matrix10.json]
// 90 paires x games — à 24 parties/paire = 2 160 parties (~1-2 h, mono-processus mais on
// peut le lancer le matin pendant le déjeuner ; --games 48 pour serrer les marges le soir).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
if (!win.AI_WEIGHTS || win.AI_WEIGHTS.sizes[0] !== G.FEATURE_COUNT) {
  console.error(`ai-weights.js incompatible (attendu ${G.FEATURE_COUNT} features) — déploie best.json d'abord.`)
  process.exit(1)
}
const pol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const GAMES = +argVal('games', 24)
const OUT = argVal('out', path.join(root, 'calibration/matrix10.json'))

const HEROES = ['hh', 'bw', 'fm', 'rv', 'dr', 'th', 'sm', 'py', 'du', 'se']
const cells = {}
const totals = Object.fromEntries(HEROES.map(h => [h, { w: 0, n: 0 }]))
const t0 = Date.now()
let done = 0
const pairs = HEROES.flatMap(a => HEROES.filter(b => b !== a).map(b => [a, b]))
for (const [a, b] of pairs) {
  let w = 0, n = 0
  for (let s = 1; s <= GAMES; s++) {
    const r = G.runMatch(a, b, s, [pol, pol])
    if (r.winner === 0) w += 1
    if (r.winner !== null || r.finalState.gameOver) n += 1
    else { w += 0.5; n += 1 } // timeout = 0.5 (rare)
  }
  cells[`${a}-${b}`] = { w, n }
  totals[a].w += w; totals[a].n += n
  totals[b].w += n - w; totals[b].n += n
  done += 1
  console.log(`${a} vs ${b}: ${w}/${n}  (${done}/${pairs.length}, ${((Date.now() - t0) / 60000).toFixed(1)} min)`)
}
const winrates = Object.fromEntries(HEROES.map(h => [h, +(100 * totals[h].w / totals[h].n).toFixed(1)]))
fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), games: GAMES, winrates, cells }, null, 1))
console.log('\n=== Winrates globaux ===')
for (const [h, v] of Object.entries(winrates).sort((x, y) => y[1] - x[1])) console.log(`${h}: ${v}%`)
console.log(`\nÉcrit: ${OUT}`)
