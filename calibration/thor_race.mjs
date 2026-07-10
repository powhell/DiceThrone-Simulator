// DIAGNOSTIC « la course » : pourquoi Thor inflige ~44 mais perd. On sépare offense et défense.
// Pour chaque partie Thor (policy réseau normale des 2 côtés), on lit dégâts infligés/subis,
// dégâts PRÉVENUS par l'adversaire sur les attaques de Thor, dégâts prévenus par la défense de
// Thor (Thunder Wheel), contre-dégâts subis, usage de l'ultime, encaissement d'EK.
// Usage : node calibration/thor_race.mjs [--games 10] [--out calibration/thor_race.json]
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
const GAMES = +argVal('games', 10)
const OUT = argVal('out', path.join(root, 'calibration/thor_race.json'))
const OPPONENTS = ['hh', 'bw', 'fm', 'rv', 'dr', 'sm', 'py', 'du', 'se']

function analyze(state, thSeat) {
  const th = state.players[thSeat], opp = state.players[1 - thSeat]
  const a = {
    dealt: 50 - opp.hp, taken: 50 - th.hp,
    oppPrevented: 0, thorPrevented: 0, counterToThor: 0, counterByThor: 0,
    ultimate: 0, ekAttacks: 0, ekCashedSum: 0, bigEkAttacks: 0,
    gbSpent: 0, gbSuccess: 0, turns: state.turnNumber,
    win: state.winner === thSeat ? 1 : state.winner === null ? 0.5 : 0,
    oppHpRemainingIfLoss: state.winner !== thSeat && state.winner !== null ? Math.max(0, opp.hp) : null,
  }
  for (const e of state.log) {
    const m = e.message
    if (typeof m !== 'string') continue
    const isTh = e.playerIdx === thSeat
    if (e.phase === 'defense') {
      const pv = m.match(/prevented (\d+)/)
      if (pv) { if (isTh) a.thorPrevented += +pv[1]; else a.oppPrevented += +pv[1] }
      const cb = m.match(/(\d+) dmg back/)
      if (cb) { if (isTh) a.counterByThor += +cb[1]; else a.counterToThor += +cb[1] }
    }
    if (isTh && e.phase === 'resolveAttack') {
      if (m.includes('For Asgard')) a.ultimate += 1
      const ek = m.match(/(\d+) base \+ (\d+) EK/)
      if (ek) { a.ekAttacks += 1; a.ekCashedSum += +ek[2]; if (+ek[2] >= 3) a.bigEkAttacks += 1 }
      const gb = m.match(/Guard Break: spent (\d+)/)
      if (gb) { a.gbSpent += +gb[1]; if (m.includes('UNDEFENDABLE')) a.gbSuccess += 1 }
    }
  }
  return a
}

const sum = {}
const keys = ['dealt', 'taken', 'oppPrevented', 'thorPrevented', 'counterToThor', 'counterByThor', 'ultimate', 'ekAttacks', 'ekCashedSum', 'bigEkAttacks', 'gbSpent', 'gbSuccess', 'turns', 'win']
const perOpp = {}
let N = 0, lossOppHpSum = 0, lossCount = 0
for (const k of keys) sum[k] = 0
const t0 = Date.now()
for (const opp of OPPONENTS) {
  const po = { n: 0, dealt: 0, taken: 0, oppPrevented: 0, win: 0 }
  for (let s = 1; s <= GAMES; s++) {
    for (const [heroes, seat, seed] of [[['th', opp], 0, s], [[opp, 'th'], 1, 20000 + s]]) {
      const r = G.runMatch(heroes[0], heroes[1], seed, [pol, pol])
      const a = analyze(r.finalState, seat)
      for (const k of keys) sum[k] += a[k]
      if (a.oppHpRemainingIfLoss !== null) { lossOppHpSum += a.oppHpRemainingIfLoss; lossCount += 1 }
      po.n += 1; po.dealt += a.dealt; po.taken += a.taken; po.oppPrevented += a.oppPrevented; po.win += a.win
      N += 1
    }
  }
  perOpp[opp] = {
    winrate: +(100 * po.win / po.n).toFixed(0),
    dealt: +(po.dealt / po.n).toFixed(1),
    taken: +(po.taken / po.n).toFixed(1),
    oppPrevented: +(po.oppPrevented / po.n).toFixed(1),
  }
  console.log(`th vs ${opp}: WR ${perOpp[opp].winrate}%  infligé ${perOpp[opp].dealt}  subi ${perOpp[opp].taken}  prévenu-par-adv ${perOpp[opp].oppPrevented}  (${((Date.now() - t0) / 60000).toFixed(1)} min)`)
}

const avg = (k) => +(sum[k] / N).toFixed(2)
const report = {
  date: new Date().toISOString(), games: N,
  winrate: +(100 * sum.win / N).toFixed(1),
  dmg_dealt_net: avg('dealt'),
  dmg_taken: avg('taken'),
  dmg_opp_prevented_from_thor: avg('oppPrevented'),
  thor_gross_offense: +(avg('dealt') + avg('oppPrevented')).toFixed(2),
  dmg_thor_prevented_defense: avg('thorPrevented'),
  counter_dmg_taken_by_thor: avg('counterToThor'),
  counter_dmg_by_thor: avg('counterByThor'),
  ultimate_per_game: avg('ultimate'),
  ek_attacks_per_game: avg('ekAttacks'),
  avg_ek_cashed_per_ek_attack: sum.ekAttacks ? +(sum.ekCashedSum / sum.ekAttacks).toFixed(2) : 0,
  big_ek_attacks_per_game: avg('bigEkAttacks'),
  gb_spent_per_game: avg('gbSpent'),
  gb_success_per_game: avg('gbSuccess'),
  turns_per_game: avg('turns'),
  opp_hp_remaining_in_thor_losses: lossCount ? +(lossOppHpSum / lossCount).toFixed(1) : null,
  per_opponent: perOpp,
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== LA COURSE DE THOR ===')
console.log(`Winrate ${report.winrate}%  ·  ${N} parties  ·  ${report.turns_per_game} tours/partie`)
console.log(`OFFENSE : inflige net ${report.dmg_dealt_net}  (+ ${report.dmg_opp_prevented_from_thor} prévenus par l'adversaire = ${report.thor_gross_offense} brut)`)
console.log(`DÉFENSE : subit ${report.dmg_taken}  ·  sa Thunder Wheel ne prévient que ${report.dmg_thor_prevented_defense}/partie  ·  contres subis ${report.counter_dmg_taken_by_thor}`)
console.log(`Dans ses DÉFAITES, l'adversaire finit encore à ${report.opp_hp_remaining_in_thor_losses} PV en moyenne (course perdue de ce montant).`)
console.log(`Ultime For Asgard : ${report.ultimate_per_game}/partie  ·  attaques EK ${report.ek_attacks_per_game}/partie (EK moy encaissé ${report.avg_ek_cashed_per_ek_attack}, dont ${report.big_ek_attacks_per_game} à EK>=3)`)
console.log(`Guard Break : dépensé ${report.gb_spent_per_game}/partie, rendu indéfendable ${report.gb_success_per_game}/partie`)
console.log(`\nÉcrit : ${OUT}`)
