// Table d'EV « de conception » de chaque attaque de Thor : fullAbilityBoard sur un jeu de dés
// CANONIQUE qui déclenche l'attaque, balayé sur des états de Thor (EK, Mjölnir home/away,
// base vs pleinement amélioré), taxe de défense neutre (0). Donne l'EV solveur pure de chaque
// attaque — le « combien vaut ce coup » indépendant du pilotage.
// Usage : node calibration/thor_ev_table.mjs
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const G = new Function(fs.readFileSync(path.join(root, 'static/game-engine.js'), 'utf8') + '; return Game;')()

// Dés canoniques déclenchant chaque attaque (1-3 = Marteau, 4-5 = Digne, 6 = Tonnerre).
const CANON = {
  'Hammered 3H': [1, 2, 3, 4, 6],
  'Hammered 4H': [1, 2, 3, 3, 6],
  'Hammered 5H': [1, 2, 3, 3, 3],
  'Mighty Summon (HWWT)': [1, 4, 5, 4, 6],
  'Boom Boom! (HHTT)': [1, 2, 6, 6, 4],
  'Chain Lightning (HHHTT)': [1, 2, 3, 6, 6],
  'Odinforce (HHWWW)': [1, 2, 4, 5, 4],
  'Bottled Lightning (TTTT)': [6, 6, 6, 6, 1],
  'Ricochet! (TTT)': [6, 6, 6, 1, 2],
  'Lightning Rod (4-straight)': [1, 2, 3, 4, 6],
  'Thunder Bolt (5-straight)': [1, 2, 3, 4, 5],
  'Asgardian Brawn (WWW)': [4, 5, 4, 1, 6],
  'For Asgard! (TTTTT)': [6, 6, 6, 6, 6],
}

const ALL_UPGRADES = [
  'hammered-iii', 'mighty-summon-ii', 'chain-lightning-ii', 'odinforce-ii',
  'bottled-lightning-ii', 'lightning-rod-ii', 'thunder-bolt-ii',
]

function boardVal(name, dice, state) {
  const b = G.fullAbilityBoard('th', dice, state)
  const e = b.find(x => x.name === name)
  return e && e.matched ? e.value : null
}

const wc = { sixIt: false, soWild: false, twiceAsWild: false, samesies: false, tipIt: false }
function stateOf(ek, mjolnirHome, upgrades) {
  return { mjolnirHome, electrokinesis: ek, guardBreak: 0, upgradeIds: upgrades, defenseTax: 0, wildcards: wc, heIsWorthy: false }
}

const rows = []
for (const [name, dice] of Object.entries(CANON)) {
  const base0 = boardVal(name, dice, stateOf(0, true, []))
  const base2 = boardVal(name, dice, stateOf(2, true, []))
  const base4 = boardVal(name, dice, stateOf(4, true, []))
  const up4 = boardVal(name, dice, stateOf(4, true, ALL_UPGRADES))
  rows.push({ name, ek0: base0, ek2: base2, ek4: base4, upgraded_ek4: up4 })
}

console.log('EV solveur de chaque attaque (Mjölnir présent, taxe défense 0)')
console.log('Attaque                          EK0    EK2    EK4    (upg,EK4)')
for (const r of rows) {
  const f = (v) => (v == null ? '  -  ' : v.toFixed(1).padStart(5))
  console.log(`${r.name.padEnd(30)}  ${f(r.ek0)}  ${f(r.ek2)}  ${f(r.ek4)}  ${f(r.upgraded_ek4)}`)
}
fs.writeFileSync(path.join(root, 'calibration/thor_ev_table.json'), JSON.stringify(rows, null, 1))
console.log('\nÉcrit : calibration/thor_ev_table.json')
