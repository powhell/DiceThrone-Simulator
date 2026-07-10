// TEST DÉCISIF « mal piloté vs mal calculé ». On rejoue les MÊMES parties (mêmes seeds) avec
// deux Thor : (A) l'actuel (sélecteur dégât-brut du réseau) et (B) le correctif — Thor choisit
// son attaque à l'EV du board (fullAbilityBoard), rien d'autre ne change. Les adversaires
// gardent la policy réseau normale dans les deux cas. Si le winrate de Thor grimpe -> c'était
// le pilotage. S'il ne bouge pas -> le modèle sous-évalue Thor (erreur de calcul à chercher).
//
// Usage : node calibration/thor_fix_ab.mjs [--games 12] [--out calibration/thor_fix_ab.json]
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
const GAMES = +argVal('games', 12)
const OUT = argVal('out', path.join(root, 'calibration/thor_fix_ab.json'))
const OPPONENTS = ['hh', 'bw', 'fm', 'rv', 'dr', 'sm', 'py', 'du', 'se']

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

// LE CORRECTIF : pour Thor seulement, classer les attaques par EV du board. Sinon, base.
const fix = {
  ...base,
  chooseAbility(state, playerIdx, candidates) {
    const self = state.players[playerIdx]
    if (self.heroId !== 'th') return base.chooseAbility(state, playerIdx, candidates)
    const dice = lastFinalDice(state, playerIdx)
    if (!dice || dice.length !== 5 || dice.some(Number.isNaN)) return base.chooseAbility(state, playerIdx, candidates)
    const oState = G.oracleStateFor(self, state.players[1 - playerIdx])
    const board = G.fullAbilityBoard('th', dice, oState)
    const candNames = new Set(candidates.map(c => c.name))
    const pick = board.filter(e => e.matched && e.name !== 'Whiff' && candNames.has(e.name)).sort((a, b) => b.value - a.value)[0]
    return pick ? pick.name : base.chooseAbility(state, playerIdx, candidates)
  },
}

// thWins : 1 si Thor gagne, 0.5 nul, 0 défaite. thSeat = index de Thor.
function thResult(r, thSeat) {
  if (r.winner === thSeat) return 1
  if (r.winner === null) return 0.5
  return 0
}
// dmg dealt by thor's seat this game = opponent HP lost from 50
function thDamage(r, thSeat) {
  const opp = r.finalState.players[1 - thSeat]
  return 50 - opp.hp
}

const per = {}
const t0 = Date.now()
let totalGames = 0
for (const opp of OPPONENTS) {
  const acc = { baseW: 0, fixW: 0, n: 0, baseDmg: 0, fixDmg: 0 }
  for (let s = 1; s <= GAMES; s++) {
    // Thor en p0 (seat 0)
    { const rB = G.runMatch('th', opp, s, [base, base]); const rF = G.runMatch('th', opp, s, [fix, fix])
      acc.baseW += thResult(rB, 0); acc.fixW += thResult(rF, 0); acc.baseDmg += thDamage(rB, 0); acc.fixDmg += thDamage(rF, 0); acc.n += 1 }
    // Thor en p1 (seat 1)
    { const rB = G.runMatch(opp, 'th', 10000 + s, [base, base]); const rF = G.runMatch(opp, 'th', 10000 + s, [fix, fix])
      acc.baseW += thResult(rB, 1); acc.fixW += thResult(rF, 1); acc.baseDmg += thDamage(rB, 1); acc.fixDmg += thDamage(rF, 1); acc.n += 1 }
    totalGames += 4
  }
  per[opp] = acc
  const bwr = (100 * acc.baseW / acc.n).toFixed(0)
  const fwr = (100 * acc.fixW / acc.n).toFixed(0)
  console.log(`th vs ${opp}: actuel ${bwr}%  ->  corrigé ${fwr}%   (${((Date.now() - t0) / 60000).toFixed(1)} min)`)
}

let bW = 0, fW = 0, N = 0, bD = 0, fD = 0
for (const opp of OPPONENTS) { const a = per[opp]; bW += a.baseW; fW += a.fixW; N += a.n; bD += a.baseDmg; fD += a.fixDmg }
const baseWr = +(100 * bW / N).toFixed(1)
const fixWr = +(100 * fW / N).toFixed(1)

const report = {
  date: new Date().toISOString(), games_per_matchup_per_side: GAMES, total_games: totalGames,
  thor_winrate_current: baseWr, thor_winrate_fixed: fixWr, delta_pts: +(fixWr - baseWr).toFixed(1),
  thor_avg_damage_current: +(bD / N).toFixed(1), thor_avg_damage_fixed: +(fD / N).toFixed(1),
  per_opponent: Object.fromEntries(OPPONENTS.map(o => [o, {
    current_wr: +(100 * per[o].baseW / per[o].n).toFixed(1),
    fixed_wr: +(100 * per[o].fixW / per[o].n).toFixed(1),
    games_per_side: GAMES,
  }])),
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== TEST DÉCISIF : PILOTAGE vs MODÈLE ===')
console.log(`Winrate Thor ACTUEL  : ${baseWr}%   (dégât moyen infligé/partie ${report.thor_avg_damage_current})`)
console.log(`Winrate Thor CORRIGÉ : ${fixWr}%   (dégât moyen infligé/partie ${report.thor_avg_damage_fixed})`)
console.log(`Delta : ${report.delta_pts > 0 ? '+' : ''}${report.delta_pts} points   (${totalGames} parties, mêmes seeds)`)
console.log(report.delta_pts >= 6
  ? '\n=> Le pilotage explique une grosse part : le correctif fait remonter Thor.'
  : '\n=> Le correctif bouge peu : le MODÈLE sous-évalue Thor — chercher l\'erreur de calcul (dégâts / défendabilité / taxe de défense).')
console.log(`\nÉcrit : ${OUT}`)
