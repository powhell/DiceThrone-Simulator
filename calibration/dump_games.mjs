// Sort la TRACE COMPLÈTE de 3 parties : chaque tour, chaque lancer/relance, chaque décision de
// l'IA (attaque choisie, cartes, défense, dégâts). Lit state.log après une vraie partie.
// Usage : node calibration/dump_games.mjs [--out calibration/trace_3_parties.txt]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const pol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const OUT = argVal('out', path.join(root, 'calibration/trace_3_parties.txt'))

// 3 parties Thor variées : un adversaire où il perd souvent, un moyen, un où il gagne.
const GAMES = [
  ['th', 'sm', 3],
  ['th', 'fm', 2],
  ['th', 'se', 1],
]

const PHASE_W = 13
function fmtGame(heroA, heroB, seed) {
  const r = G.runMatch(heroA, heroB, seed, [pol, pol])
  const st = r.finalState
  const heroOf = i => st.players[i].heroId.toUpperCase()
  const winner = r.winner === null ? (st.gameOver ? 'NUL (double KO)' : 'timeout') : `${heroOf(r.winner)} gagne`
  const lines = []
  lines.push('')
  lines.push('#'.repeat(78))
  lines.push(`# PARTIE : ${heroA.toUpperCase()} (joueur 0) vs ${heroB.toUpperCase()} (joueur 1) — seed ${seed}`)
  lines.push(`# Résultat : ${winner}  ·  ${r.turns} tours  ·  PV finaux ${heroOf(0)} ${st.players[0].hp} / ${heroOf(1)} ${st.players[1].hp}`)
  lines.push('#'.repeat(78))
  let lastTurn = -1
  for (const e of st.log) {
    if (e.turn !== lastTurn) { lines.push(''); lastTurn = e.turn }
    const hero = st.players[e.playerIdx].heroId
    const phase = String(e.phase).padEnd(PHASE_W)
    // Les en-têtes de tour (===== ) et lignes de jet ressortent seules ; le reste indenté.
    if (e.message.startsWith('=====')) lines.push(`\nT${String(e.turn).padStart(2)} ${e.message}`)
    else lines.push(`   T${String(e.turn).padStart(2)} ${hero} | ${phase} | ${e.message}`)
  }
  return lines.join('\n')
}

const out = GAMES.map(([a, b, s]) => fmtGame(a, b, s)).join('\n')
fs.writeFileSync(OUT, out)
console.log(`Écrit : ${OUT}  (${out.split('\n').length} lignes)`)
