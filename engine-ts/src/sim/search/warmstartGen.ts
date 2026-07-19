// Génère des données de BEHAVIOR-CLONING de value-greedy pour DÉMARRER CHAUD le réseau 2-têtes
// (diagnostic 2026-07-19 : le loop AlphaZero parti d'un réseau aléatoire ne décolle jamais —
// champion ≈ aléatoire après 24 rondes. Le fix nº1 est de partir d'un joueur déjà compétent).
//
// value-greedy joue les DEUX sièges via GameNode (mêmes hooks migrés qu'en self-play + gate). À
// chaque décision où il y a un vrai choix, on enregistre :
//   x  = featuresV5 du point de vue de l'acteur (même encodage qu'à l'inférence) ;
//   pi = one-hot sur le bucket de l'action que value-greedy a choisie (cible tête politique) ;
//   z  = résultat ±1 du point de vue de l'acteur (cible tête valeur), 0 si nul.
// On entraîne ensuite le réseau 2-têtes là-dessus (train.py train2 depuis gen0) : sa politique
// imite value-greedy, donc les priors PUCT concentrent enfin la recherche sur le plausible.
//
// Usage : npx tsx src/sim/search/warmstartGen.ts <out.dtx2> <games=40> <seedBase=1>
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON } from '../rl/network.js'
import { createValueGreedyPolicy } from '../rl/valueGreedyPolicy.js'
import { encodeStateV5, FEATURE_COUNT_V5 } from '../rl/featuresV5.js'
import { TRAINABLE_HEROES } from '../rl/matchups.js'
import { GameNode, actionKey, type NodeAction } from './gameNode.js'
import { actionBucket, ACTION_SLOTS } from './actionSpace.js'

interface Row { x: number[]; bucket: number; actorIdx: 0 | 1; z: number }

// Même format DTX2 que selfplay2 (featDim | actionSlots | count | rows de feat + valeur + politique).
// La politique est ici un one-hot sur le bucket choisi (elle somme donc à 1, comme une distribution).
function writeDtx2(outPath: string, rows: Row[]): void {
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
    for (let i = 0; i < ACTION_SLOTS; i++) { buf.writeFloatLE(i === r.bucket ? 1 : 0, off); off += 4 }
  }
  fs.writeFileSync(outPath, buf)
}

function loadValueGreedy(): Policy {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
  const win: { AI_WEIGHTS?: unknown } = {}
  new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
  return createValueGreedyPolicy(fromJSON(JSON.stringify(win.AI_WEIGHTS)))
}

function main(): void {
  const [outPath, gamesArg, seedArg] = process.argv.slice(2)
  if (!outPath) { console.error('usage: warmstartGen.ts <out.dtx2> [games] [seedBase]'); process.exit(1) }
  const games = Number(gamesArg ?? 40)
  const seedBase = Number(seedArg ?? 1)

  const vg = loadValueGreedy()
  const policies: [Policy, Policy] = [vg, vg]
  const H = TRAINABLE_HEROES
  const MATCHUPS: Array<[HeroId, HeroId]> = H.map((h, i) => [h, H[(i + 1) % H.length]])

  const rows: Row[] = []
  const t0 = Date.now()
  for (let g = 0; g < games; g++) {
    const [heroA, heroB] = MATCHUPS[(seedBase + g) % MATCHUPS.length]
    let node = GameNode.root(heroA, heroB, seedBase + g, policies)
    const gameRows: Row[] = []
    let guard = 0
    while (!node.isTerminal() && guard++ < 200_000) {
      const actor = node.currentActor()
      if (actor.kind === 'chance') { node = node.continueChance(); continue }
      if (actor.kind !== 'player') break
      const d = node.pendingDecision()!
      // value-greedy choisit, EXACTEMENT comme playMatchViaGameNode / le vgAgent du gate.
      let chosen: NodeAction
      if (d.hook === 'activateAbility') {
        chosen = { kind: 'activateAbility', abilityName: vg.chooseAbility(d.state, d.playerIdx, d.candidates) }
      } else if (d.hook === 'discard') {
        const full = vg.chooseCardsToDiscard(d.state, d.playerIdx, d.maxHandSize)
        const overflow = d.state.players[d.playerIdx].hand.length - d.maxHandSize
        chosen = { kind: 'sellCard', cardId: full[overflow - d.mustSell] ?? d.hand[0] }
      } else {
        chosen = { kind: 'window', action: vg.decide(d.state, d.playerIdx, d.request) }
      }
      // n'enregistrer que les VRAIS choix (>1 action légale) — un coup forcé n'apprend rien.
      if (node.legalActions().length > 1) {
        gameRows.push({
          x: encodeStateV5(d.state, actor.idx),
          bucket: actionBucket(actionKey(chosen)),
          actorIdx: actor.idx, z: 0,
        })
      }
      node = node.apply(chosen)
    }
    const winner = node.finalState().winner
    for (const r of gameRows) r.z = winner === null ? 0 : winner === r.actorIdx ? 1 : -1
    rows.push(...gameRows)
    console.log(`game ${g + 1}/${games} ${heroA}-${heroB} winner=${winner} rows=${gameRows.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
  }
  writeDtx2(outPath, rows)
  console.log('WARMSTART_GEN ' + JSON.stringify({ games, rows: rows.length, out: outPath }))
}

main()
