// Audit du PILOTAGE de TOUS les héros (même méthode que thor_audit.mjs, généralisée).
// Pour chaque Offensive Roll, on relit les dés finaux (state.log), on recalcule l'EV SOLVEUR
// de chaque attaque matchée (fullAbilityBoard), et on compare l'attaque CHOISIE par le réseau
// à l'attaque de MEILLEURE EV. Un seul passage : chaque partie A vs B enregistre les DEUX
// sièges, donc on couvre tout le monde en jouant chaque paire non-ordonnée une fois.
//
// Usage : node calibration/pilot_audit_all.mjs [--games 8] [--heroes hh,bw,...] [--out ...]
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
const base = G.createValueGreedyPolicy(G.fromJSON(JSON.stringify(win.AI_WEIGHTS)))

const argv = process.argv.slice(2)
const argVal = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d }
const GAMES = +argVal('games', 8)
const OUT = argVal('out', path.join(root, 'calibration/pilot_audit_all.json'))
const HEROES = argVal('heroes', 'hh,bw,fm,rv,dr,th,sm,py,du,se').split(',')

// ---- accumulateurs par héros -------------------------------------------------------------------
function emptyHero() {
  return {
    decisions: 0, forced: 0, realChoices: 0,
    agreeBestEv: 0, agreeMaxDmg: 0, sumRegret: 0, bigRegret: 0, skippedAlter: 0,
    per: {}, // name -> {avail, chosen, wasBest, sumChosenEv, sumAvailEv, sumChosenDmg}
    // Thor only : encaissement de l'EK stockée. « casher » = choisir Bottled Lightning ou
    // Odinforce (les 2 seules attaques boostées par l'EK) quand on a >=3 EK.
    ekHigh: 0, ekHighCasherAvail: 0, ekHighCashed: 0, ekHighEvLeft: 0,
  }
}
const EK_CASHERS = new Set(['Bottled Lightning (TTTT)', 'Odinforce (HHWWW)'])
const stats = Object.fromEntries(HEROES.map(h => [h, emptyHero()]))
const ensure = (h, n) => (stats[h].per[n] ??= { avail: 0, chosen: 0, wasBest: 0, sumChosenEv: 0, sumAvailEv: 0, sumChosenDmg: 0 })

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
    const hid = self.heroId
    if (!stats[hid]) return chosen // nx (boss) hors stats

    const opp = state.players[1 - playerIdx]
    const dice = lastFinalDice(state, playerIdx)
    if (!dice || dice.length !== 5 || dice.some(Number.isNaN)) return chosen

    const oState = G.oracleStateFor(self, opp)
    const board = G.fullAbilityBoard(hid, dice, oState)
    const matched = board.filter(e => e.matched && e.name !== 'Whiff')
    if (matched.length === 0) return chosen

    const candNames = new Set(candidates.map(c => c.name))
    const boardNames = new Set(matched.map(e => e.name))
    const sameSet = candNames.size === boardNames.size && [...candNames].every(n => boardNames.has(n))
    const S = stats[hid]
    if (!sameSet) { S.skippedAlter += 1; return chosen }

    const bestEv = matched.reduce((a, b) => (b.value > a.value ? b : a))
    const chosenEntry = matched.find(e => e.name === chosen) ?? bestEv
    const maxDmgEntry = matched.reduce((a, b) => ((b.baseDamage ?? 0) > (a.baseDamage ?? 0) ? b : a))

    S.decisions += 1
    for (const e of matched) { const p = ensure(hid, e.name); p.avail += 1; p.sumAvailEv += e.value; if (e.name === bestEv.name) p.wasBest += 1 }
    const pc = ensure(hid, chosen); pc.chosen += 1; pc.sumChosenEv += chosenEntry.value; pc.sumChosenDmg += (chosenEntry.baseDamage ?? 0)

    if (candidates.length === 1) S.forced += 1
    else {
      S.realChoices += 1
      const regret = bestEv.value - chosenEntry.value
      S.sumRegret += regret
      if (regret >= 1.0) S.bigRegret += 1
      if (chosen === bestEv.name) S.agreeBestEv += 1
      if (chosen === maxDmgEntry.name) S.agreeMaxDmg += 1
    }

    // Thor : encaissement de l'EK. À >=3 EK, une attaque boostée dispo devrait souvent être prise.
    if (hid === 'th' && Math.min(4, self.tokens.electrokinesis ?? 0) >= 3) {
      S.ekHigh += 1
      const casherEntry = matched.filter(e => EK_CASHERS.has(e.name)).sort((a, b) => b.value - a.value)[0]
      if (casherEntry) {
        S.ekHighCasherAvail += 1
        if (EK_CASHERS.has(chosen)) S.ekHighCashed += 1
        else S.ekHighEvLeft += Math.max(0, casherEntry.value - chosenEntry.value)
      }
    }
    return chosen
  },
}

// ---- run : chaque paire non-ordonnée une fois (les deux sièges enregistrés) --------------------
const pool = HEROES.slice()
const pairs = []
for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) pairs.push([pool[i], pool[j]])
const t0 = Date.now()
let totalGames = 0
for (const [a, b] of pairs) {
  for (let s = 1; s <= GAMES; s++) { G.runMatch(a, b, s, [spy, spy]); totalGames += 1 }
  console.log(`${a} vs ${b} fait  (${((Date.now() - t0) / 60000).toFixed(1)} min, ${totalGames} parties)`)
}

// ---- rapport -----------------------------------------------------------------------------------
function heroReport(hid) {
  const S = stats[hid]
  const rc = S.realChoices || 1
  const per = Object.fromEntries(Object.entries(S.per).map(([n, p]) => [n, {
    avail: p.avail, chosen: p.chosen,
    chosen_pct_of_decisions: +(100 * p.chosen / (S.decisions || 1)).toFixed(1),
    pick_rate_when_avail: +(100 * p.chosen / p.avail).toFixed(1),
    was_best_ev_when_avail_pct: +(100 * p.wasBest / p.avail).toFixed(1),
    avg_ev_when_avail: +(p.sumAvailEv / p.avail).toFixed(2),
    avg_ev_when_chosen: p.chosen ? +(p.sumChosenEv / p.chosen).toFixed(2) : null,
    avg_direct_dmg_when_chosen: p.chosen ? +(p.sumChosenDmg / p.chosen).toFixed(2) : null,
  }]))
  return {
    decisions: S.decisions, forced: S.forced, realChoices: S.realChoices,
    agree_best_ev_pct: +(100 * S.agreeBestEv / rc).toFixed(1),
    agree_max_dmg_pct: +(100 * S.agreeMaxDmg / rc).toFixed(1),
    avg_regret_ev: +(S.sumRegret / rc).toFixed(3),
    big_regret_pct: +(100 * S.bigRegret / rc).toFixed(1),
    skipped_alter: S.skippedAlter,
    ek_high_decisions: S.ekHigh,
    ek_high_casher_available: S.ekHighCasherAvail,
    ek_cash_rate_pct: S.ekHighCasherAvail ? +(100 * S.ekHighCashed / S.ekHighCasherAvail).toFixed(1) : null,
    ek_avg_ev_left_when_not_cashed: (S.ekHighCasherAvail - S.ekHighCashed) ? +(S.ekHighEvLeft / (S.ekHighCasherAvail - S.ekHighCashed)).toFixed(2) : null,
    per_ability: per,
  }
}
const report = { date: new Date().toISOString(), games_per_pair: GAMES, total_games: totalGames, heroes: Object.fromEntries(HEROES.map(h => [h, heroReport(h)])) }
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== PILOTAGE PAR HÉROS (trié par regret EV moyen) ===')
console.log('héros  décis.  choix  ==meilleureEV  ==dmgBrut  regretMoy  grosRatés%  forcés')
const ranked = HEROES.map(h => [h, report.heroes[h]]).sort((a, b) => b[1].avg_regret_ev - a[1].avg_regret_ev)
for (const [h, r] of ranked) {
  console.log(
    `${h.padEnd(5)}  ${String(r.decisions).padStart(6)}  ${String(r.realChoices).padStart(5)}  ${String(r.agree_best_ev_pct).padStart(12)}%  ${String(r.agree_max_dmg_pct).padStart(7)}%  ${String(r.avg_regret_ev).padStart(9)}  ${String(r.big_regret_pct).padStart(9)}%  ${String(r.forced).padStart(6)}`,
  )
}
const th = report.heroes.th
if (th && th.ek_high_casher_available) {
  console.log(`\nThor — encaissement EK (>=3 EK & Bottled/Odinforce dispo) : ${th.ek_cash_rate_pct}% encaissé sur ${th.ek_high_casher_available} occasions ; EV moy. laissée quand PAS encaissé : ${th.ek_avg_ev_left_when_not_cashed}`)
}
console.log(`\nÉcrit : ${OUT}`)
