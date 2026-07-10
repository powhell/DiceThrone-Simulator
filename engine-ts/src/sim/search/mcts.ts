// MCTS/PUCT sur l'interface du seam (Phase 2 du PLAN_STRONG_AI). Le caller ne connaît que
// SearchableNode — la partie structurelle de GameNode (§2b) : décisions énumérables, nœuds de
// chance échantillonnables, terminaux avec récompense. AlphaZero-style : pas de rollout, une
// évaluation de feuille fournie par le caller (réseau valeur en vrai, constante dans les tests).
//
// Priors uniformes pour l'instant (pas de tête politique avant la Phase 4) ; les valeurs sont
// stockées dans [0,1] du point de vue de `me`, et la sélection PUCT maximise la valeur DU JOUEUR
// QUI DÉCIDE au nœud (1-Q quand c'est l'adversaire) — le minimax émerge de là.
import type { RNG } from '../rng.js'
import type { Actor, NodeAction } from './gameNode.js'
import { actionKey } from './gameNode.js'

// Ce que la recherche exige d'un état de jeu — GameNode l'implémente ; les tests utilisent un
// jeu jouet. (Sous-ensemble structurel : pas de pendingDecision/continueChance ici, la recherche
// n'en a pas besoin.)
export interface SearchableNode {
  currentActor(): Actor
  legalActions(): NodeAction[]
  apply(action: NodeAction): SearchableNode
  sampleChance(rng: RNG): SearchableNode
  isTerminal(): boolean
  reward(idx: 0 | 1): number // à terminal : +1/-1 (0 si nul ou non terminal)
}

export interface MctsOptions {
  sims: number               // budget : nombre d'itérations sélection->évaluation->backprop
  cPuct: number              // constante d'exploration PUCT
  maxChanceChildren: number  // issues échantillonnées par nœud de chance (progressive widening v1)
  evaluate: (node: SearchableNode, me: 0 | 1) => number // valeur feuille dans [0,1], point de vue `me`
  rng: RNG                   // hasard de la recherche (échantillonnage des nœuds de chance)
  // Priors PUCT optionnels (défaut : uniformes). Renvoie un poids >= 0 par action (normalisé
  // ici). En attendant la tête politique du réseau (Phase 4), un prior heuristique — p.ex.
  // booster le coup que choisirait value-greedy — concentre le budget sur le plausible.
  priors?: (actions: NodeAction[], node: SearchableNode) => number[]
}

interface TreeNode {
  game: SearchableNode
  children: Map<string, TreeNode> // décision : actionKey ; chance : index d'échantillon
  n: number // visites
  w: number // somme des valeurs [0,1] du point de vue de `me`
}

function makeNode(game: SearchableNode): TreeNode {
  return { game, children: new Map(), n: 0, w: 0 }
}

// Choisit le meilleur coup au nœud racine (qui DOIT être une décision de `me`) après `sims`
// itérations : l'action de l'enfant le plus visité — le critère AlphaZero, plus stable que Q.
export function mctsPick(root: SearchableNode, me: 0 | 1, opts: MctsOptions): NodeAction {
  const actor = root.currentActor()
  if (actor.kind !== 'player') throw new Error('mctsPick : la racine doit être un nœud de décision')
  const actions = root.legalActions()
  if (actions.length === 1) return actions[0]
  const tree = makeNode(root)
  for (let s = 0; s < opts.sims; s++) simulate(tree, me, opts)
  let best: NodeAction | null = null
  let bestN = -1
  for (const a of actions) {
    const child = tree.children.get(actionKey(a))
    const n = child ? child.n : 0
    if (n > bestN) { bestN = n; best = a }
  }
  return best!
}

// Une itération : descend l'arbre (PUCT aux décisions, échantillonnage aux nœuds de chance)
// jusqu'à un terminal ou une feuille non visitée, évalue, remonte la valeur.
function simulate(node: TreeNode, me: 0 | 1, opts: MctsOptions): number {
  if (node.game.isTerminal()) {
    const v = (node.game.reward(me) + 1) / 2 // -1/0/+1 -> 0/0.5/1
    node.n += 1; node.w += v
    return v
  }
  if (node.n === 0) {
    // Feuille jamais visitée : évaluer, ne pas étendre (expansion à la visite suivante).
    const v = opts.evaluate(node.game, me)
    node.n += 1; node.w += v
    return v
  }
  const actor = node.game.currentActor()
  let child: TreeNode
  if (actor.kind === 'chance') {
    // Progressive widening v1 : échantillonner de nouvelles issues jusqu'au cap, puis piocher
    // uniformément parmi les issues déjà tirées (chaque tirage suit la vraie distribution, la
    // moyenne des visites converge donc vers l'espérance).
    if (node.children.size < opts.maxChanceChildren) {
      const sampled = node.game.sampleChance(opts.rng)
      child = makeNode(sampled)
      node.children.set(String(node.children.size), child)
    } else {
      const idx = Math.floor(opts.rng() * node.children.size)
      child = node.children.get(String(idx))!
    }
  } else if (actor.kind === 'player') {
    // Décision : PUCT du point de vue du joueur qui décide.
    const actions = node.game.legalActions()
    const sqrtN = Math.sqrt(node.n)
    let priors: number[] | null = null
    if (opts.priors) {
      const w = opts.priors(actions, node.game)
      const sum = w.reduce((s, x) => s + Math.max(0, x), 0)
      if (sum > 0) priors = w.map(x => Math.max(0, x) / sum)
    }
    let bestScore = -Infinity
    let bestAction: NodeAction = actions[0]
    let bestChild: TreeNode | null = null
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i]
      const k = actionKey(a)
      const c = node.children.get(k)
      const n = c ? c.n : 0
      const qMe = c && c.n > 0 ? c.w / c.n : 0.5 // valeur a priori neutre pour l'inexploré
      const q = actor.idx === me ? qMe : 1 - qMe
      const p = priors ? priors[i] : 1 / actions.length
      const u = opts.cPuct * p * sqrtN / (1 + n)
      if (q + u > bestScore) { bestScore = q + u; bestAction = a; bestChild = c ?? null }
    }
    if (!bestChild) {
      bestChild = makeNode(node.game.apply(bestAction))
      node.children.set(actionKey(bestAction), bestChild)
    }
    child = bestChild
  } else {
    throw new Error('simulate : terminal déjà géré plus haut') // exhaustivité du type Actor
  }
  const v = simulate(child, me, opts)
  node.n += 1; node.w += v
  return v
}
