// A/B ÉCONOMIE : le vrai levier de pilotage non testé. « Fixed » = Thor qui (1) achète tout
// upgrade abordable en Main Phase, (2) joue ses cartes de tempo (Power Trip/Stormbreak/Time to
// Hammer), (3) choisit ses attaques à l'EV du board. Mêmes seeds vs l'actuel. Si Thor bondit ->
// c'était le pilotage (thésaurisation de CP). Sinon -> le modèle le bride vraiment.
// Usage : node calibration/thor_econ_ab.mjs [--games 10]
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const base = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const GAMES = +argVal('games', 10)
const OUT = argVal('out', path.join(root, 'calibration/thor_econ_ab.json'))
const OPPONENTS = ['hh', 'bw', 'fm', 'rv', 'dr', 'sm', 'py', 'du', 'se']
const TEMPO = ['power-trip', 'stormbreak', 'time-to-hammer']
const heroTH = G.heroTemplateFor('th')

function lastFinalDice(state, playerIdx) {
  const log = state.log
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]
    if (e.playerIdx === playerIdx && e.phase === 'roll' && typeof e.message === 'string' && e.message.startsWith('Final dice:')) {
      return e.message.slice('Final dice:'.length).trim().split(',').map(Number)
    }
  }
  return null
}

const fix = {
  ...base,
  // (3) attaque à l'EV du board pour Thor
  chooseAbility(state, playerIdx, candidates) {
    const self = state.players[playerIdx]
    if (self.heroId !== 'th') return base.chooseAbility(state, playerIdx, candidates)
    const dice = lastFinalDice(state, playerIdx)
    if (!dice || dice.length !== 5 || dice.some(Number.isNaN)) return base.chooseAbility(state, playerIdx, candidates)
    const board = G.fullAbilityBoard('th', dice, G.oracleStateFor(self, state.players[1 - playerIdx]))
    const candNames = new Set(candidates.map(c => c.name))
    const pick = board.filter(e => e.matched && e.name !== 'Whiff' && candNames.has(e.name)).sort((a, b) => b.value - a.value)[0]
    return pick ? pick.name : base.chooseAbility(state, playerIdx, candidates)
  },
  // (1)+(2) économie : Thor achète ses upgrades et joue ses cartes de tempo en Main Phase
  decide(state, playerIdx, request) {
    const self = state.players[playerIdx]
    if (self.heroId === 'th' && request.ctx.windowType === 'mainPhase') {
      const up = request.options.find(o => o.kind === 'playCard' && G.cardById(heroTH, o.cardId)?.kind === 'upgrade')
      if (up) return up
      const tempo = request.options.find(o => (o.kind === 'playCard' || o.kind === 'playInstant') && TEMPO.includes(o.cardId))
      if (tempo) return tempo
    }
    return base.decide(state, playerIdx, request)
  },
}

function thRes(r, seat) { return r.winner === seat ? 1 : r.winner === null ? 0.5 : 0 }
function thDmg(r, seat) { return 50 - r.finalState.players[1 - seat].hp }
function thUpg(r, seat) { return r.finalState.players[seat].upgradesInPlay.length }
function thCp(r, seat) { return r.finalState.players[seat].cp }

const per = {}
const t0 = Date.now()
let totalGames = 0
for (const opp of OPPONENTS) {
  const a = { bW: 0, fW: 0, n: 0, bDmg: 0, fDmg: 0, bUpg: 0, fUpg: 0, bCp: 0, fCp: 0 }
  for (let s = 1; s <= GAMES; s++) {
    { const rB = G.runMatch('th', opp, s, [base, base]); const rF = G.runMatch('th', opp, s, [fix, fix])
      a.bW += thRes(rB, 0); a.fW += thRes(rF, 0); a.bDmg += thDmg(rB, 0); a.fDmg += thDmg(rF, 0); a.bUpg += thUpg(rB, 0); a.fUpg += thUpg(rF, 0); a.bCp += thCp(rB, 0); a.fCp += thCp(rF, 0); a.n += 1 }
    { const rB = G.runMatch(opp, 'th', 10000 + s, [base, base]); const rF = G.runMatch(opp, 'th', 10000 + s, [fix, fix])
      a.bW += thRes(rB, 1); a.fW += thRes(rF, 1); a.bDmg += thDmg(rB, 1); a.fDmg += thDmg(rF, 1); a.bUpg += thUpg(rB, 1); a.fUpg += thUpg(rF, 1); a.bCp += thCp(rB, 1); a.fCp += thCp(rF, 1); a.n += 1 }
    totalGames += 4
  }
  per[opp] = a
  console.log(`th vs ${opp}: actuel ${(100 * a.bW / a.n).toFixed(0)}% -> éco ${(100 * a.fW / a.n).toFixed(0)}%  (upg ${(a.bUpg / a.n).toFixed(1)}->${(a.fUpg / a.n).toFixed(1)}, ${((Date.now() - t0) / 60000).toFixed(1)} min)`)
}

let bW = 0, fW = 0, Nn = 0, bDmg = 0, fDmg = 0, bUpg = 0, fUpg = 0, bCp = 0, fCp = 0
for (const o of OPPONENTS) { const a = per[o]; bW += a.bW; fW += a.fW; Nn += a.n; bDmg += a.bDmg; fDmg += a.fDmg; bUpg += a.bUpg; fUpg += a.fUpg; bCp += a.bCp; fCp += a.fCp }
const report = {
  date: new Date().toISOString(), games_per_matchup_per_side: GAMES, total_games: totalGames,
  winrate_current: +(100 * bW / Nn).toFixed(1), winrate_econ_fixed: +(100 * fW / Nn).toFixed(1),
  delta_pts: +((100 * fW / Nn) - (100 * bW / Nn)).toFixed(1),
  avg_damage_current: +(bDmg / Nn).toFixed(1), avg_damage_fixed: +(fDmg / Nn).toFixed(1),
  avg_upgrades_current: +(bUpg / Nn).toFixed(2), avg_upgrades_fixed: +(fUpg / Nn).toFixed(2),
  avg_cp_left_current: +(bCp / Nn).toFixed(1), avg_cp_left_fixed: +(fCp / Nn).toFixed(1),
  per_opponent: Object.fromEntries(OPPONENTS.map(o => [o, { current: +(100 * per[o].bW / per[o].n).toFixed(0), fixed: +(100 * per[o].fW / per[o].n).toFixed(0) }])),
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== A/B ÉCONOMIE (achats upgrades + cartes tempo + attaque EV) ===')
console.log(`Winrate ACTUEL : ${report.winrate_current}%  (upgrades ${report.avg_upgrades_current}/6, CP restant ${report.avg_cp_left_current}, dmg ${report.avg_damage_current})`)
console.log(`Winrate ÉCO    : ${report.winrate_econ_fixed}%  (upgrades ${report.avg_upgrades_fixed}/6, CP restant ${report.avg_cp_left_fixed}, dmg ${report.avg_damage_fixed})`)
console.log(`Delta : ${report.delta_pts > 0 ? '+' : ''}${report.delta_pts} points  (${totalGames} parties, mêmes seeds)`)
console.log(`\nÉcrit : ${OUT}`)
