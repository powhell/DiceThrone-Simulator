// Audit de la taxe de défense du panneau EV (doute user 2026-07-10 : « pas sûr que tes
// valeurs EV sont justes »). Méthode force brute : on résout la MÊME attaque 2 000 fois
// dans le vrai moteur (défense adverse complète : jets, jetons, cartes-réponse de l'IA)
// et on compare la taxe MESURÉE = (base − dégâts nets infligés) + contre-dégâts reçus
// à la taxe ANNONCÉE par defenseTaxFor (celle que le panneau EV soustrait).
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()

const N = Number(process.argv[2] || 2000)

// Politique IA : le réseau déployé (défense complète, cartes-réponse incluses)
const win = {}
new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
const net = G.fromJSON(JSON.stringify(win.AI_WEIGHTS))
const pol = G.createValueGreedyPolicy(net)

// Cas d'audit : [attaquant, défenseur, dés forcés, habileté, dégâts de base, mutation d'état]
const CASES = [
  ['bw', 'hh', [3, 3, 4, 4, 6], 'Baton Strike 4B', 6, s => { s.tokens.dreadful = 0 }, 'HH à 0 Dreadful'],
  ['bw', 'hh', [3, 3, 4, 4, 6], 'Baton Strike 4B', 6, s => { s.tokens.dreadful = 2 }, 'HH à 2 Dreadful'],
  ['bw', 'hh', [3, 3, 4, 4, 6], 'Baton Strike 4B', 6, s => { s.tokens.dreadful = 4 }, 'HH à 4 Dreadful'],
  ['hh', 'bw', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'BW de base'],
  ['hh', 'bw', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'BW de base (petite suite, 7 dmg)'],
  ['sm', 'hh', [3, 3, 4, 5, 6], 'Punch', 4, s => { s.tokens.dreadful = 2 }, 'HH à 2 Dreadful'],
  // Balayage petites (4) vs grosses (7) attaques défendables sur les 8 autres défenseurs —
  // cherche le biais « la taxe réelle grossit avec l'attaque » mesuré sur bw.
  ['hh', 'fm', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'FM sans armure'],
  ['hh', 'fm', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'FM sans armure (7)'],
  ['hh', 'fm', [1, 2, 3, 4, 6], 'Sow Despair', 7, s => { s.armor.helmet = 2; s.armor.shield = 2 }, 'FM casque+bouclier Diamond (7)'],
  ['hh', 'sm', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'SM (4)'],
  ['hh', 'sm', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'SM (7)'],
  ['hh', 'du', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'DU (4)'],
  ['hh', 'du', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'DU (7)'],
  ['hh', 'rv', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'RV (4)'],
  ['hh', 'rv', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'RV (7)'],
  ['hh', 'py', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'PY (4)'],
  ['hh', 'py', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'PY (7)'],
  ['hh', 'dr', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'DR (4)'],
  ['hh', 'dr', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'DR (7)'],
  ['hh', 'se', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'SE (4)'],
  ['hh', 'se', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'SE (7)'],
  ['hh', 'th', [1, 1, 2, 6, 6], 'Cleave 3A', 4, () => {}, 'TH (4)'],
  ['hh', 'th', [1, 2, 3, 4, 6], 'Sow Despair', 7, () => {}, 'TH (7)'],
]

for (const [me, opp, dice, abilityStartsWith, base, mutate, label] of CASES) {
  let dealt = 0, counter = 0, n = 0, name = ''
  let cardPlays = 0
  for (let seed = 1; seed <= N; seed++) {
    const g = G.newHumanGame(me, opp, pol, G.mulberry32(seed), true)
    const you = g.state.players[g.humanIdx], ai = g.state.players[g.aiIdx]
    mutate(ai)
    try { G.beginHumanTurn(g, undefined) } catch (e) { if (seed === 1) console.log('beginHumanTurn:', e.message); continue }
    const cands = G.matchedAbilities(g, dice)
    const cand = cands.find(c => c.name.startsWith(abilityStartsWith))
    if (!cand) continue
    name = cand.name
    const hpA = ai.hp, hpY = you.hp
    const logFrom = g.state.log.length
    try { G.humanAttack(g, dice, cand.name, false, []) } catch (e) { if (seed === 1) console.log('humanAttack:', e.message); continue }
    dealt += hpA - ai.hp
    counter += hpY - you.hp
    for (let i = logFrom; i < g.state.log.length; i++) {
      if (/plays|joue|Not This Time|card/i.test(g.state.log[i].message)) cardPlays++
    }
    n++
  }
  if (!n) { console.log(`SKIP ${label} (habileté non matchée)`); continue }
  const g0 = G.newHumanGame(me, opp, 1)
  mutate(g0.state.players[g0.aiIdx])
  let annonce = NaN
  try {
    const gg = G.newHumanGame(me, opp, pol, G.mulberry32(7), true)
    G.beginHumanTurn(gg, undefined)
    mutate(gg.state.players[gg.aiIdx])
    annonce = G.defenseTaxFor(gg.state.players[gg.aiIdx])
  } catch (e) {}
  const taxMes = (base - dealt / n) + (counter / n)
  console.log(`${me}→${opp} ${name} (${base} base) · ${label} · n=${n}`)
  console.log(`   infligés moy=${(dealt / n).toFixed(2)} · contre reçu moy=${(counter / n).toFixed(2)} · réponses cartes/partie=${(cardPlays / n).toFixed(2)}`)
  console.log(`   TAXE mesurée=${taxMes.toFixed(2)} vs annoncée=${Number.isNaN(annonce) ? 'n/a (defenseTaxFor non exporté)' : annonce.toFixed(2)}`)
}
