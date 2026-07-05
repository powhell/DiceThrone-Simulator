// Worker de calibration : rejoue runMatch (boucle recopiée de sim/match.ts) avec une
// mutation d'état initial. Déterministe : (seed, seating, arm) -> même partie.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parentPort } from 'worker_threads'
import { ARMS } from './arms.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const pol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

// seating 0: HH commence (heroA='hh') ; seating 1: BW commence.
function runOne(arm, seating, seed) {
  const rng = G.mulberry32(seed)
  const [heroA, heroB] = seating === 0 ? ['hh', 'bw'] : ['bw', 'hh']
  const state = G.createInitialGameState(heroA, heroB, rng)
  const mutate = ARMS[arm]
  if (mutate) mutate(state)
  while (!state.gameOver && state.turnNumber < G.MAX_TURNS) {
    state.turnNumber += 1
    const i = state.activePlayerIdx
    G.playTurn(state, i, rng, [pol, pol])
    state.activePlayerIdx = 1 - i
  }
  const hhIdx = state.players[0].heroId === 'hh' ? 0 : 1
  // hhScore: 1 = HH gagne, 0.5 = nul/timeout, 0 = BW gagne
  const hhScore = state.winner === null ? 0.5 : (state.winner === hhIdx ? 1 : 0)
  return { arm, seating, seed, hhScore, turns: state.turnNumber, timeout: !state.gameOver }
}

parentPort.on('message', task => {
  const out = []
  for (const seed of task.seeds) out.push(runOne(task.arm, task.seating, seed))
  parentPort.postMessage(out)
})
