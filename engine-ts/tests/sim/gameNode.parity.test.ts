import { describe, it, expect } from 'vitest'
import { runMatch } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import type { HeroId } from '../../src/sim/types.js'
// Le ROUGE de la Phase 1 (PLAN_STRONG_AI §5c) : ce module n'existe pas encore.
import { playMatchViaGameNode, GameNode } from '../../src/sim/search/gameNode.js'

// Test de parité : une partie ENTIÈRE pilotée par GameNode.legalActions/apply (à chaque nœud
// joueur, la MÊME Policy choisit le coup) doit produire un résultat IDENTIQUE à playTurn/runMatch
// — vainqueur, PV finaux et log complet (le log contient chaque jet de dés, donc l'égalité des
// logs prouve aussi l'égalité des états rng). Vert = le seam ré-expose exactement les décisions
// du moteur, ni plus ni moins.
describe('GameNode — parité avec playTurn (Phase 1)', () => {
  const DUELS: Array<[HeroId, HeroId]> = [['sm', 'th'], ['hh', 'bw'], ['py', 'du']]
  const SEEDS = [1, 2, 3]

  // Tranche 2 : les fenêtres `decide` (mainPhase/defense/offensiveRoll/defenseRoll, les DEUX
  // joueurs) doivent être des nœuds GameNode — pas des appels internes délégués. hh-bw joue des
  // upgrades en Main Phase (greedy) : une partie DOIT donc traverser au moins un nœud 'decide'.
  it('expose les fenêtres decide comme nœuds de décision (tranche 2)', () => {
    const policies: [Policy, Policy] = [greedyHighestDamagePolicy, greedyHighestDamagePolicy]
    let node = GameNode.root('hh', 'bw', 1, policies)
    let sawDecide = false
    let guard = 0
    while (!node.isTerminal() && guard++ < 2000 && !sawDecide) {
      const d = node.pendingDecision()!
      if (d.hook === 'decide') { sawDecide = true; break }
      const name = policies[d.playerIdx].chooseAbility(d.state, d.playerIdx, d.candidates)
      node = node.apply({ kind: 'activateAbility', abilityName: name })
    }
    expect(sawDecide).toBe(true)
  })

  for (const [heroA, heroB] of DUELS) {
    for (const seed of SEEDS) {
      it(`${heroA} vs ${heroB}, graine ${seed} : vainqueur + PV + log identiques`, () => {
        const policies: [Policy, Policy] = [greedyHighestDamagePolicy, greedyHighestDamagePolicy]
        const ref = runMatch(heroA, heroB, seed, policies)
        const via = playMatchViaGameNode(heroA, heroB, seed, policies)
        expect(via.winner).toBe(ref.winner)
        expect(via.finalState.players.map(p => p.hp)).toEqual(ref.finalState.players.map(p => p.hp))
        expect(via.finalState.log.map(e => `${e.playerIdx}|${e.phase}|${e.message}`))
          .toEqual(ref.finalState.log.map(e => `${e.playerIdx}|${e.phase}|${e.message}`))
      })
    }
  }
})
