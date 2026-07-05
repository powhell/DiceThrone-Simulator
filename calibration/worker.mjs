// Worker de calibration : rejoue runMatch (boucle recopiée de sim/match.ts) avec une
// mutation d'état initial. Déterministe : (seed, seating, arm) -> même partie.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parentPort } from 'worker_threads'
import { ARMS, armMatchup } from './arms.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const netPol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))
const greedy = G.greedyHighestDamagePolicy

// seating 0: HH commence (heroA='hh') ; seating 1: BW commence.
function runOne(arm, seating, seed) {
  const rng = G.mulberry32(seed)
  const [mA, mB] = armMatchup(arm)
  const [heroA, heroB] = seating === 0 ? [mA, mB] : [mB, mA]
  const state = G.createInitialGameState(heroA, heroB, rng)
  const mutate = ARMS[arm]
  if (mutate) mutate(state)
  while (!state.gameOver && state.turnNumber < G.MAX_TURNS) {
    state.turnNumber += 1
    const i = state.activePlayerIdx
    // v3 (2026-07-05) : le réseau est entraîné avec fm — netPol PARTOUT (v2 : greedy pour fm)
    G.playTurn(state, i, rng, [netPol, netPol])
    state.activePlayerIdx = 1 - i
  }
  // hhScore = score du PREMIER héros du matchup (hh ou fm selon le bras)
  const refIdx = state.players[0].heroId === mA ? 0 : 1
  const hhScore = state.winner === null ? 0.5 : (state.winner === refIdx ? 1 : 0)
  return { arm, seating, seed, hhScore, turns: state.turnNumber, timeout: !state.gameOver }
}

parentPort.on('message', task => {
  const out = []
  for (const seed of task.seeds) out.push(runOne(task.arm, task.seating, seed))
  parentPort.postMessage(out)
})
