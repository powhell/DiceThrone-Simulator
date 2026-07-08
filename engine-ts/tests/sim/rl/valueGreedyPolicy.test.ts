import { describe, it, expect } from 'vitest'
import { createValueGreedyPolicy } from '../../../src/sim/rl/valueGreedyPolicy.js'
import { createNetwork } from '../../../src/sim/rl/network.js'
import { FEATURE_COUNT, PLAYER_BLOCK_SIZE, HAND_ONEHOT_SIZE } from '../../../src/sim/rl/features.js'
import type { Network } from '../../../src/sim/rl/network.js'
import { createInitialGameState } from '../../../src/sim/match.js'
import { playTurn, enumerateWindowActions } from '../../../src/sim/turn.js'
import { mulberry32 } from '../../../src/sim/rng.js'
import { MAX_HAND_SIZE } from '../../../src/sim/data/config.js'
import { heroTemplateFor, cardById } from '../../../src/sim/data/load.js'

// Opponent HP is the first field of the "opponent" block:
// [turn, self(PLAYER_BLOCK_SIZE), selfHand(one-hot), opp(PLAYER_BLOCK_SIZE)].
// Dérivé de features.ts (plus de constante locale : le passage v2->v3 du layout avait
// laissé un 21 codé en dur ici, et le réseau du test pointait DANS le bloc self).
const OPP_HP_FEATURE_INDEX = 1 + PLAYER_BLOCK_SIZE + HAND_ONEHOT_SIZE

function preferLowerOpponentHpNetwork(): Network {
  const row = new Array(FEATURE_COUNT).fill(0)
  row[OPP_HP_FEATURE_INDEX] = -1 // lower opponent HP -> higher score
  return { sizes: [FEATURE_COUNT, 1], layers: [{ W: [row], b: [0] }] }
}

describe('createValueGreedyPolicy: chooseAbility', () => {
  it('prefers the candidate that deals more damage (via lower resulting opponent HP)', () => {
    const policy = createValueGreedyPolicy(preferLowerOpponentHpNetwork())
    const state = createInitialGameState('hh', 'bw')
    const candidates = [
      { name: 'Weak Hit', baseDamage: 3, defendable: false },
      { name: 'Strong Hit', baseDamage: 10, defendable: false },
    ]
    expect(policy.chooseAbility(state, 0, candidates)).toBe('Strong Hit')
  })

  it('returns the sole candidate directly when there is only one', () => {
    const policy = createValueGreedyPolicy(createNetwork([FEATURE_COUNT, 4, 1], mulberry32(1)))
    const state = createInitialGameState('hh', 'bw')
    const candidates = [{ name: 'Only Option', baseDamage: 5, defendable: true }]
    expect(policy.chooseAbility(state, 0, candidates)).toBe('Only Option')
  })
})

describe('createValueGreedyPolicy: legality of returned choices', () => {
  const net = createNetwork([FEATURE_COUNT, 6, 1], mulberry32(2))
  const policy = createValueGreedyPolicy(net)

  it('decide on a Main Phase window returns pass or an affordable upgrade actually in hand', () => {
    const state = createInitialGameState('bw', 'hh')
    const self = state.players[0]
    const hero = heroTemplateFor('bw')
    self.hand = ['grapple-ii', 'baton-strike-ii', 'recoil']
    self.cp = 2
    const options = enumerateWindowActions(state, 0, { windowType: 'mainPhase', phase: 'main1' })
    const action = policy.decide(state, 0, { ctx: { windowType: 'mainPhase', phase: 'main1' }, options })
    expect(options).toContainEqual(action)
    if (action.kind === 'playCard') {
      expect(self.hand).toContain(action.cardId)
      expect(cardById(hero, action.cardId)?.kind).toBe('upgrade')
    }
  })

  it('chooseHeadlessMayhem only offers terrorize when eligible', () => {
    const state = createInitialGameState('hh', 'bw')
    expect(['none', 'giveHead']).toContain(policy.chooseHeadlessMayhem(state, 0, false))
  })

  it('chooseCardsToDiscard sells at least the required overflow', () => {
    const state = createInitialGameState('hh', 'bw')
    const self = state.players[0]
    self.hand = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] // 8 cards, max is 6
    const sold = policy.chooseCardsToDiscard(state, 0, MAX_HAND_SIZE)
    expect(sold.length).toBeGreaterThanOrEqual(2)
  })

  it('chooseSabotageReroll returns a boolean', () => {
    const state = createInitialGameState('bw', 'hh')
    expect(typeof policy.chooseSabotageReroll(state, 0, [1, 2, 3])).toBe('boolean')
  })

  it('chooseHorrifyBonus returns a legal token choice', () => {
    const state = createInitialGameState('hh', 'bw')
    expect(['dreadful', 'grimPursuit']).toContain(policy.chooseHorrifyBonus(state, 0))
  })

  it('decide on a defense window returns pass or an eligible defensive card', () => {
    const state = createInitialGameState('bw', 'hh')
    const self = state.players[0]
    self.hand = ['not-this-time']
    self.cp = 5
    state.pendingAttack = { attackerIdx: 1, defenderIdx: 0, remaining: 10 }
    const ctx = { windowType: 'defense' as const, eludeEligible: false }
    const options = enumerateWindowActions(state, 0, ctx)
    const action = policy.decide(state, 0, { ctx, options })
    expect(options).toContainEqual(action)
    if (action.kind === 'playCard') expect(action.cardId).toBe('not-this-time')
  })

  it('chooseAttackModifierCards only returns eligible ids', () => {
    const state = createInitialGameState('hh', 'bw')
    const self = state.players[0]
    self.hand = ['cranial-assist']
    self.cp = 5
    const chosen = policy.chooseAttackModifierCards(state, 0, 5, ['cranial-assist'])
    for (const id of chosen) expect(['cranial-assist']).toContain(id)
  })

  // Stage 6a: the offensiveRoll window is now scored (was a blanket pass) by resolving the attack
  // through resolveAbilityPhase on each candidate's altered dice. This exercises that path end to
  // end (clone -> applyWindowAction -> resolveAbilityPhase -> V) and checks a legal choice comes out.
  it('decide on an offensiveRoll window scores via resolve-through and returns a legal option', () => {
    const state = createInitialGameState('hh', 'bw') // roller 0, opponent 1
    state.players[1].hand = ['tip-it']
    state.players[1].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [4, 4, 4, 4, 4] }
    const ctx = { windowType: 'offensiveRoll' as const }
    const options = enumerateWindowActions(state, 1, ctx)
    expect(options.length).toBeGreaterThan(1) // pass + Tip It! alterations
    const action = policy.decide(state, 1, { ctx, options })
    expect(options).toContainEqual(action)
  })

  // Stage 6b: the defenseRoll window is scored (was a pass) by running finalizeDefenseRoll on each
  // candidate's altered defense dice. Needs state.pendingDefenseRoll set (the attack context).
  it('decide on a defenseRoll window scores via finalizeDefenseRoll and returns a legal option', () => {
    const state = createInitialGameState('bw', 'hh') // defender = player 0 (bw), attacker = player 1
    state.players[0].hand = ['better-d'] // defender may reroll all defense dice
    state.players[0].cp = 5
    state.pendingRoll = { rollerIdx: 0, dice: [1, 2, 3] }
    state.pendingDefenseRoll = { attackerIdx: 1, incomingDamage: 8 }
    const ctx = { windowType: 'defenseRoll' as const }
    const options = enumerateWindowActions(state, 0, ctx)
    expect(options.length).toBeGreaterThan(1) // pass + Better D!
    const action = policy.decide(state, 0, { ctx, options })
    expect(options).toContainEqual(action)
  })

  it('chooseMidRollCards and chooseRollManipulationCards are v1 no-ops', () => {
    const state = createInitialGameState('bw', 'hh')
    expect(policy.chooseMidRollCards(state, 0, [1, 2, 3, 4, 5], 2)).toEqual([])
    expect(policy.chooseRollManipulationCards(state, 0, [1, 2, 3, 4, 5], 2, ['six-it'])).toEqual([])
  })
})

describe('createValueGreedyPolicy: full games run without crashing', () => {
  it('plays several complete HH-vs-BW self-play turns with a fresh (untrained) network', () => {
    const net = createNetwork([FEATURE_COUNT, 12, 6, 1], mulberry32(3))
    const policy = createValueGreedyPolicy(net)
    const rng = mulberry32(100)
    const state = createInitialGameState('hh', 'bw', rng)
    for (let i = 0; i < 6; i++) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      expect(() => playTurn(state, activeIdx, rng, [policy, policy])).not.toThrow()
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
      if (state.winner !== null) break
    }
  })

  it('plays several complete BW-vs-BW self-play turns with a fresh (untrained) network', () => {
    const net = createNetwork([FEATURE_COUNT, 12, 6, 1], mulberry32(4))
    const policy = createValueGreedyPolicy(net)
    const rng = mulberry32(101)
    const state = createInitialGameState('bw', 'bw', rng)
    for (let i = 0; i < 6; i++) {
      state.turnNumber += 1
      const activeIdx = state.activePlayerIdx
      expect(() => playTurn(state, activeIdx, rng, [policy, policy])).not.toThrow()
      state.activePlayerIdx = (1 - activeIdx) as 0 | 1
      if (state.winner !== null) break
    }
  })
})
