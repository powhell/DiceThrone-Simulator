import { describe, it, expect } from 'vitest'
import { runMatch } from '../../src/sim/match.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import type { HeroId } from '../../src/sim/types.js'
// Le ROUGE de la Phase 1 (PLAN_STRONG_AI §5c) : ce module n'existe pas encore.
import { playMatchViaGameNode, GameNode, actionKey } from '../../src/sim/search/gameNode.js'
import { mulberry32Stateful } from '../../src/sim/rng.js'

// Empreinte observable d'un nœud : coups légaux + PV/CP des deux joueurs au point de décision
// (ou PV finaux si terminal). Deux échantillonnages de dés différents => empreintes différentes
// dès que l'issue change quoi que ce soit d'observable.
function stateKey(n: GameNode): string {
  if (n.isTerminal()) return `terminal:${n.finalState().players.map(p => p.hp).join(',')}`
  const d = n.pendingDecision()!
  const dice = d.state.pendingRoll ? d.state.pendingRoll.dice.join(',') : ''
  return JSON.stringify({
    acts: n.legalActions().map(actionKey),
    pv: d.state.players.map(p => [p.hp, p.cp, p.hand.length]),
    dice,
  })
}

// Test de parité : une partie ENTIÈRE pilotée par GameNode.legalActions/apply (à chaque nœud
// joueur, la MÊME Policy choisit le coup) doit produire un résultat IDENTIQUE à playTurn/runMatch
// — vainqueur, PV finaux et log complet (le log contient chaque jet de dés, donc l'égalité des
// logs prouve aussi l'égalité des états rng). Vert = le seam ré-expose exactement les décisions
// du moteur, ni plus ni moins.
describe('GameNode — parité avec playTurn (Phase 1)', () => {
  // Les 10 héros couverts (chacun apparaît dans au moins un duel).
  const DUELS: Array<[HeroId, HeroId]> = [['sm', 'th'], ['hh', 'bw'], ['py', 'du'], ['fm', 'rv'], ['dr', 'se']]
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

  // Tranche 3 : les dés = nœuds de CHANCE explicites. Entre deux décisions, si le moteur a
  // consommé du hasard (jet offensif/défensif, sous-jets), le nœud doit être un nœud de chance :
  // sampleChance(graine) re-échantillonne le suffixe (MCTS branche dessus), continueChance()
  // poursuit le flux rng original (le chemin parité). Même graine => même enfant (déterminisme) ;
  // deux graines => au moins une paire d'issues différentes (sinon rien n'a été échantillonné).
  it('expose les jets de dés comme nœuds de chance échantillonnables (tranche 3)', () => {
    const policies: [Policy, Policy] = [greedyHighestDamagePolicy, greedyHighestDamagePolicy]
    let node = GameNode.root('hh', 'bw', 1, policies)
    let guard = 0
    while (!node.isTerminal() && guard++ < 2000) {
      const actor = node.currentActor()
      if (actor.kind === 'chance') {
        const a = node.sampleChance(mulberry32Stateful(1))
        const a2 = node.sampleChance(mulberry32Stateful(1))
        expect(stateKey(a)).toBe(stateKey(a2)) // déterminisme à graine égale
        for (let s = 2; s < 12; s++) {
          if (stateKey(node.sampleChance(mulberry32Stateful(s))) !== stateKey(a)) return // échantillonné pour vrai
        }
        throw new Error('10 graines -> issue identique : le nœud de chance n\'échantillonne rien')
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
    throw new Error('partie terminée sans jamais rencontrer de nœud de chance')
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
