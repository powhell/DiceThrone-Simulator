// DIAGNOSTIC « moteur de Thor » : pourquoi son offense brute est basse. On mesure whiffs (tours
// ratés), upgrades RÉELLEMENT posés en fin de partie, cartes de tempo jouées, lancers de Mjölnir.
// Usage : node calibration/thor_engine.mjs [--games 5]
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
const GAMES = +argVal('games', 5)
const OUT = argVal('out', path.join(root, 'calibration/thor_engine.json'))
const OPPONENTS = ['hh', 'bw', 'fm', 'rv', 'dr', 'sm', 'py', 'du', 'se']

const TEMPO_CARDS = ['Power Trip!', 'Stormbreak!', 'Time to Hammer!', 'Invulnerability!', 'Indomitable Will!']
let N = 0
const agg = {
  offensiveRolls: 0, whiffs: 0, attacks: 0, mjolnirThrows: 0,
  heIsWorthy: 0, upgradesPosed: 0, turns: 0,
}
const cardCount = {}
const upgFreq = {}
const upgCountPerGame = []

function scan(state, thSeat) {
  const th = state.players[thSeat]
  agg.turns += state.turnNumber
  // upgrades effectivement en jeu en fin de partie
  upgCountPerGame.push(th.upgradesInPlay.length)
  for (const u of th.upgradesInPlay) upgFreq[u] = (upgFreq[u] ?? 0) + 1
  for (const e of state.log) {
    if (e.playerIdx !== thSeat || typeof e.message !== 'string') continue
    const m = e.message
    if (e.phase === 'roll' && m.startsWith('Final dice:')) agg.offensiveRolls += 1
    if (m.includes('No ability matched (Whiff)')) agg.whiffs += 1
    if (e.phase === 'resolveAttack' && m.startsWith('Chose ability:')) agg.attacks += 1
    if (m.includes('Mjolnir') && (m.includes('thrown') || m.includes('throw'))) agg.mjolnirThrows += 1
    if (m.includes('he-is-worthy') || m.includes('He Is Worthy') || (m.includes('Worthy') && e.phase === 'roll')) agg.heIsWorthy += 1
    if (m.startsWith('Played upgrade')) agg.upgradesPosed += 1
    for (const c of TEMPO_CARDS) if (m.includes(c)) cardCount[c] = (cardCount[c] ?? 0) + 1
  }
}

const t0 = Date.now()
for (const opp of OPPONENTS) {
  for (let s = 1; s <= GAMES; s++) {
    { const r = G.runMatch('th', opp, s, [pol, pol]); scan(r.finalState, 0); N += 1 }
    { const r = G.runMatch(opp, 'th', 30000 + s, [pol, pol]); scan(r.finalState, 1); N += 1 }
  }
  console.log(`th vs ${opp} fait  (${((Date.now() - t0) / 60000).toFixed(1)} min)`)
}

const per = (x) => +(x / N).toFixed(2)
const report = {
  date: new Date().toISOString(), games: N,
  offensive_rolls_per_game: per(agg.offensiveRolls),
  whiffs_per_game: per(agg.whiffs),
  whiff_rate_pct: +(100 * agg.whiffs / Math.max(1, agg.offensiveRolls)).toFixed(1),
  attacks_per_game: per(agg.attacks),
  mjolnir_throws_per_game: per(agg.mjolnirThrows),
  he_is_worthy_per_game: per(agg.heIsWorthy),
  upgrades_posed_per_game: per(agg.upgradesPosed),
  avg_upgrades_in_play_end: +(upgCountPerGame.reduce((a, b) => a + b, 0) / N).toFixed(2),
  upgrade_frequency_pct: Object.fromEntries(Object.entries(upgFreq).map(([k, v]) => [k, +(100 * v / N).toFixed(0)])),
  tempo_cards_per_game: Object.fromEntries(TEMPO_CARDS.map(c => [c, per(cardCount[c] ?? 0)])),
  turns_per_game: per(agg.turns),
}
fs.writeFileSync(OUT, JSON.stringify(report, null, 1))

console.log('\n=== MOTEUR DE THOR ===')
console.log(`${N} parties · ${report.turns_per_game} tours/partie`)
console.log(`Rolls offensifs ${report.offensive_rolls_per_game}/partie · WHIFFS ${report.whiffs_per_game}/partie (${report.whiff_rate_pct}% des rolls) · attaques ${report.attacks_per_game}/partie`)
console.log(`Lancers Mjölnir ${report.mjolnir_throws_per_game}/partie · He Is Worthy ${report.he_is_worthy_per_game}/partie`)
console.log(`UPGRADES posés ${report.upgrades_posed_per_game}/partie · en jeu en fin de partie ${report.avg_upgrades_in_play_end} (sur 6 slots)`)
console.log('Fréquence par upgrade (% de parties où il est en jeu à la fin) :')
for (const [k, v] of Object.entries(report.upgrade_frequency_pct).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(3)}%  ${k}`)
console.log('Cartes de tempo jouées/partie :')
for (const [k, v] of Object.entries(report.tempo_cards_per_game)) console.log(`  ${v}  ${k}`)
console.log(`\nÉcrit : ${OUT}`)
