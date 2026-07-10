// Gate de la Phase 2 (PLAN_STRONG_AI §3) — LE test rouge du projet : MCTS(réseau) doit battre
// value-greedy(MÊME réseau) à > 55 %, intervalle de Wilson hors de 50 %. Même évaluateur des
// deux côtés : la seule variable est LA RECHERCHE. Parties réelles jouées via le seam GameNode ;
// info parfaite assumée (Phase 2 « triche » : pas de déterminisation avant la Phase 3).
//
// Usage : npx tsx src/sim/search/gate2.ts <gamesPerMatchup=4> <sims=50> <seedBase=5000> <priors=0|1> <eval=net|rollout>
// priors=1 : le coup que choisirait value-greedy reçoit ~50 % du prior PUCT (le reste uniforme)
// — concentre le budget de recherche en attendant la tête politique (Phase 4).
// eval=rollout : au lieu de noter l'état MI-TOUR (où la sonde du juge peut montrer qu'il est
// mal calibré), chaque feuille FINIT le tour courant avec value-greedy et note l'état au début
// du tour suivant — le régime d'entraînement du réseau ; partie finie en route = résultat réel.
// Paires miroir (même graine, sièges échangés) comme benchStrength. Imprime une ligne RESULT.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { fromJSON, forward } from '../rl/network.js'
import { encodeState, FEATURE_COUNT } from '../rl/features.js'
import { createValueGreedyPolicy } from '../rl/valueGreedyPolicy.js'
import { mulberry32Stateful } from '../rng.js'
import { wilson } from '../bench.js'
import { GameNode, actionKey, type NodeAction } from './gameNode.js'
import { mctsPick, type MctsOptions, type SearchableNode } from './mcts.js'

interface NodeAgent { pick(node: GameNode, seat: 0 | 1): NodeAction }

// L'agent baseline : les MÊMES choix que value-greedy dans runMatch, mais au travers du seam.
function policyAgent(policy: Policy): NodeAgent {
  return {
    pick(node, seat) {
      const d = node.pendingDecision()!
      if (d.hook === 'activateAbility') {
        return { kind: 'activateAbility', abilityName: policy.chooseAbility(d.state, seat, d.candidates) }
      }
      if (d.hook === 'discard') {
        const full = policy.chooseCardsToDiscard(d.state, seat, d.maxHandSize)
        const overflow = d.state.players[seat].hand.length - d.maxHandSize
        return { kind: 'sellCard', cardId: full[overflow - d.mustSell] ?? d.hand[0] }
      }
      return { kind: 'window', action: policy.decide(d.state, seat, d.request) }
    },
  }
}

function mctsAgent(evaluate: MctsOptions['evaluate'], sims: number, rng: () => number, priors: MctsOptions['priors'] | undefined, chanceKids: number, cPuct: number): NodeAgent {
  return {
    pick(node, seat) {
      return mctsPick(node, seat, { sims, cPuct, maxChanceChildren: chanceKids, evaluate, rng, priors })
    },
  }
}

// Une partie complète via GameNode : chaque joueur décide à ses nœuds, la chance suit le flux
// rng original (les dés de la VRAIE partie ne sont pas re-échantillonnés — seule la recherche
// interne de MCTS échantillonne, sur des branches jetables).
function runNodeMatch(heroA: HeroId, heroB: HeroId, seed: number, agents: [NodeAgent, NodeAgent], policies: [Policy, Policy]): 0 | 1 | null {
  let node = GameNode.root(heroA, heroB, seed, policies)
  let guard = 0
  while (!node.isTerminal() && guard++ < 200_000) {
    const actor = node.currentActor()
    if (actor.kind === 'chance') { node = node.continueChance(); continue }
    if (actor.kind === 'player') {
      node = node.apply(agents[actor.idx].pick(node, actor.idx))
    }
  }
  return node.finalState().winner
}

function main(): void {
  const [gamesArg, simsArg, seedArg, priorsArg] = process.argv.slice(2)
  const gamesPerMatchup = Number(gamesArg ?? 4)
  const sims = Number(simsArg ?? 50)
  const seedBase = Number(seedArg ?? 5000)
  const usePriors = Number(priorsArg ?? 0) === 1
  const evalMode = (process.argv.slice(2)[4] ?? 'net') as 'net' | 'rollout'
  const chanceKids = Number(process.argv.slice(2)[5] ?? 6)
  const cPuct = Number(process.argv.slice(2)[6] ?? 1.5)

  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')
  const win: { AI_WEIGHTS?: unknown } = {}
  new Function('window', fs.readFileSync(path.join(root, 'static/ai-weights.js'), 'utf8'))(win)
  const net = fromJSON(JSON.stringify(win.AI_WEIGHTS))
  if (net.sizes[0] !== FEATURE_COUNT) throw new Error(`ai-weights ${net.sizes[0]} != FEATURE_COUNT ${FEATURE_COUNT}`)

  const vg = createValueGreedyPolicy(net)
  const policies: [Policy, Policy] = [vg, vg] // hooks non migrés : mêmes choix des deux côtés
  const netEval = (state: ReturnType<GameNode['stateForEval']>, me: 0 | 1): number => {
    // Sortie réseau = tanh dans [-1,1] (network.ts) -> remap [0,1], l'échelle de valeurs MCTS.
    // (Un clamp naïf [0,1] écrasait à 0 toutes les positions perdantes — trouvé au smoke.)
    const v = forward(net, [encodeState(state, me)])[0]
    return Math.min(1, Math.max(0, (v + 1) / 2))
  }
  const evaluate: MctsOptions['evaluate'] = evalMode === 'net'
    ? (n: SearchableNode, me: 0 | 1) => netEval((n as GameNode).stateForEval(), me)
    : (n: SearchableNode, me: 0 | 1) => {
        // rollout : finir le tour courant (décisions = value-greedy, chance = flux du nœud),
        // noter au début du tour suivant ; terminal en route = résultat réel.
        let cur = n as GameNode
        const startTurn = cur.stateForEval().turnNumber
        for (let guard = 0; guard < 500; guard++) {
          if (cur.isTerminal()) return (cur.reward(me) + 1) / 2
          const actor = cur.currentActor()
          if (actor.kind === 'chance') { cur = cur.continueChance(); continue }
          if (actor.kind !== 'player') break
          const st = cur.stateForEval()
          if (st.turnNumber > startTurn) return netEval(st, me)
          cur = cur.apply(baseline.pick(cur, actor.idx))
        }
        return netEval(cur.stateForEval(), me)
      }
  const searchRng = mulberry32Stateful(seedBase * 7 + 1)
  // Prior heuristique : le coup que choisirait value-greedy pèse (n-1) contre 1 pour chacun des
  // autres -> ~50 % de la masse. La valeur garde le dernier mot (testé : prior trompeur corrigé).
  const priors: MctsOptions['priors'] | undefined = usePriors
    ? (actions, nodeS) => {
        const d = (nodeS as GameNode).pendingDecision()
        if (!d || actions.length <= 1 || d.hook === 'discard') return actions.map(() => 1)
        const pickKey = d.hook === 'activateAbility'
          ? actionKey({ kind: 'activateAbility', abilityName: vg.chooseAbility(d.state, d.playerIdx, d.candidates) })
          : actionKey({ kind: 'window', action: vg.decide(d.state, d.playerIdx, d.request) })
        const boost = Math.max(1, actions.length - 1)
        return actions.map(a => (actionKey(a) === pickKey ? boost : 1))
      }
    : undefined
  const mcts = mctsAgent(evaluate, sims, searchRng, priors, chanceKids, cPuct)
  const baseline = policyAgent(vg)

  const MATCHUPS: Array<[HeroId, HeroId]> = [['sm', 'th'], ['hh', 'bw'], ['py', 'du'], ['fm', 'rv'], ['dr', 'se']]
  let aWins = 0, bWins = 0, draws = 0, timeouts = 0
  let seed = seedBase
  const t0 = Date.now()
  for (const [heroA, heroB] of MATCHUPS) {
    for (let pair = 0; pair < Math.ceil(gamesPerMatchup / 2); pair++) {
      const pairSeed = seed++
      for (const aSeat of [0, 1] as const) {
        const agents: [NodeAgent, NodeAgent] = aSeat === 0 ? [mcts, baseline] : [baseline, mcts]
        const winner = runNodeMatch(heroA, heroB, pairSeed, agents, policies)
        if (winner === null) timeouts += 1 // (nul OU cap — départagé si besoin, compte à part)
        else if (winner === aSeat) aWins += 1
        else bWins += 1
        console.log(`game ${heroA}-${heroB} seed=${pairSeed} mctsSeat=${aSeat} -> ${winner === null ? 'null' : winner === aSeat ? 'MCTS' : 'baseline'} (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
      }
    }
  }
  const decisive = aWins + bWins
  const winrate = decisive > 0 ? aWins / decisive : 0.5
  const ci = wilson(aWins, decisive)
  console.log('RESULT ' + JSON.stringify({ sims, priors: usePriors ? 1 : 0, eval: evalMode, chanceKids, cPuct, games: aWins + bWins + draws + timeouts, mctsWins: aWins, baselineWins: bWins, nullResults: draws + timeouts, winrate, ci }))
}

main()
