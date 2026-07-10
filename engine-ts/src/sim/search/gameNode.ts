// GameNode — le seam central du projet strong AI (PLAN_STRONG_AI §2b) : convertit le modèle
// PUSH du moteur (turn.ts appelle policies[p].hook(...) à chaque fenêtre) en modèle PULL pour
// la recherche (à ce nœud, donne-moi les coups légaux ; j'en choisis un ; avance).
//
// Mécanique : REJEU DÉTERMINISTE PAR SCRIPT (décision §2b option B, généralisée depuis le pont
// défense d'interactive.ts). Un nœud = { snapshot d'état au début du tour, graine rng, script
// des décisions déjà prises ce tour }. Pour connaître la PROCHAINE décision, on SONDE : rejeu
// du tour sur un CLONE avec une policy qui rejoue le script puis capture le premier appel non
// scripté (le clone est jeté). apply(action) ajoute au script ; quand le tour rejoue sans
// capture, il est matérialisé pour de vrai et on passe au tour suivant.
//
// Phase 1, tranche 1 : SEUL le hook `chooseAbility` (activateAbility — le plus important, §5b)
// est exposé comme point de décision. Tout le reste (cartes, défense, dés=rng interne, hooks
// héros) reste délégué aux policies injectées. Les tranches suivantes migrent les hooks un à
// un — le test de parité (tests/sim/gameNode.parity.test.ts) doit rester vert à chaque pas.
import type { AbilityCandidate, GameState, HeroId } from '../types.js'
import type { Policy } from '../policy.js'
import { mulberry32Stateful } from '../rng.js'
import { playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS, type MatchResult } from '../match.js'

export type NodeAction = { kind: 'activateAbility'; abilityName: string }

// Clé texte stable d'un coup : identité des enfants dans l'arbre MCTS, plus tard index de la
// tête politique (Phase 4).
export function actionKey(a: NodeAction): string {
  return `${a.kind}:${a.abilityName}`
}

export type Actor =
  | { kind: 'player'; idx: 0 | 1 }
  | { kind: 'terminal' }
  // { kind: 'chance' } arrive avec la migration des nœuds de dés (tranche suivante)

// La décision en attente, exposée pour le pilote de parité (délègue à Policy.chooseAbility) et
// pour le futur MCTS (candidates -> features). L'Action reste opaque pour la recherche.
export interface PendingDecision {
  hook: 'activateAbility'
  playerIdx: 0 | 1
  candidates: AbilityCandidate[]
  state: GameState // état du CLONE au moment de la décision (lecture seule)
}

interface Probe {
  // capture du premier appel non scripté pendant le rejeu-sonde (null = le tour rejoue
  // entièrement avec le script → prêt à matérialiser)
  captured: PendingDecision | null
}

export class GameNode {
  private constructor(
    private base: GameState,       // état RÉEL au début du tour courant
    private rngState: number,      // état rng au début du tour courant
    private script: NodeAction[],  // décisions déjà prises ce tour (hooks exposés)
    private policies: [Policy, Policy], // décisions non migrées (délégation)
    private pending: PendingDecision | null, // sondé paresseusement, figé par nœud
  ) {}

  static root(heroA: HeroId, heroB: HeroId, seed: number, policies: [Policy, Policy]): GameNode {
    const rng = mulberry32Stateful(seed)
    const state = createInitialGameState(heroA, heroB, rng)
    const node = new GameNode(state, rng.state, [], policies, null)
    node.advanceToDecisionOrEnd()
    return node
  }

  currentActor(): Actor {
    if (this.base.gameOver || this.base.turnNumber >= MAX_TURNS) return { kind: 'terminal' }
    return { kind: 'player', idx: this.pending!.playerIdx }
  }

  legalActions(): NodeAction[] {
    if (this.isTerminal()) return []
    return this.pending!.candidates.map(c => ({ kind: 'activateAbility', abilityName: c.name }))
  }

  pendingDecision(): PendingDecision | null {
    return this.pending
  }

  apply(action: NodeAction): GameNode {
    const next = new GameNode(this.base, this.rngState, [...this.script, action], this.policies, null)
    next.advanceToDecisionOrEnd()
    return next
  }

  clone(): GameNode {
    return new GameNode(structuredClone(this.base), this.rngState, [...this.script], this.policies, this.pending)
  }

  isTerminal(): boolean {
    return this.base.gameOver || this.base.turnNumber >= MAX_TURNS
  }

  reward(idx: 0 | 1): number {
    if (!this.base.gameOver || this.base.winner === null) return 0
    return this.base.winner === idx ? 1 : -1
  }

  // L'état terminal réel (pour la parité : PV finaux, log complet).
  finalState(): GameState {
    return this.base
  }

  // --- interne : sonde le tour courant ; matérialise les tours qui n'ont plus de décision ---

  // Rejoue le tour courant sur un clone avec le script ; capture la 1re décision non scriptée.
  private probeTurn(): Probe {
    const probe: Probe = { captured: null }
    const clone = structuredClone(this.base) as GameState
    const rng = mulberry32Stateful(0)
    rng.state = this.rngState
    const activeIdx = clone.activePlayerIdx
    clone.turnNumber += 1
    playTurn(clone, activeIdx, rng, this.policiesWithInterceptor(activeIdx, probe))
    return probe
  }

  // Le joueur actif reçoit un chooseAbility qui rejoue le script puis capture ; les décisions
  // capturées sont ensuite répondues par la policy déléguée pour finir le rejeu du clone.
  private policiesWithInterceptor(activeIdx: 0 | 1, probe: Probe): [Policy, Policy] {
    let i = 0
    const script = this.script
    const delegate = this.policies[activeIdx]
    const intercepted: Policy = {
      ...delegate,
      chooseAbility(state, playerIdx, candidates) {
        if (i < script.length) return script[i++].abilityName
        if (!probe.captured) {
          // état FIGÉ au moment de la décision : le rejeu-sonde continue de muter le clone
          // après la capture, or le consommateur (policy réseau, futures features MCTS) doit
          // voir l'état tel qu'il est quand la décision se pose.
          probe.captured = { hook: 'activateAbility', playerIdx, candidates, state: structuredClone(state) }
        }
        i++
        return delegate.chooseAbility(state, playerIdx, candidates)
      },
    }
    return activeIdx === 0 ? [intercepted, this.policies[1]] : [this.policies[0], intercepted]
  }

  // Matérialise le tour courant POUR DE VRAI (le script couvre toutes ses décisions), passe au
  // tour suivant, et enchaîne tant que des tours entiers se jouent sans décision exposée.
  private advanceToDecisionOrEnd(): void {
    for (;;) {
      if (this.base.gameOver || this.base.turnNumber >= MAX_TURNS) return
      const probe = this.probeTurn()
      if (probe.captured) { this.pending = probe.captured; return }
      // Tour sans décision restante : rejeu réel (même graine que la sonde → même résultat).
      const rng = mulberry32Stateful(0)
      rng.state = this.rngState
      const activeIdx = this.base.activePlayerIdx
      this.base.turnNumber += 1
      playTurn(this.base, activeIdx, rng, this.replayPolicies(activeIdx))
      this.base.activePlayerIdx = (1 - activeIdx) as 0 | 1
      this.rngState = rng.state
      this.script = []
    }
  }

  // Policies du rejeu réel : le script répond aux hooks exposés (il les couvre tous, la sonde
  // l'a prouvé) ; au-delà, délégation (jamais atteinte pour les hooks exposés).
  private replayPolicies(activeIdx: 0 | 1): [Policy, Policy] {
    let i = 0
    const script = this.script
    const delegate = this.policies[activeIdx]
    const replaying: Policy = {
      ...delegate,
      chooseAbility(state, playerIdx, candidates) {
        if (i < script.length) return script[i++].abilityName
        return delegate.chooseAbility(state, playerIdx, candidates)
      },
    }
    return activeIdx === 0 ? [replaying, this.policies[1]] : [this.policies[0], replaying]
  }
}

// Pilote générique de la Phase 1 : joue une partie ENTIÈRE via la seule interface GameNode.
// À chaque nœud joueur, la MÊME Policy que runMatch choisit le coup (via pendingDecision) —
// c'est le test de parité : résultat identique à playTurn piloté en push.
export function playMatchViaGameNode(
  heroA: HeroId, heroB: HeroId, seed: number, policies: [Policy, Policy],
): MatchResult {
  let node = GameNode.root(heroA, heroB, seed, policies)
  let guard = 0
  while (!node.isTerminal() && guard++ < 10_000) {
    const d = node.pendingDecision()!
    const name = policies[d.playerIdx].chooseAbility(d.state, d.playerIdx, d.candidates)
    node = node.apply({ kind: 'activateAbility', abilityName: name })
  }
  const s = node.finalState()
  return { winner: s.winner, turns: s.turnNumber, finalState: s }
}
