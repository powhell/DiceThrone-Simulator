// Audit du PILOTAGE de Thor : pour chaque Offensive Roll de Thor en partie réelle (policy RL
// value-greedy, réseau déployé), on relit les dés finaux dans state.log, on recalcule l'EV
// SOLVEUR de CHAQUE attaque matchée (fullAbilityBoard — inclut EK/navette/soin/CP/GB + taxe de
// défense), puis on compare l'attaque CHOISIE par le réseau à l'attaque de MEILLEURE EV.
//
// But : mesurer si Thor est « mal piloté ». Le classement d'attaque du réseau est un lookahead
// DÉGÂTS-DIRECTS SEULEMENT (v1 gap documenté dans valueGreedyPolicy.chooseAbility) — il ignore
// les bonus non-dégâts. Si le choix diverge souvent de l'EV solveur et sacrifie de l'EV, c'est
// la preuve du mauvais pilotage.
//
// Usage : node calibration/thor_audit.mjs [--games 20] [--out calibration/thor_audit.json]
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
const net = G.fromJSON(JSON.stringify(win.AI_WEIGHTS))
const base = G.createValueGreedyPolicy(net)

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const GAMES = +argVal('games', 20)
const OUT = argVal('out', path.join(root, 'calibration/thor_audit.json'))

const OPPONENTS = ['hh', 'bw', 'fm', 'rv', 'dr', 'sm', 'py', 'du', 'se']

// ---- accumulateurs -----------------------------------------------------------------------------
// Par attaque : combien de fois DISPONIBLE (matchée), CHOISIE, MEILLEURE-EV dispo,
// somme d'EV quand choisie / quand dispo, somme des dégâts directs.
const per = {} // name -> {avail, chosen, wasBest, sumChosenEv, sumAvailEv, sumChosenDmg}
const ensure = (n) => (per[n] ??= { avail: 0, chosen: 0, wasBest: 0, sumChosenEv: 0, sumAvailEv: 0, sumChosenDmg: 0 })

let decisions = 0        // décisions Thor avec >=1 candidat et EV recalculable
let forced = 0           // 1 seul candidat (pas un vrai choix)
let realChoices = 0      // >=2 candidats
let agreeBestEv = 0      // le choix == attaque de meilleure EV solveur
let agreeMaxDmg = 0      // le choix == attaque de plus gros dégât direct
let sumRegret = 0        // EV(best) - EV(chosen), cumulée sur les vrais choix
let bigRegret = 0        // vrais choix où regret >= 1.0 EV
let skippedAlter = 0     // dés altérés après « Final dice » -> EV non fiable, ignoré des stats EV

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

const spy = {
  ...base,
  chooseAbility(state, playerIdx, candidates) {
    const chosen = base.chooseAbility(state, playerIdx, candidates)
    const self = state.players[playerIdx]
    if (self.heroId !== 'th') return chosen

    const opp = state.players[1 - playerIdx]
    const dice = lastFinalDice(state, playerIdx)
    if (!dice || dice.length !== 5 || dice.some(Number.isNaN)) return chosen

    const oState = G.oracleStateFor(self, opp)
    const board = G.fullAbilityBoard('th', dice, oState)
    const matched = board.filter(e => e.matched && e.name !== 'Whiff')
    if (matched.length === 0) return chosen

    // Garde-fou : les dés relus doivent reproduire EXACTEMENT l'ensemble des candidats reçus.
    // Sinon (fenêtre d'altération ORP2 : Tip It!/Helping Hand! adverse), l'EV est non fiable.
    const candNames = new Set(candidates.map(c => c.name))
    const boardNames = new Set(matched.map(e => e.name))
    const sameSet = candNames.size === boardNames.size && [...candNames].every(n => boardNames.has(n))
    if (!sameSet) { skippedAlter += 1; return chosen }

    const bestEv = matched.reduce((a, b) => (b.value > a.value ? b : a))
    const chosenEntry = matched.find(e => e.name === chosen) ?? bestEv
    const maxDmgEntry = matched.reduce((a, b) => ((b.baseDamage ?? 0) > (a.baseDamage ?? 0) ? b : a))

    decisions += 1
    for (const e of matched) { const p = ensure(e.name); p.avail += 1; p.sumAvailEv += e.value; if (e.name === bestEv.name) p.wasBest += 1 }
    const pc = ensure(chosen); pc.chosen += 1; pc.sumChosenEv += chosenEntry.value; pc.sumChosenDmg += (chosenEntry.baseDamage ?? 0)

    if (candidates.length === 1) forced += 1
    else {
      realChoices += 1
      const regret = bestEv.value - chosenEntry.value
      sumRegret += regret
      if (regret >= 1.0) bigRegret += 1
      if (chosen === bestEv.name) agreeBestEv += 1
      if (chosen === maxDmgEntry.name) agreeMaxDmg += 1
    }
    return chosen
  },
}

// ---- run ---------------------------------------------------------------------------------------
const outcome = {} // opp -> {as_p0:{w,n}, as_p1:{w,n}}
const t0 = Date.now()
let totalGames = 0
for (const opp of OPPONENTS) {
  outcome[opp] = { p0: { w: 0, n: 0 }, p1: { w: 0, n: 0 } }
  // Thor en p0
  for (let s = 1; s <= GAMES; s++) {
    const r = G.runMatch('th', opp, s, [spy, spy])
    outcome[opp].p0.n += 1
    if (r.winner === 0) outcome[opp].p0.w += 1
    else if (r.winner === null && r.finalState.gameOver) outcome[opp].p0.w += 0.5
    else if (r.winner === null) outcome[opp].p0.w += 0.5 // timeout rare
    totalGames += 1
  }
  // Thor en p1
  for (let s = 1; s <= GAMES; s++) {
    const r = G.runMatch(opp, 'th', 10000 + s, [spy, spy])
    outcome[opp].p1.n += 1
    if (r.winner === 1) outcome[opp].p1.w += 1
    else if (r.winner === null) outcome[opp].p1.w += 0.5
    totalGames += 1
  }
  const wr = (100 * (outcome[opp].p0.w + outcome[opp].p1.w) / (outcome[opp].p0.n + outcome[opp].p1.n)).toFixed(0)
  console.log(`th vs ${opp}: winrate Thor ${wr}%  (${((Date.now() - t0) / 60000).toFixed(1)} min, ${totalGames} parties)`)
}

// ---- winrate global Thor -----------------------------------------------------------------------
let tw = 0, tn = 0
for (const opp of OPPONENTS) { tw += outcome[opp].p0.w + outcome[opp].p1.w; tn += outcome[opp].p0.n + outcome[opp].p1.n }
const thorWinrate = +(100 * tw / tn).toFixed(1)

const report = {
  date: new Date().toISOString(),
  games_per_matchup_per_side: GAMES,
  total_games: totalGames,
  thor_winrate_vs_field: thorWinrate,
  decisions, forced, realChoices,
  agree_best_ev: agreeBestEv,
  agree_best_ev_pct: realChoices ? +(100 * agreeBestEv / realChoices).toFixed(1) : null,
  agree_max_dmg_pct: realChoices ? +(100 * agreeMaxDmg / realChoices).toFixed(1) : null,
  avg_regret_ev: realChoices ? +(sumRegret / realChoices).toFixed(3) : null,
  big_regret_choices: bigRegret,
  big_regret_pct: realChoices ? +(100 * bigRegret / realChoices).toFixed(1) : null,
  skipped_alter: skippedAlter,
  per_ability: Object.fromEntries(Object.entries(per).map(([n, p]) => [n, {
    avail: p.avail, chosen: p.chosen,
    chosen_pct_of_decisions: +(100 * p.chosen / decisions).toFixed(1),
    pick_rate_when_avail: +(100 * p.chosen / p.avail).toFixed(1),
    was_best_ev_when_avail_pct: +(100 * p.wasBest / p.avail).toFixed(1),
    avg_ev_when_avail: +(p.sumAvailEv / p.avail).toFixed(2),
    avg_ev_when_chosen: p.chosen ? +(p.sumChosenEv / p.chosen).toFixed(2) : null,
    avg_direct_dmg_when_chosen: p.chosen ? +(p.sumChosenDmg / p.chosen).toFixed(2) : null,
  }])),
  outcome,
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== PILOTAGE THOR ===')
console.log(`Winrate Thor vs le champ : ${thorWinrate}%  (${totalGames} parties)`)
console.log(`Décisions d'attaque mesurées : ${decisions}  (forcées ${forced}, vrais choix ${realChoices})`)
console.log(`Choix == meilleure EV solveur : ${report.agree_best_ev_pct}%  |  == plus gros dégât direct : ${report.agree_max_dmg_pct}%`)
console.log(`Regret EV moyen par vrai choix : ${report.avg_regret_ev}  |  gros ratés (>=1 EV) : ${report.big_regret_pct}% des choix`)
console.log(`Décisions ignorées (dés altérés) : ${skippedAlter}`)
console.log('\nAttaque                         chois%  pick@dispo  meilleureEV@dispo  EV.moy(dispo)  dmg.moy(chois)')
for (const [n, p] of Object.entries(report.per_ability).sort((a, b) => b[1].chosen - a[1].chosen)) {
  console.log(
    `${n.padEnd(30)}  ${String(p.chosen_pct_of_decisions).padStart(5)}  ${String(p.pick_rate_when_avail).padStart(9)}  ${String(p.was_best_ev_when_avail_pct).padStart(15)}  ${String(p.avg_ev_when_avail).padStart(12)}  ${String(p.avg_direct_dmg_when_chosen ?? '-').padStart(13)}`,
  )
}
console.log(`\nÉcrit : ${OUT}`)
