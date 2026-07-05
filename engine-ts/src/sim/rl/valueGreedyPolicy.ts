// Implements the full Policy interface by scoring every legal candidate action with the
// learned value network via lookahead.ts, and picking whichever candidate the ACTING player's
// resulting state scores highest. See the RL plan (2026-07-02) for why each method's re-entry
// point was chosen the way it is.
//
// Not every decision gets a full-fidelity replay-through-the-real-engine lookahead: several
// Policy method signatures don't carry enough context to cleanly re-enter the higher-level
// phase function that would normally produce them (most don't receive the dice that were
// rolled, since dice are an ephemeral function parameter, never stored on GameState). Where
// that's true, this file uses the most granular ALREADY-EXPORTED effect function available
// instead of re-deriving the logic by hand — see per-method comments below for exactly which
// approximation applies where.
import type { GameState, AbilityCandidate, WindowAction, DecisionRequest } from '../types.js'
import type { Policy, RollManipulationChoice } from '../policy.js'
import {
  playUpkeepPhase, playDiscardPhase, playCard, resolveDefense, applyAttackModifierCard,
  applyWindowAction, finalizePendingAttackDamage, resolveAbilityPhase, finalizeDefenseRoll,
  applyRollManipulationCard, oracleStateFor,
} from '../turn.js'
import { completeOffensiveRoll } from '../oracle.js'
import type { AttackModifierResult } from '../turn.js'
import * as bw from '../hero/bw.rules.js'
import * as hh from '../hero/hh.rules.js'
import { heroTemplateFor, abilityByBoardName } from '../data/load.js'
import type { Network } from './network.js'
import { scoreCandidatesByReplay, cloneForLookahead } from './lookahead.js'
import {
  enumerateAbilityCandidates, enumerateHorrifyBonus, enumerateHeadlessMayhem,
  enumerateSabotageReroll, enumerateDiscardSubsets, enumerateSmallCardSubsets,
  enumerateRollManipulationChoices,
} from './candidates.js'

// Deterministic per-decision seed (not real randomness) — its only job is to be the SAME value
// across every candidate scored at one decision point (the RNG-fairness rule), not to be
// unpredictable. Derived from state so the policy itself stays stateless/pure.
function seedFor(state: GameState, salt: number): number {
  return (state.turnNumber * 7919 + salt) >>> 0
}

export function createValueGreedyPolicy(network: Network): Policy {
  const policy: Policy = {
    // Approximation (no dice available in this method's signature — see file header): scores
    // each candidate by its already-upgrade-adjusted `baseDamage`/`defendable`, applied via the
    // dice-independent resolveDefense re-entry point. This ignores dice-dependent bonuses
    // (Cleave's number-match, Spectral Assault's bonus roll, Vengeance's rider, self token
    // grants, card draw) for the specific purpose of ranking WHICH ability to activate — a
    // deliberate v1 gap, not an oversight. Other decisions (attack modifiers, defensive cards)
    // still get full-fidelity lookahead.
    chooseAbility(state, playerIdx, candidates) {
      const options = enumerateAbilityCandidates(candidates)
      const best = scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 1), options,
        (clone, candidate: AbilityCandidate, rng) => {
          const dmg = candidate.baseDamage ?? 0
          if (candidate.defendable) {
            resolveDefense(clone, playerIdx, dmg, rng, [policy, policy])
          } else {
            clone.players[(1 - playerIdx) as 0 | 1].hp -= dmg
          }
        },
      )
      return best.name
    },

    // Only called when NOT holding the Head and NOT Horrify II (see turn.ts) — always the base,
    // non-upgraded token amounts. Applied directly (no need to replay anything: this choice's
    // entire effect IS the token grant, nothing else depends on it).
    chooseHorrifyBonus(state, playerIdx) {
      const options = enumerateHorrifyBonus()
      const data = abilityByBoardName(heroTemplateFor('hh'), 'Horrify (CCCC)')
      const best = scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 2), options,
        (clone, candidate, _rng) => {
          const self = clone.players[playerIdx]
          if (candidate === 'dreadful' && data?.tokensGrantedToSelf?.dreadful) {
            hh.grantDreadful(self, data.tokensGrantedToSelf.dreadful)
          } else if (candidate === 'grimPursuit' && data?.tokensGrantedIfHasHead?.grimPursuit) {
            hh.grantGrimPursuit(self, data.tokensGrantedIfHasHead.grimPursuit)
          }
        },
      )
      return best
    },

    chooseHeadlessMayhem(state, playerIdx, canTerrorize) {
      const options = enumerateHeadlessMayhem(state.players[playerIdx], canTerrorize)
      const best = scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 3), options,
        (clone, candidate, rng) => {
          const forced: Policy = { ...policy, chooseHeadlessMayhem: () => candidate }
          playUpkeepPhase(clone, playerIdx, rng, forced)
        },
      )
      return best
    },

    // Unified decision (plan Stage 2): score every legal WindowAction by replaying it through the
    // real engine (applyWindowAction — the SAME apply path resolveResponseWindow uses, so no
    // drift) and pick the highest-V one. This one method replaces what used to be a per-decision
    // bespoke enumerate/replay closure (here: the old chooseMainPhaseCards subset search) — the
    // whole point of the unified model. As more decisions migrate onto windows, they all flow
    // through here for free. Salt keys the lookahead RNG per window type (fairness across options).
    decide(state, playerIdx, request: DecisionRequest): WindowAction {
      if (request.options.length === 1) return request.options[0]
      // Prior connu-bon (guide vérifié : BW "pose TOUJOURS chaque upgrade") : un upgrade
      // GRATUIT via Covert Ops domine toute autre option de Main Phase — le lookahead à 1
      // coup le sous-évaluait (mesuré : 3 utilisations sur ~33 jetons en 11 parties, et la
      // calibration donnait Covert ≈ 0 en conséquence). On restreint le choix aux options
      // covertOpsUpgrade quand il y en a ; le réseau départage ENTRE upgrades.
      const covert = request.options.filter(o => o.kind === 'covertOpsUpgrade')
      if (covert.length === 1) return covert[0]
      if (covert.length > 1) request = { ...request, options: covert }
      // ORP2 offensive-alter window (Stage 6a): a die alteration's payoff is only realized once the
      // attack resolves, and encodeState can't see the in-progress dice. So score each candidate by
      // applying it to the roller's pending dice, then RESOLVING the attack on those final dice
      // (resolveAbilityPhase — the same tail playTurn runs after this window) so the network sees the
      // post-attack HP/tokens. Scored from the acting player's view (roller maximises its attack; the
      // opponent, altering the roller's dice, maximises its OWN V = minimises the attack).
      if (request.ctx.windowType === 'offensiveRoll') {
        return scoreCandidatesByReplay(
          network, playerIdx, state, seedFor(state, 10), request.options,
          (clone, action: WindowAction, rng) => {
            applyWindowAction(clone, playerIdx, action, request.ctx, rng)
            const pr = clone.pendingRoll
            if (pr) {
              const finalDice = pr.dice.slice()
              clone.pendingRoll = null
              resolveAbilityPhase(clone, pr.rollerIdx, finalDice, rng, [policy, policy])
            }
          },
        )
      }
      // DRP3 defense-roll-alter window (Stage 6b): symmetric to offensiveRoll. Score each candidate
      // by applying it to the defender's pending defense dice, then running the tail of resolveDefense
      // (finalizeDefenseRoll — DRP4 effects on the final dice, Agility, DRP5, DRP6) so the network
      // sees the post-defense HP. The attack context (attackerIdx, incomingDamage) rides on
      // state.pendingDefenseRoll. Scored from the acting player's view (defender wants max prevention/
      // counter via Better D!; the attacker altering the defense dice wants min prevention).
      if (request.ctx.windowType === 'defenseRoll') {
        const pd = state.pendingDefenseRoll
        if (!pd) return { kind: 'pass' } // safety: no context to finalize against
        return scoreCandidatesByReplay(
          network, playerIdx, state, seedFor(state, 11), request.options,
          (clone, action: WindowAction, rng) => {
            applyWindowAction(clone, playerIdx, action, request.ctx, rng)
            const pr = clone.pendingRoll
            if (pr) {
              const finalDice = pr.dice.slice()
              clone.pendingRoll = null
              clone.pendingDefenseRoll = null
              finalizeDefenseRoll(clone, pd.attackerIdx, pd.incomingDamage, finalDice, rng, [policy, policy])
            }
          },
        )
      }
      // Salt keys the lookahead RNG per window type (reuses the old per-decision salts: 4 main
      // phase, 7 defense) so options at one decision are compared under identical dice.
      const salt = request.ctx.windowType === 'defense' ? 7 : 4
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, salt), request.options,
        (clone, action: WindowAction, rng) => {
          applyWindowAction(clone, playerIdx, action, request.ctx, rng)
          // Defense-window options only whittle pendingAttack.remaining; the HP payoff isn't
          // visible to the network until DRP6 lands the damage. Resolve it on the clone so every
          // option (including 'pass') is scored on its true post-attack HP.
          if (request.ctx.windowType === 'defense') finalizePendingAttackDamage(clone)
        },
      )
    },

    // Direct call to bw.resolveSabotage (dice-independent of resolveDefense's `incomingDamage`,
    // which this method's own signature doesn't receive) — a wrapper policy forces the reroll
    // choice; the RNG-fairness rule (same seed per candidate) keeps the initial dice roll
    // identical across the true/false comparison.
    chooseSabotageReroll(state, defenderIdx, _dice) {
      const options = enumerateSabotageReroll()
      const attackerIdx = (1 - defenderIdx) as 0 | 1
      const best = scoreCandidatesByReplay(
        network, defenderIdx, state, seedFor(state, 5), options,
        (clone, candidate, rng) => {
          const forced: Policy = { ...policy, chooseSabotageReroll: () => candidate }
          const upgraded = clone.players[defenderIdx].upgradesInPlay.includes('sabotage-ii')
          bw.resolveSabotage(
            clone.players[defenderIdx], clone.players[attackerIdx].upgradesInPlay.length,
            rng, forced, clone, defenderIdx, upgraded,
          )
        },
      )
      return best
    },

    chooseCardsToDiscard(state, playerIdx, maxHandSize) {
      const options = enumerateDiscardSubsets(state.players[playerIdx].hand, maxHandSize)
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 6), options,
        (clone, subset: string[]) => {
          const forced: Policy = { ...policy, chooseCardsToDiscard: () => subset }
          playDiscardPhase(clone, playerIdx, forced)
        },
      )
    },

    // Direct call to the exported applyAttackModifierCard per candidate card, then finishes the
    // attack (resolveDefense is dice-independent) — bypasses the Policy call entirely, same
    // spirit as chooseMainPhaseCards's direct playCard loop.
    chooseAttackModifierCards(state, playerIdx, dmg, eligibleCardIds) {
      const options = enumerateSmallCardSubsets(eligibleCardIds)
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 8), options,
        (clone, subset: string[], rng) => {
          let result: AttackModifierResult = { dmg, undefendable: false }
          for (const cardId of subset) result = applyAttackModifierCard(clone, playerIdx, cardId, result)
          if (result.undefendable) clone.players[(1 - playerIdx) as 0 | 1].hp -= result.dmg
          else resolveDefense(clone, playerIdx, result.dmg, rng, [policy, policy])
        },
      )
    },

    // Grim Pursuit spend mode (b): score not-spending vs spending 1 Grim Pursuit for a random die
    // of bonus damage, each replayed through resolveDefense (dice-independent, like the attack-
    // modifier scoring above — defendability isn't in this method's signature, so it approximates a
    // defendable attack for ranking). Same-seed-per-candidate keeps the comparison fair.
    chooseGrimPursuitSpend(state, playerIdx, dmg) {
      const options = [false, true]
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 9), options,
        (clone, spend: boolean, rng) => {
          let d = dmg
          if (spend) d += hh.spendGrimPursuitForBonusDamage(clone.players[playerIdx], rng).bonus
          resolveDefense(clone, playerIdx, d, rng, [policy, policy])
        },
      )
    },

    // v1 gap, not an oversight: fires from WITHIN oracle.ts's roll loop for BW's mid-roll
    // upgrade plays (Red Room Training); scoring it would need the same resume machinery as
    // below plus upgrade-play replay — still future work. Matches greedy's default.
    chooseMidRollCards: () => [],

    // Roll-manipulation cards (Six-It!/So Wild!/Twice As Wild!/Samesies!/Try Try Again!/One
    // More Time!) — un-stubbed (was the "5 cards the RL literally cannot play" gap). Scored by
    // full resolve-through in V units, no hand-tuned CP-to-damage constant anywhere: for each
    // candidate (including "play nothing"), clone the state, apply the card (real
    // applyRollManipulationCard: CP debit + discard), roll the modified dice FORWARD to their
    // final state with the real DP loop (oracle.completeOffensiveRoll — the resumable re-entry
    // point added for exactly this), resolve the attack on those final dice, then let V judge.
    // Same per-decision seed across candidates (RNG-fairness rule), so "played Six-It!" vs
    // "didn't" are compared under identical reroll luck.
    //
    // Only acts on the FINAL window (rollsRemaining === 0, fired since the oracle's final-window
    // change): the dice are otherwise final, so value-setters are DETERMINISTIC (no reroll can
    // undo them) and their rollout is a single resolve — maximum information at minimum cost.
    // One More Time! grants +1 attempt and is rolled forward through the granted attempt.
    chooseRollManipulationCards(state, playerIdx, dice, rollsRemaining, eligibleCardIds): RollManipulationChoice[] {
      if (rollsRemaining !== 0 || eligibleCardIds.length === 0) return []
      const options = enumerateRollManipulationChoices(dice, eligibleCardIds)
      if (options.length === 1) return options[0]
      const heroId = state.players[playerIdx].heroId
      const oppIdx = (1 - playerIdx) as 0 | 1
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 12), options,
        (clone, choices: RollManipulationChoice[], rng) => {
          let d = dice
          let extra = 0
          for (const choice of choices) {
            const r = applyRollManipulationCard(clone, playerIdx, choice, d, rng)
            d = r.dice
            extra += r.extraRollsGranted
          }
          const finalDice = completeOffensiveRoll(
            heroId, oracleStateFor(clone.players[playerIdx], clone.players[oppIdx]),
            d, rollsRemaining + extra, rng,
          )
          resolveAbilityPhase(clone, playerIdx, finalDice, rng, [policy, policy])
        },
      )
    },

    // Grim Pursuit mode (a): same resolve-through scoring as the roll-manipulation cards above —
    // "keep these final dice" vs "spend 1 Grim Pursuit for one more DP attempt", both rolled
    // forward under the same seed and judged by V. No hand-tuned token-value constant anywhere.
    chooseGrimPursuitReroll(state, playerIdx, dice) {
      const heroId = state.players[playerIdx].heroId
      const oppIdx = (1 - playerIdx) as 0 | 1
      return scoreCandidatesByReplay(
        network, playerIdx, state, seedFor(state, 13), [false, true],
        (clone, spend: boolean, rng) => {
          if (spend) {
            hh.spendGrimPursuit(clone.players[playerIdx], 1)
            clone.players[playerIdx].grimPursuitRerollUsedThisTurn = true
          }
          const finalDice = completeOffensiveRoll(
            heroId, oracleStateFor(clone.players[playerIdx], clone.players[oppIdx]),
            dice, spend ? 1 : 0, rng,
          )
          resolveAbilityPhase(clone, playerIdx, finalDice, rng, [policy, policy])
        },
      )
    },
  }

  return policy
}
