// GameNode — le seam central du projet strong AI (PLAN_STRONG_AI §2b) : convertit le modèle
// PUSH du moteur (turn.ts appelle policies[p].hook(...) à chaque fenêtre) en modèle PULL pour
// la recherche (à ce nœud, donne-moi les coups légaux ; j'en choisis un ; avance).
//
// Mécanique : REJEU DÉTERMINISTE PAR SCRIPT (décision §2b option B, généralisée depuis le pont
// défense d'interactive.ts). Un nœud = { snapshot d'état au début du tour, graine rng, script
// des décisions déjà prises ce tour }. Pour connaître la PROCHAINE décision, on SONDE : rejeu
// du tour sur un CLONE avec des policies qui rejouent le script puis capturent le premier appel
// non scripté (le clone est jeté). apply(action) ajoute au script ; quand le tour rejoue sans
// capture, il est matérialisé pour de vrai et on passe au tour suivant.
//
// Hooks exposés (migration §5b, un à la fois, parité verte à chaque pas) :
//   tranche 1 — `chooseAbility` (activateAbility, le plus important) ;
//   tranche 2 — `decide` (fenêtres unifiées mainPhase/defense/offensiveRoll/defenseRoll,
//               pour les DEUX joueurs — le défenseur décide pendant le tour de l'attaquant).
// Tout le reste (dés=rng interne, hooks héros bespoke) reste délégué aux policies injectées.
import type { AbilityCandidate, DecisionRequest, GameState, HeroId, WindowAction } from '../types.js'
import type { Policy } from '../policy.js'
import { mulberry32Stateful } from '../rng.js'
import { playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS, type MatchResult } from '../match.js'

export type NodeAction =
  | { kind: 'activateAbility'; abilityName: string }
  | { kind: 'window'; action: WindowAction }

// Clé texte stable d'un coup : identité des enfants dans l'arbre MCTS, plus tard index de la
// tête politique (Phase 4). Sérialisation à clés triées : deux objets égaux -> même clé, quel
// que soit l'ordre d'insertion des propriétés au site de construction.
export function actionKey(a: NodeAction): string {
  if (a.kind === 'activateAbility') return `activateAbility:${a.abilityName}`
  return `window:${stableStringify(a.action)}`
}

function stableStringify(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`
  const o = v as Record<string, unknown>
  const keys = Object.keys(o).filter(k => o[k] !== undefined).sort()
  return `{${keys.map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`
}

export type Actor =
  | { kind: 'player'; idx: 0 | 1 }
  | { kind: 'terminal' }
  // { kind: 'chance' } arrive avec la migration des nœuds de dés (tranche suivante)

// La décision en attente, exposée pour le pilote de parité (délègue au même hook de Policy) et
// pour le futur MCTS (contexte -> features). L'Action reste opaque pour la recherche.
export type PendingDecision =
  | { hook: 'activateAbility'; playerIdx: 0 | 1; candidates: AbilityCandidate[]; state: GameState }
  | { hook: 'decide'; playerIdx: 0 | 1; request: DecisionRequest; state: GameState }

// Une entrée de script = une décision déjà prise ce tour, dans l'ordre EXACT des appels du
// moteur (déterministe : même état + même rng + mêmes réponses => même séquence d'appels).
type ScriptEntry =
  | { hook: 'activateAbility'; playerIdx: 0 | 1; abilityName: string }
  | { hook: 'decide'; playerIdx: 0 | 1; action: WindowAction }

interface Probe {
  captured: PendingDecision | null // null = le tour rejoue entièrement avec le script
}

export class GameNode {
  private constructor(
    private base: GameState,       // état RÉEL au début du tour courant
    private rngState: number,      // état rng au début du tour courant
    private script: ScriptEntry[], // décisions déjà prises ce tour (hooks exposés)
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
    if (this.isTerminal()) return { kind: 'terminal' }
    return { kind: 'player', idx: this.pending!.playerIdx }
  }

  legalActions(): NodeAction[] {
    if (this.isTerminal()) return []
    const d = this.pending!
    if (d.hook === 'activateAbility') {
      return d.candidates.map(c => ({ kind: 'activateAbility', abilityName: c.name }))
    }
    return d.request.options.map(o => ({ kind: 'window', action: o }))
  }

  pendingDecision(): PendingDecision | null {
    return this.pending
  }

  apply(action: NodeAction): GameNode {
    const d = this.pending
    if (!d) throw new Error('apply() sur un nœud terminal')
    const entry: ScriptEntry = action.kind === 'activateAbility'
      ? { hook: 'activateAbility', playerIdx: d.playerIdx, abilityName: action.abilityName }
      : { hook: 'decide', playerIdx: d.playerIdx, action: action.action }
    if (entry.hook !== d.hook) throw new Error(`action ${action.kind} incompatible avec la décision en attente (${d.hook})`)
    const next = new GameNode(this.base, this.rngState, [...this.script, entry], this.policies, null)
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

  // Rejoue le tour courant sur `state` avec le script. En mode sonde (probe fourni), capture la
  // première décision non scriptée puis laisse la délégation finir le tour (état jeté). En mode
  // matérialisation (probe absent), le script couvre tout — la sonde l'a prouvé.
  private replayTurn(state: GameState, probe: Probe | null): number {
    const rng = mulberry32Stateful(0)
    rng.state = this.rngState
    const activeIdx = state.activePlayerIdx
    state.turnNumber += 1
    const cursor = { i: 0 }
    const policies: [Policy, Policy] = [
      this.interceptor(0, cursor, probe),
      this.interceptor(1, cursor, probe),
    ]
    playTurn(state, activeIdx, rng, policies)
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    return rng.state
  }

  // Wrappe les hooks EXPOSÉS de la policy du siège `idx` : rejoue le script (curseur PARTAGÉ
  // entre les deux sièges — l'ordre des appels du moteur est global au tour), puis capture ou
  // délègue. Une entrée de script qui ne correspond pas à l'appel courant = divergence de rejeu
  // (bug) -> on jette, le déterminisme est le contrat central du seam.
  private interceptor(idx: 0 | 1, cursor: { i: number }, probe: Probe | null): Policy {
    const script = this.script
    const delegate = this.policies[idx]
    const takeEntry = (hook: ScriptEntry['hook'], playerIdx: 0 | 1): ScriptEntry | null => {
      if (cursor.i >= script.length) return null
      const e = script[cursor.i]
      if (e.hook !== hook || e.playerIdx !== playerIdx) {
        throw new Error(`rejeu divergent : script[${cursor.i}] = ${e.hook}/p${e.playerIdx}, appel = ${hook}/p${playerIdx}`)
      }
      cursor.i++
      return e
    }
    return {
      ...delegate,
      chooseAbility(state, playerIdx, candidates) {
        const e = takeEntry('activateAbility', playerIdx)
        if (e) return (e as Extract<ScriptEntry, { hook: 'activateAbility' }>).abilityName
        if (probe && !probe.captured) {
          // état FIGÉ au moment de la décision : le rejeu-sonde continue de muter le clone
          // après la capture, or le consommateur (policy réseau, features MCTS) doit voir
          // l'état tel qu'il est quand la décision se pose.
          probe.captured = { hook: 'activateAbility', playerIdx, candidates, state: structuredClone(state) }
        }
        return delegate.chooseAbility(state, playerIdx, candidates)
      },
      decide(state, playerIdx, request) {
        const e = takeEntry('decide', playerIdx)
        if (e) return (e as Extract<ScriptEntry, { hook: 'decide' }>).action
        if (probe && !probe.captured) {
          probe.captured = { hook: 'decide', playerIdx, request, state: structuredClone(state) }
        }
        return delegate.decide(state, playerIdx, request)
      },
    }
  }

  // Matérialise les tours entiers qui se jouent sans décision exposée ; s'arrête à la première
  // décision à prendre (pending) ou à la fin de partie.
  private advanceToDecisionOrEnd(): void {
    for (;;) {
      if (this.isTerminal()) return
      const probe: Probe = { captured: null }
      const clone = structuredClone(this.base) as GameState
      this.replayTurn(clone, probe)
      if (probe.captured) { this.pending = probe.captured; return }
      // Tour sans décision restante : rejeu réel (même graine que la sonde → même résultat).
      this.rngState = this.replayTurn(this.base, null)
      this.script = []
    }
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
  while (!node.isTerminal() && guard++ < 100_000) {
    const d = node.pendingDecision()!
    if (d.hook === 'activateAbility') {
      const name = policies[d.playerIdx].chooseAbility(d.state, d.playerIdx, d.candidates)
      node = node.apply({ kind: 'activateAbility', abilityName: name })
    } else {
      const action = policies[d.playerIdx].decide(d.state, d.playerIdx, d.request)
      node = node.apply({ kind: 'window', action })
    }
  }
  const s = node.finalState()
  return { winner: s.winner, turns: s.turnNumber, finalState: s }
}
