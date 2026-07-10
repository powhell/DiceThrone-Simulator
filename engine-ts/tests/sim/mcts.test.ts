import { describe, it, expect } from 'vitest'
import { mulberry32 } from '../../src/sim/rng.js'
import type { RNG } from '../../src/sim/rng.js'
// Le ROUGE de la Phase 2 (cœur de recherche) : ce module n'existe pas encore.
import { mctsPick, type SearchableNode } from '../../src/sim/search/mcts.js'
import type { Actor, NodeAction } from '../../src/sim/search/gameNode.js'

// Jeu jouet implémentant l'interface du seam (structurel — ce que GameNode expose). L'arbre est
// décrit en dur : assez pour vérifier PUCT, l'inversion de perspective adverse et les nœuds de
// chance, en millisecondes (le vrai GameNode coûte des secondes par coup).
type Spec =
  | { t: 'decision'; actor: 0 | 1; moves: Record<string, Spec> }
  | { t: 'chance'; outcomes: Array<{ p: number; next: Spec }> }
  | { t: 'terminal'; rewardFor0: -1 | 0 | 1 }

class Toy implements SearchableNode {
  constructor(private spec: Spec) {}
  currentActor(): Actor {
    if (this.spec.t === 'terminal') return { kind: 'terminal' }
    if (this.spec.t === 'chance') return { kind: 'chance' }
    return { kind: 'player', idx: this.spec.actor }
  }
  legalActions(): NodeAction[] {
    if (this.spec.t !== 'decision') return []
    return Object.keys(this.spec.moves).map(name => ({ kind: 'activateAbility', abilityName: name }))
  }
  apply(a: NodeAction): Toy {
    if (this.spec.t !== 'decision' || a.kind !== 'activateAbility') throw new Error('apply invalide')
    return new Toy(this.spec.moves[a.abilityName])
  }
  sampleChance(rng: RNG): Toy {
    if (this.spec.t !== 'chance') throw new Error('sampleChance invalide')
    let r = rng()
    for (const o of this.spec.outcomes) { r -= o.p; if (r <= 0) return new Toy(o.next) }
    return new Toy(this.spec.outcomes[this.spec.outcomes.length - 1].next)
  }
  isTerminal(): boolean { return this.spec.t === 'terminal' }
  reward(idx: 0 | 1): number {
    if (this.spec.t !== 'terminal') return 0
    return idx === 0 ? this.spec.rewardFor0 : -this.spec.rewardFor0
  }
}

const win: Spec = { t: 'terminal', rewardFor0: 1 }
const loss: Spec = { t: 'terminal', rewardFor0: -1 }
const draw: Spec = { t: 'terminal', rewardFor0: 0 }
const opts = { sims: 400, cPuct: 1.4, maxChanceChildren: 8, evaluate: () => 0.5, rng: mulberry32(42) }

describe('mctsPick (Phase 2 — cœur de recherche sur l\'interface du seam)', () => {
  it('choisit le coup gagnant évident', () => {
    const root = new Toy({ t: 'decision', actor: 0, moves: { bad: loss, good: win } })
    expect(mctsPick(root, 0, opts)).toEqual({ kind: 'activateAbility', abilityName: 'good' })
  })

  it('anticipe la meilleure réponse adverse (inversion de perspective)', () => {
    // A : l'adversaire choisit ensuite -> il prendra ma défaite. B : nul garanti. B > A.
    const root = new Toy({
      t: 'decision', actor: 0, moves: {
        A: { t: 'decision', actor: 1, moves: { kill: loss, spare: win } },
        B: draw,
      },
    })
    expect(mctsPick(root, 0, opts)).toEqual({ kind: 'activateAbility', abilityName: 'B' })
  })

  it('évalue un nœud de chance par échantillonnage (80 % gagnant > nul certain)', () => {
    const root = new Toy({
      t: 'decision', actor: 0, moves: {
        risky: { t: 'chance', outcomes: [{ p: 0.8, next: win }, { p: 0.2, next: loss }] },
        safe: draw,
      },
    })
    expect(mctsPick(root, 0, opts)).toEqual({ kind: 'activateAbility', abilityName: 'risky' })
  })

  it('évite un nœud de chance défavorable (20 % gagnant < nul certain)', () => {
    const root = new Toy({
      t: 'decision', actor: 0, moves: {
        risky: { t: 'chance', outcomes: [{ p: 0.2, next: win }, { p: 0.8, next: loss }] },
        safe: draw,
      },
    })
    expect(mctsPick(root, 0, opts)).toEqual({ kind: 'activateAbility', abilityName: 'safe' })
  })
})
