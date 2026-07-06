// A/B « les upgrades HH mesurent négatif parce que l'IA les achète n'importe quand » (objection
// user 2026-07-06) : même banc que la v4 (mutation d'état initial, paires de graines), mais la
// politique HH n'achète un upgrade QUE si elle reste sur-CP après (cp >= coût + 2).
// Usage : node calibration/ab_upgrade_gate.mjs [seeds] [--diag]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const netPol = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const HH_UPGRADES = ['cleave-ii', 'ride-down-ii', 'sow-despair-ii', 'reap-ii', 'hallowed-reckoning-ii', 'spectral-assault-ii', 'horrify-ii']
const COST = { 'cleave-ii': 1, 'ride-down-ii': 2, 'sow-despair-ii': 2, 'reap-ii': 1, 'hallowed-reckoning-ii': 2, 'spectral-assault-ii': 1, 'horrify-ii': 2 }

// La politique « économe » : délègue tout au réseau, mais retire des options l'achat d'un
// upgrade HH quand il viderait le portefeuille (garde >= 2 CP après achat).
function thrifty(base) {
  const wrapped = Object.create(base)
  wrapped.decide = (state, playerIdx, request) => {
    const self = state.players[playerIdx]
    if (self.heroId === 'hh' && request && Array.isArray(request.options)) {
      const filtered = request.options.filter(o => {
        if (o.kind !== 'playCard' || !HH_UPGRADES.includes(o.cardId)) return true
        return self.cp >= (COST[o.cardId] ?? 2) + 2
      })
      if (filtered.length > 0 && filtered.length < request.options.length) {
        return base.decide(state, playerIdx, { ...request, options: filtered })
      }
    }
    return base.decide(state, playerIdx, request)
  }
  return wrapped
}
const thriftyPol = thrifty(netPol)

function runOne(seed, seating, withCard, policyHH) {
  const rng = G.mulberry32(seed)
  const [heroA, heroB] = seating === 0 ? ['hh', 'bw'] : ['bw', 'hh']
  const state = G.createInitialGameState(heroA, heroB, rng)
  if (withCard) {
    const p = state.players.find(pl => pl.heroId === 'hh')
    const i = p.deck.indexOf('ride-down-ii')
    if (i >= 0) p.deck.splice(i, 1)
    p.hand.push('ride-down-ii')
  }
  const hhIdx = state.players.findIndex(pl => pl.heroId === 'hh')
  const pols = [null, null]
  pols[hhIdx] = policyHH
  pols[1 - hhIdx] = netPol
  while (!state.gameOver && state.turnNumber < G.MAX_TURNS) {
    state.turnNumber += 1
    const i = state.activePlayerIdx
    G.playTurn(state, i, rng, pols)
    state.activePlayerIdx = 1 - i
  }
  const hhScore = state.winner === null ? 0.5 : (state.winner === hhIdx ? 1 : 0)
  return { hhScore, log: state.log, hhIdx }
}

const seeds = parseInt(process.argv[2] || '150', 10)
const diag = process.argv.includes('--diag')

if (diag) {
  let buys = 0, sells = 0
  const buyTurns = []
  for (let s = 1; s <= 20; s++) {
    const r = runOne(s, s % 2, true, netPol)
    for (const e of r.log) {
      if (e.playerIdx !== r.hhIdx) continue
      if (/Played upgrade Ride Down II/.test(e.message)) { buys += 1; buyTurns.push(e.turn) }
      if (/Sold ride-down-ii/.test(e.message)) sells += 1
    }
  }
  console.log(`DIAGNOSTIC (20 parties, RD II en main de départ, politique v4) : achats=${buys}, ventes=${sells}, tours d'achat=[${buyTurns.join(',')}]`)
}

// A/B apparié : pour chaque graine/siège, 4 conditions.
const conds = [
  ['base v4       ', false, netPol],
  ['base économe  ', false, thriftyPol],
  ['+RDII v4      ', true, netPol],
  ['+RDII économe ', true, thriftyPol],
]
const res = conds.map(() => [])
const t0 = Date.now()
let done = 0
for (let s = 1; s <= seeds; s++) {
  for (const seating of [0, 1]) {
    conds.forEach((c, k) => { res[k].push(runOne(s, seating, c[1], c[2]).hhScore) })
    done += conds.length
  }
  if (s % 25 === 0) console.error(`${done} parties · ${(done / ((Date.now() - t0) / 1000)).toFixed(1)}/s`)
}
console.log(`\n=== A/B (n=${seeds * 2} par condition) ===`)
const stats = res.map(v => {
  const n = v.length, m = v.reduce((a, b) => a + b, 0) / n
  return { m, se: Math.sqrt(Math.max(m * (1 - m), 1e-9) / n), n }
})
conds.forEach((c, k) => console.log(`${c[0]}: HH gagne ${(stats[k].m * 100).toFixed(1)}% ± ${(stats[k].se * 100).toFixed(1)}`))
const dV4 = (stats[2].m - stats[0].m) * 100
const dTh = (stats[3].m - stats[1].m) * 100
const seD = (a, b) => Math.sqrt(stats[a].se ** 2 + stats[b].se ** 2) * 100
console.log(`\nValeur de RD II, politique v4      : ${dV4 >= 0 ? '+' : ''}${dV4.toFixed(1)}% ± ${seD(2, 0).toFixed(1)}`)
console.log(`Valeur de RD II, politique économe : ${dTh >= 0 ? '+' : ''}${dTh.toFixed(1)}% ± ${seD(3, 1).toFixed(1)}`)
console.log(`Effet de la règle économe seule (sans carte ajoutée) : ${((stats[1].m - stats[0].m) * 100).toFixed(1)}%`)
