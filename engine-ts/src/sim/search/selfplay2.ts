// Self-play Phase 5 : le MCTS (guidé par le réseau 2 têtes) joue contre lui-même via le seam
// GameNode et enregistre l'expérience DTX2 : à chaque nœud de décision multi-coups,
// (featuresV5 du point de vue de l'acteur, distribution de visites MCTS sur les buckets,
// résultat final ±1 du point de vue de l'acteur ; nul/timeout = 0).
//
// Priors PUCT = tête politique (softmax des logits RESTREINT aux buckets des coups légaux) ;
// évaluation feuille = tête valeur (tanh remappé [0,1]). Les hooks non migrés (§5b) sont
// délégués à greedyHighestDamagePolicy — self-contained, pas de dépendance à l'ancien réseau.
// Température : les TEMP_MOVES premières décisions de chaque partie sont tirées ∝ visites
// (exploration des ouvertures), ensuite argmax.
//
// Usage : npx tsx src/sim/search/selfplay2.ts <net2.json> <out.dtx2> <games=10> <sims=150> <seedBase=1>
import * as fs from 'node:fs'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { TRAINABLE_HEROES } from '../rl/matchups.js'
import { greedyHighestDamagePolicy } from '../policy.js'
import { fromJSON2, forward2 } from '../rl/network.js'
import { encodeStateV5, FEATURE_COUNT_V5 } from '../rl/featuresV5.js'
import { mulberry32Stateful } from '../rng.js'
import { GameNode, actionKey } from './gameNode.js'
import { mctsSearch, type MctsOptions, type SearchableNode } from './mcts.js'
import { actionBucket, ACTION_SLOTS } from './actionSpace.js'

const TEMP_MOVES = 10

interface Row { x: number[]; pi: Float32Array; actorIdx: 0 | 1; z: number }

function writeDtx2(path: string, rows: Row[]): void {
  const rowLen = FEATURE_COUNT_V5 + 1 + ACTION_SLOTS
  const buf = Buffer.alloc(16 + rows.length * rowLen * 4)
  buf.write('DTX2', 0, 'ascii')
  buf.writeUInt32LE(FEATURE_COUNT_V5, 4)
  buf.writeUInt32LE(ACTION_SLOTS, 8)
  buf.writeUInt32LE(rows.length, 12)
  let off = 16
  for (const r of rows) {
    for (const v of r.x) { buf.writeFloatLE(v, off); off += 4 }
    buf.writeFloatLE(r.z, off); off += 4
    for (let i = 0; i < ACTION_SLOTS; i++) { buf.writeFloatLE(r.pi[i], off); off += 4 }
  }
  fs.writeFileSync(path, buf)
}

function main(): void {
  const [netPath, outPath, gamesArg, simsArg, seedArg] = process.argv.slice(2)
  if (!netPath || !outPath) { console.error('usage: selfplay2.ts <net2.json> <out.dtx2> [games] [sims] [seedBase]'); process.exit(1) }
  const games = Number(gamesArg ?? 10)
  const sims = Number(simsArg ?? 150)
  const seedBase = Number(seedArg ?? 1)

  const net = fromJSON2(fs.readFileSync(netPath, 'utf-8'))
  if (net.featDim !== FEATURE_COUNT_V5 || net.actionSlots !== ACTION_SLOTS) {
    throw new Error(`net2 ${net.featDim}/${net.actionSlots} != ${FEATURE_COUNT_V5}/${ACTION_SLOTS}`)
  }
  const delegates: [Policy, Policy] = [greedyHighestDamagePolicy, greedyHighestDamagePolicy]
  const searchRng = mulberry32Stateful(seedBase * 31 + 7)

  const evaluate: MctsOptions['evaluate'] = (n: SearchableNode, me: 0 | 1) => {
    const { value } = forward2(net, encodeStateV5((n as GameNode).stateForEval(), me))
    return Math.min(1, Math.max(0, (value + 1) / 2))
  }
  // Priors = softmax de la tête politique restreint aux coups légaux (collisions bénignes).
  const priors: MctsOptions['priors'] = (actions, nodeS) => {
    const d = (nodeS as GameNode).pendingDecision()
    if (!d || actions.length <= 1) return actions.map(() => 1)
    const { logits } = forward2(net, encodeStateV5(d.state, d.playerIdx))
    const raw = actions.map(a => logits[actionBucket(actionKey(a))])
    const mx = Math.max(...raw)
    return raw.map(l => Math.exp(l - mx))
  }

  // Paires diagonales DÉRIVÉES de TRAINABLE_HEROES (héros i vs i+1, cyclique) : chaque héros
  // apparaît des deux côtés une fois par cycle, et AJOUTER un héros (mb 2026-07-18, ou un futur)
  // l'inclut ICI automatiquement — plus de liste codée en dur à maintenir (l'ancienne oubliait mb).
  // Pas de boss (nx hors TRAINABLE_HEROES). Rotation par seedBase pour que des workers de graines
  // différentes couvrent des paires différentes (cf. avertissement de matchups.ts).
  const H = TRAINABLE_HEROES
  const MATCHUPS: Array<[HeroId, HeroId]> = H.map((h, i) => [h, H[(i + 1) % H.length]])
  const rows: Row[] = []
  const t0 = Date.now()
  for (let g = 0; g < games; g++) {
    const [heroA, heroB] = MATCHUPS[(seedBase + g) % MATCHUPS.length]
    let node = GameNode.root(heroA, heroB, seedBase + g, delegates)
    const gameRows: Row[] = []
    let moveCount = 0
    let guard = 0
    while (!node.isTerminal() && guard++ < 100_000) {
      const actor = node.currentActor()
      if (actor.kind === 'chance') { node = node.continueChance(); continue }
      if (actor.kind !== 'player') break
      const d = node.pendingDecision()!
      const r = mctsSearch(node, actor.idx, { sims, cPuct: 0.7, maxChanceChildren: 6, evaluate, rng: searchRng, priors })
      const total = r.visits.reduce((s, v) => s + v.n, 0)
      if (r.visits.length > 1 && total > 0) {
        const pi = new Float32Array(ACTION_SLOTS)
        for (const v of r.visits) pi[actionBucket(v.key)] += v.n / total
        gameRows.push({ x: encodeStateV5(d.state, actor.idx), pi, actorIdx: actor.idx, z: 0 })
      }
      // Température : tirage ∝ visites en début de partie, argmax ensuite.
      let chosen = r.action
      if (moveCount < TEMP_MOVES && total > 0 && r.visits.length > 1) {
        let t = searchRng() * total
        for (const v of r.visits) { t -= v.n; if (t <= 0) { chosen = v.action; break } }
      }
      moveCount++
      node = node.apply(chosen)
    }
    const winner = node.finalState().winner
    for (const row of gameRows) {
      row.z = winner === null ? 0 : winner === row.actorIdx ? 1 : -1
    }
    rows.push(...gameRows)
    console.log(`game ${g + 1}/${games} ${heroA}-${heroB} winner=${winner} rows=${gameRows.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
  }
  writeDtx2(outPath, rows)
  console.log(`SELFPLAY2 ${JSON.stringify({ games, sims, rows: rows.length, out: outPath })}`)
}

main()
