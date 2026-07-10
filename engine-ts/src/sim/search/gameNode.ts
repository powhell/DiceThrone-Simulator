// GameNode — le seam central du projet strong AI (PLAN_STRONG_AI §2b) : convertit le modèle
// PUSH du moteur (turn.ts appelle policies[p].hook(...) à chaque fenêtre) en modèle PULL pour
// la recherche (à ce nœud, donne-moi les coups légaux ; j'en choisis un ; avance).
//
// Mécanique : REJEU DÉTERMINISTE PAR SCRIPT (décision §2b option B, généralisée depuis le pont
// défense d'interactive.ts). Un nœud = { snapshot d'état au début du tour, script des décisions
// déjà prises ce tour, BANDE des tirages rng du préfixe, état du flux de continuation }. Pour
// connaître la PROCHAINE décision, on SONDE : rejeu du tour sur un CLONE avec des policies qui
// rejouent le script puis capturent le premier appel non scripté (le clone est jeté).
//
// Hooks exposés (migration §5b, un à la fois, parité verte à chaque pas) :
//   tranche 1 — `chooseAbility` (activateAbility, le plus important) ;
//   tranche 2 — `decide` (fenêtres unifiées, pour les DEUX joueurs) ;
//   tranche 3 — les DÉS = nœuds de CHANCE. Le hasard consommé entre deux décisions (jet
//               offensif/défensif, sous-jets, pioches) forme UN segment de chance :
//               `sampleChance(rng)` rejoue préfixe figé + suffixe re-échantillonné (MCTS
//               branche dessus) ; `continueChance()` poursuit le flux rng original — c'est le
//               chemin du test de parité. Zéro modification du moteur : on contrôle l'objet
//               rng injecté (bande + continuation), pas les sites d'appel.
// Le reste (hooks héros bespoke, garde des dés = nœud expert DP) reste délégué aux policies.
import type { AbilityCandidate, DecisionRequest, GameState, HeroId, WindowAction } from '../types.js'
import type { Policy } from '../policy.js'
import type { RNG } from '../rng.js'
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
  | { kind: 'chance' }
  | { kind: 'terminal' }

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

// Source rng contrôlée : rejoue `tape` (les tirages déjà FIGÉS du préfixe du tour), puis tire
// du flux de continuation. C'est le point d'injection des nœuds de chance : re-échantillonner
// un segment = même bande, autre continuation.
function tapedRng(tape: readonly number[], contState: number) {
  let i = 0
  const cont = mulberry32Stateful(0)
  cont.state = contState
  const draws: number[] = []
  const rng: RNG = () => {
    const v = i < tape.length ? tape[i] : cont()
    i++
    draws.push(v)
    return v
  }
  return {
    rng,
    count: () => i,
    all: () => draws.slice(),
    contStateNow: () => cont.state,
  }
}

interface CaptureInfo {
  pending: PendingDecision
  tape: number[]     // tirages figés du début du tour jusqu'à la décision
  contState: number  // état du flux de continuation à la décision
}

// Résultat d'une avancée depuis un contexte de segment (base+script+bande) sous une
// continuation donnée : soit la prochaine décision, soit la fin de partie.
type Advance =
  | { kind: 'decision'; base: GameState; script: ScriptEntry[]; capture: CaptureInfo; newDraws: number }
  | { kind: 'terminal'; base: GameState; newDraws: number }

export class GameNode {
  // Contexte de segment (immuable pour ce nœud) : état réel au début du tour courant, décisions
  // déjà prises ce tour, tirages figés du préfixe, flux de continuation ORIGINAL.
  private constructor(
    private base: GameState,
    private script: ScriptEntry[],
    private fixedTape: number[],
    private contState: number,
    private policies: [Policy, Policy],
  ) {}

  // Calculés à la construction (une sonde avec la continuation originale) :
  private kind!: 'decision' | 'chance' | 'terminal'
  private originalAdvance!: Advance // l'issue sous le flux original (chemin parité)

  static root(heroA: HeroId, heroB: HeroId, seed: number, policies: [Policy, Policy]): GameNode {
    const rng = mulberry32Stateful(seed)
    const state = createInitialGameState(heroA, heroB, rng)
    return GameNode.make(state, [], [], rng.state, policies)
  }

  private static make(
    base: GameState, script: ScriptEntry[], fixedTape: number[], contState: number,
    policies: [Policy, Policy],
  ): GameNode {
    const n = new GameNode(base, script, fixedTape, contState, policies)
    n.originalAdvance = n.advance(contState)
    n.kind = n.originalAdvance.newDraws > 0 ? 'chance'
      : n.originalAdvance.kind === 'terminal' ? 'terminal'
      : 'decision'
    return n
  }

  currentActor(): Actor {
    if (this.kind === 'chance') return { kind: 'chance' }
    if (this.kind === 'terminal') return { kind: 'terminal' }
    return { kind: 'player', idx: this.pendingDecision()!.playerIdx }
  }

  isTerminal(): boolean {
    return this.kind === 'terminal'
  }

  // Nœud de chance : re-échantillonne le segment (préfixe figé, suffixe sous une graine tirée
  // de `rng`). Chaque appel avec une graine différente peut mener à une décision différente —
  // c'est la branche de chance que MCTS échantillonne.
  sampleChance(rng: RNG): GameNode {
    if (this.kind !== 'chance') throw new Error('sampleChance() sur un nœud sans hasard en attente')
    const seed = Math.floor(rng() * 0x7fffffff)
    return this.childFrom(this.advance(mulberry32Stateful(seed).state))
  }

  // Nœud de chance : poursuit le flux rng ORIGINAL (aucun re-échantillonnage). C'est le chemin
  // du test de parité — la partie reproduit exactement runMatch.
  continueChance(): GameNode {
    if (this.kind !== 'chance') throw new Error('continueChance() sur un nœud sans hasard en attente')
    return this.childFrom(this.originalAdvance)
  }

  pendingDecision(): PendingDecision | null {
    if (this.kind !== 'decision') return null
    return (this.originalAdvance as Extract<Advance, { kind: 'decision' }>).capture.pending
  }

  legalActions(): NodeAction[] {
    const d = this.pendingDecision()
    if (!d) return []
    if (d.hook === 'activateAbility') {
      return d.candidates.map(c => ({ kind: 'activateAbility', abilityName: c.name }))
    }
    return d.request.options.map(o => ({ kind: 'window', action: o }))
  }

  apply(action: NodeAction): GameNode {
    const d = this.pendingDecision()
    if (!d) throw new Error('apply() hors d\'un nœud de décision')
    const adv = this.originalAdvance as Extract<Advance, { kind: 'decision' }>
    const entry: ScriptEntry = action.kind === 'activateAbility'
      ? { hook: 'activateAbility', playerIdx: d.playerIdx, abilityName: action.abilityName }
      : { hook: 'decide', playerIdx: d.playerIdx, action: action.action }
    if (entry.hook !== d.hook) throw new Error(`action ${action.kind} incompatible avec la décision en attente (${d.hook})`)
    return GameNode.make(
      adv.base, [...adv.script, entry], adv.capture.tape, adv.capture.contState, this.policies,
    )
  }

  clone(): GameNode {
    // Les champs sont immuables après construction : partager base/script/tape est sûr, seuls
    // les enfants (make) reclonent. Suffisant pour MCTS (le nœud n'est jamais muté).
    return this
  }

  reward(idx: 0 | 1): number {
    if (this.kind !== 'terminal') return 0
    const s = this.finalState()
    if (!s.gameOver || s.winner === null) return 0
    return s.winner === idx ? 1 : -1
  }

  // L'état réel du nœud terminal (pour la parité : PV finaux, log complet).
  finalState(): GameState {
    if (this.kind === 'terminal') return (this.originalAdvance as Extract<Advance, { kind: 'terminal' }>).base
    return this.base
  }

  // --- interne ---------------------------------------------------------------------------

  private childFrom(adv: Advance): GameNode {
    if (adv.kind === 'terminal') {
      const n = new GameNode(adv.base, [], [], 0, this.policies)
      n.kind = 'terminal'
      n.originalAdvance = { kind: 'terminal', base: adv.base, newDraws: 0 }
      return n
    }
    return GameNode.make(adv.base, adv.script, adv.capture.tape, adv.capture.contState, this.policies)
  }

  // Avance depuis le contexte de segment de CE nœud sous la continuation `contState` : rejoue
  // le tour courant (script + bande, puis continuation) ; matérialise les tours entiers sans
  // décision ; s'arrête à la première décision ou à la fin de partie. `newDraws` compte le
  // hasard consommé AU-DELÀ de la bande figée — s'il y en a, un nœud de chance s'impose entre
  // la décision précédente et celle-ci.
  private advance(contState: number): Advance {
    let workBase = this.base
    let workScript = this.script
    let workTape: number[] = this.fixedTape
    let cont = contState
    let newDraws = 0
    let materialized = false // workBase est-il déjà une copie privée ?
    for (;;) {
      if (workBase.gameOver || workBase.turnNumber >= MAX_TURNS) {
        return { kind: 'terminal', base: workBase, newDraws }
      }
      // Sonde sur clone : capture la première décision non scriptée de ce tour.
      const probeState = structuredClone(workBase) as GameState
      const probeSrc = tapedRng(workTape, cont)
      const capture = this.replayTurn(probeState, probeSrc, workScript, true)
      if (capture) {
        // Hasard du segment dans CE tour = tirages jusqu'à la capture, au-delà de la bande
        // figée (les tirages post-capture de la sonde sont des artefacts, ignorés).
        newDraws += capture.tape.length - workTape.length
        return { kind: 'decision', base: workBase, script: workScript, capture, newDraws }
      }
      // Tour complet sans décision : matérialisation sur une copie privée (jamais this.base).
      const realState = materialized ? workBase : (structuredClone(workBase) as GameState)
      materialized = true
      const realSrc = tapedRng(workTape, cont)
      this.replayTurn(realState, realSrc, workScript, false)
      newDraws += realSrc.count() - workTape.length
      workBase = realState
      workScript = []
      workTape = []
      cont = realSrc.contStateNow()
    }
  }

  // Rejoue UN tour sur `state` avec la source rng donnée. Retourne la capture (première
  // décision non scriptée) ou null si le tour se termine entièrement scripté.
  private replayTurn(
    state: GameState, src: ReturnType<typeof tapedRng>, script: ScriptEntry[], probing: boolean,
  ): CaptureInfo | null {
    const activeIdx = state.activePlayerIdx
    state.turnNumber += 1
    const cursor = { i: 0 }
    const probe: { captured: CaptureInfo | null } = { captured: null }
    const policies: [Policy, Policy] = [
      this.interceptor(0, cursor, script, probing ? probe : null, src),
      this.interceptor(1, cursor, script, probing ? probe : null, src),
    ]
    playTurn(state, activeIdx, rngOf(src), policies)
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
    return probe.captured
  }

  // Wrappe les hooks EXPOSÉS de la policy du siège `idx` : rejoue le script (curseur PARTAGÉ
  // entre les deux sièges — l'ordre des appels du moteur est global au tour), puis capture ou
  // délègue. Une entrée de script qui ne correspond pas à l'appel courant = divergence de rejeu
  // (bug) -> on jette, le déterminisme est le contrat central du seam.
  private interceptor(
    idx: 0 | 1, cursor: { i: number }, script: ScriptEntry[],
    probe: { captured: CaptureInfo | null } | null, src: ReturnType<typeof tapedRng>,
  ): Policy {
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
    const capture = (pending: PendingDecision) => {
      if (probe && !probe.captured) {
        probe.captured = { pending, tape: src.all(), contState: src.contStateNow() }
      }
    }
    return {
      ...delegate,
      chooseAbility(state, playerIdx, candidates) {
        const e = takeEntry('activateAbility', playerIdx)
        if (e) return (e as Extract<ScriptEntry, { hook: 'activateAbility' }>).abilityName
        // état FIGÉ au moment de la décision : le rejeu-sonde continue de muter le clone après
        // la capture, or le consommateur (policy réseau, features MCTS) doit voir l'état tel
        // qu'il est quand la décision se pose.
        capture({ hook: 'activateAbility', playerIdx, candidates, state: structuredClone(state) })
        return delegate.chooseAbility(state, playerIdx, candidates)
      },
      decide(state, playerIdx, request) {
        const e = takeEntry('decide', playerIdx)
        if (e) return (e as Extract<ScriptEntry, { hook: 'decide' }>).action
        capture({ hook: 'decide', playerIdx, request, state: structuredClone(state) })
        return delegate.decide(state, playerIdx, request)
      },
    }
  }
}

function rngOf(src: ReturnType<typeof tapedRng>): RNG {
  return src.rng
}

// Pilote générique de la Phase 1 : joue une partie ENTIÈRE via la seule interface GameNode.
// À chaque nœud joueur, la MÊME Policy que runMatch choisit le coup ; à chaque nœud de chance,
// continueChance() poursuit le flux original — c'est le test de parité : résultat identique à
// playTurn piloté en push.
export function playMatchViaGameNode(
  heroA: HeroId, heroB: HeroId, seed: number, policies: [Policy, Policy],
): MatchResult {
  let node = GameNode.root(heroA, heroB, seed, policies)
  let guard = 0
  while (!node.isTerminal() && guard++ < 200_000) {
    if (node.currentActor().kind === 'chance') {
      node = node.continueChance()
      continue
    }
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
