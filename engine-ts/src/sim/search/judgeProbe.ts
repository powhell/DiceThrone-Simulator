// Sonde du JUGE (diagnostic Phase 2) : le value-net note-t-il correctement les états que MCTS
// lui donne ? Pour chaque partie (value-greedy vs value-greedy via GameNode), on enregistre la
// note du réseau à CHAQUE nœud de décision (état mi-tour — exactement ce que MCTS évalue) et à
// chaque DÉBUT de tour (le régime des états d'entraînement), puis l'issue réelle. Sorties :
// AUC (Mann-Whitney : probabilité qu'un état gagnant soit noté au-dessus d'un état perdant —
// 0,5 = juge aveugle, 1,0 = juge parfait) + calibration par tranches, pour les deux régimes.
//
// Usage : npx tsx src/sim/search/judgeProbe.ts <games=40> <seedBase=3000>
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON, forward } from '../rl/network.js'
import { encodeState, FEATURE_COUNT } from '../rl/features.js'
import { createValueGreedyPolicy } from '../rl/valueGreedyPolicy.js'
import { GameNode } from './gameNode.js'

interface Sample { v: number; won: boolean; turn: number }

function auc(samples: Sample[]): number {
  const wins = samples.filter(s => s.won).map(s => s.v)
  const losses = samples.filter(s => !s.won).map(s => s.v)
  if (!wins.length || !losses.length) return NaN
  let better = 0, ties = 0
  for (const w of wins) for (const l of losses) { if (w > l) better++; else if (w === l) ties++ }
  return (better + ties / 2) / (wins.length * losses.length)
}

function calibration(samples: Sample[]): string {
  const buckets = [[-1, -0.5], [-0.5, -0.2], [-0.2, 0.2], [0.2, 0.5], [0.5, 1.01]]
  return buckets.map(([lo, hi]) => {
    const inB = samples.filter(s => s.v >= lo && s.v < hi)
    if (!inB.length) return `[${lo};${hi}) n=0`
    const wr = inB.filter(s => s.won).length / inB.length
    return `[${lo};${hi}) n=${inB.length} winrate=${(wr * 100).toFixed(0)}%`
  }).join(' | ')
}

function main(): void {
  const games = Number(process.argv[2] ?? 40)
  const seedBase = Number(process.argv[3] ?? 3000)
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
  const win: { AI_WEIGHTS?: unknown } = {}
  new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
  const net = fromJSON(JSON.stringify(win.AI_WEIGHTS))
  if (net.sizes[0] !== FEATURE_COUNT) throw new Error('poids incompatibles')
  const vg = createValueGreedyPolicy(net)
  const policies: [Policy, Policy] = [vg, vg]

  const MATCHUPS: Array<[HeroId, HeroId]> = [['sm', 'th'], ['hh', 'bw'], ['py', 'du'], ['fm', 'rv'], ['dr', 'se']]
  const midTurn: Sample[] = []
  const turnStart: Sample[] = []
  let played = 0

  for (let g = 0; g < games; g++) {
    const [heroA, heroB] = MATCHUPS[g % MATCHUPS.length]
    const seed = seedBase + g
    let node = GameNode.root(heroA, heroB, seed, policies)
    // échantillons de CETTE partie (issue connue seulement à la fin)
    const pendingMid: Array<{ v0: number; turn: number }> = []
    const pendingStart: Array<{ v0: number; turn: number }> = []
    let lastTurnSeen = -1
    let guard = 0
    while (!node.isTerminal() && guard++ < 100_000) {
      const actor = node.currentActor()
      if (actor.kind === 'chance') { node = node.continueChance(); continue }
      const d = node.pendingDecision()!
      const st = d.state
      // note du réseau pour le joueur 0 (perspective fixe -> une seule échelle par partie)
      const v0 = forward(net, [encodeState(st, 0)])[0]
      pendingMid.push({ v0, turn: st.turnNumber })
      if (st.turnNumber !== lastTurnSeen) { pendingStart.push({ v0, turn: st.turnNumber }); lastTurnSeen = st.turnNumber }
      if (d.hook === 'activateAbility') {
        node = node.apply({ kind: 'activateAbility', abilityName: vg.chooseAbility(st, d.playerIdx, d.candidates) })
      } else if (d.hook === 'discard') {
        node = node.apply({ kind: 'sellCard', cardId: d.hand[0] })
      } else {
        node = node.apply({ kind: 'window', action: vg.decide(st, d.playerIdx, d.request) })
      }
    }
    const winner = node.finalState().winner
    if (winner === null) continue // nul/timeout : pas d'étiquette
    played++
    for (const s of pendingMid) midTurn.push({ v: s.v0, won: winner === 0, turn: s.turn })
    for (const s of pendingStart) turnStart.push({ v: s.v0, won: winner === 0, turn: s.turn })
    if (g % 5 === 4) console.log(`... ${g + 1}/${games} parties (${midTurn.length} états mi-tour)`)
  }

  console.log(`\nparties décisives: ${played}`)
  console.log(`MI-TOUR   (ce que MCTS évalue) : n=${midTurn.length}  AUC=${auc(midTurn).toFixed(3)}`)
  console.log(`  calibration: ${calibration(midTurn)}`)
  console.log(`DÉBUT DE TOUR (régime d'entraînement) : n=${turnStart.length}  AUC=${auc(turnStart).toFixed(3)}`)
  console.log(`  calibration: ${calibration(turnStart)}`)
  // AUC par moitié de partie : le juge est-il meilleur en fin de partie (proche du terminal) ?
  const half = (ss: Sample[], early: boolean) => {
    const med = 20
    return ss.filter(s => early ? s.turn <= med : s.turn > med)
  }
  console.log(`MI-TOUR tours<=20 : AUC=${auc(half(midTurn, true)).toFixed(3)} | tours>20 : AUC=${auc(half(midTurn, false)).toFixed(3)}`)
  console.log('PROBE_DONE')
}

main()
