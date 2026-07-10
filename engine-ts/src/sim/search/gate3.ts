// Gate de GÉNÉRATION (Phase 5) : l'arbitre de la boucle AlphaZero. Oppose deux agents MCTS
// guidés chacun par un réseau 2 têtes (ou la baseline value-greedy v4 : « vg »). Un candidat
// n'est promu que s'il bat le champion > 55 % avec un Wilson hors de 50 % — le banc de force
// Phase 0 appliqué au gating.
//
// Usage : npx tsx src/sim/search/gate3.ts <netA.json> <netB.json|vg> <gamesPerMatchup=4> <sims=150> <seedBase=5000>
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { greedyHighestDamagePolicy } from '../policy.js'
import { fromJSON, forward, fromJSON2, forward2, type Network2 } from '../rl/network.js'
import { encodeState, FEATURE_COUNT } from '../rl/features.js'
import { encodeStateV5, FEATURE_COUNT_V5 } from '../rl/featuresV5.js'
import { createValueGreedyPolicy } from '../rl/valueGreedyPolicy.js'
import { mulberry32Stateful } from '../rng.js'
import { wilson } from '../bench.js'
import { GameNode, actionKey, type NodeAction } from './gameNode.js'
import { mctsSearch, type MctsOptions, type SearchableNode } from './mcts.js'
import { actionBucket, ACTION_SLOTS } from './actionSpace.js'

interface NodeAgent { pick(node: GameNode, seat: 0 | 1): NodeAction }

function net2Agent(net: Network2, sims: number, rng: () => number): NodeAgent {
  const evaluate: MctsOptions['evaluate'] = (n: SearchableNode, me: 0 | 1) => {
    const { value } = forward2(net, encodeStateV5((n as GameNode).stateForEval(), me))
    return Math.min(1, Math.max(0, (value + 1) / 2))
  }
  const priors: MctsOptions['priors'] = (actions, nodeS) => {
    const d = (nodeS as GameNode).pendingDecision()
    if (!d || actions.length <= 1) return actions.map(() => 1)
    const { logits } = forward2(net, encodeStateV5(d.state, d.playerIdx))
    const raw = actions.map(a => logits[actionBucket(actionKey(a))])
    const mx = Math.max(...raw)
    return raw.map(l => Math.exp(l - mx))
  }
  return {
    pick(node, seat) {
      return mctsSearch(node, seat, { sims, cPuct: 0.7, maxChanceChildren: 6, evaluate, rng, priors }).action
    },
  }
}

function vgAgent(): { agent: NodeAgent; policy: Policy } {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
  const win: { AI_WEIGHTS?: unknown } = {}
  new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
  const net = fromJSON(JSON.stringify(win.AI_WEIGHTS))
  if (net.sizes[0] !== FEATURE_COUNT) throw new Error('ai-weights incompatibles avec features v4')
  const vg = createValueGreedyPolicy(net)
  const agent: NodeAgent = {
    pick(node, seat) {
      const d = node.pendingDecision()!
      if (d.hook === 'activateAbility') {
        return { kind: 'activateAbility', abilityName: vg.chooseAbility(d.state, seat, d.candidates) }
      }
      return { kind: 'window', action: vg.decide(d.state, seat, d.request) }
    },
  }
  return { agent, policy: vg }
}

function loadNet2(p: string): Network2 {
  const net = fromJSON2(fs.readFileSync(p, 'utf-8'))
  if (net.featDim !== FEATURE_COUNT_V5 || net.actionSlots !== ACTION_SLOTS) {
    throw new Error(`${p}: ${net.featDim}/${net.actionSlots} != ${FEATURE_COUNT_V5}/${ACTION_SLOTS}`)
  }
  return net
}

function main(): void {
  const [aPath, bPath, gamesArg, simsArg, seedArg] = process.argv.slice(2)
  if (!aPath || !bPath) { console.error('usage: gate3.ts <netA.json> <netB.json|vg> [gamesPerMatchup] [sims] [seedBase]'); process.exit(1) }
  const gamesPerMatchup = Number(gamesArg ?? 4)
  const sims = Number(simsArg ?? 150)
  const seedBase = Number(seedArg ?? 5000)

  const rngA = mulberry32Stateful(seedBase * 7 + 1)
  const rngB = mulberry32Stateful(seedBase * 7 + 2)
  const agentA = net2Agent(loadNet2(aPath), sims, rngA)
  let agentB: NodeAgent
  let delegates: [Policy, Policy] = [greedyHighestDamagePolicy, greedyHighestDamagePolicy]
  if (bPath === 'vg') {
    const { agent } = vgAgent()
    agentB = agent
  } else {
    agentB = net2Agent(loadNet2(bPath), sims, rngB)
  }

  const MATCHUPS: Array<[HeroId, HeroId]> = [['sm', 'th'], ['hh', 'bw'], ['py', 'du'], ['fm', 'rv'], ['dr', 'se']]
  let aWins = 0, bWins = 0, nulls = 0
  let seed = seedBase
  const t0 = Date.now()
  for (const [heroA, heroB] of MATCHUPS) {
    for (let pair = 0; pair < Math.ceil(gamesPerMatchup / 2); pair++) {
      const pairSeed = seed++
      for (const aSeat of [0, 1] as const) {
        const agents: [NodeAgent, NodeAgent] = aSeat === 0 ? [agentA, agentB] : [agentB, agentA]
        let node = GameNode.root(heroA, heroB, pairSeed, delegates)
        let guard = 0
        while (!node.isTerminal() && guard++ < 200_000) {
          const actor = node.currentActor()
          if (actor.kind === 'chance') { node = node.continueChance(); continue }
          if (actor.kind !== 'player') break
          node = node.apply(agents[actor.idx].pick(node, actor.idx))
        }
        const winner = node.finalState().winner
        if (winner === null) nulls += 1
        else if (winner === aSeat) aWins += 1
        else bWins += 1
        console.log(`game ${heroA}-${heroB} seed=${pairSeed} aSeat=${aSeat} -> ${winner === null ? 'null' : winner === aSeat ? 'A' : 'B'} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
      }
    }
  }
  const decisive = aWins + bWins
  const winrate = decisive > 0 ? aWins / decisive : 0.5
  console.log('RESULT ' + JSON.stringify({ a: aPath, b: bPath, sims, games: aWins + bWins + nulls, aWins, bWins, nulls, winrate, ci: wilson(aWins, decisive) }))
}

main()
