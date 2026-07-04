import { describe, it, expect } from 'vitest'
import { createInitialGameState, createInitialPlayer, buildFullDeck } from '../../src/sim/match.js'
import { playTurn, playIncomePhase, playDiscardPhase, playCard, resolveAbilityPhase, resolveDefense, playOffensiveRollPhase } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import type { Policy } from '../../src/sim/policy.js'
import { mulberry32 } from '../../src/sim/rng.js'
import type { RNG } from '../../src/sim/rng.js'
import { clearCache } from '../../src/index.js'
import { CP_CAP, STARTING_CP, STARTING_HAND_SIZE, MAX_HAND_SIZE } from '../../src/sim/data/config.js'
import { heroTemplateFor } from '../../src/sim/data/load.js'

// rollDie() = floor(rng() * 6) + 1 — pick a value strictly inside each face's bucket.
function seqRng(faces: number[]): RNG {
  let i = 0
  return () => (faces[i++ % faces.length] - 0.5) / 6
}

// Forces every eligible defensive card to be played: in a DRP5 'defense' window, always take the
// first playCard offered (the window re-enumerates after each, so all eligible cards get played);
// defer to greedy for every other window (keeps Main Phase behavior).
const alwaysPlayDefensiveCards: Policy = {
  ...greedyHighestDamagePolicy,
  decide(state, idx, request) {
    if (request.ctx.windowType === 'defense') {
      const play = request.options.find(o => o.kind === 'playCard')
      if (play) return play
    }
    return greedyHighestDamagePolicy.decide(state, idx, request)
  },
}

describe('playTurn', () => {
  it('runs a full HH turn without crashing and logs every phase', () => {
    clearCache()
    const rng = mulberry32(42)
    const state = createInitialGameState('hh', 'bw', rng)
    // Player 0's turn 1 is the Start Player's first turn, which skips Income Phase entirely
    // (verified rulebook rule) — bump turnNumber so this test exercises a normal turn instead.
    state.turnNumber = 2
    playTurn(state, 0, rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])

    const phases = state.log.map(e => e.phase)
    expect(phases).toContain('income')
    expect(phases).toContain('roll')
    expect(phases).toContain('resolveAttack')
    expect(phases).toContain('endOfTurn')
    // Real phase order (verified): upkeep -> income -> main1 -> roll -> ... -> discard
    expect(phases.indexOf('income')).toBeLessThan(phases.indexOf('roll'))
  })

  it('runs a full BW turn without crashing', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const rng = mulberry32(7)
    expect(() => playTurn(state, 0, rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])).not.toThrow()
  })

  it('never lets CP go negative from upkeep income alone', () => {
    clearCache()
    const state = createInitialGameState('hh', 'bw')
    const rng = mulberry32(1)
    playTurn(state, 0, rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(state.players[0].cp).toBeGreaterThanOrEqual(0)
  })
})

describe('setup (verified: official rulebook)', () => {
  it('starts with 50 HP, 2 CP, and a 4-card hand drawn from a shuffled full deck', () => {
    const rng = mulberry32(3)
    const p = createInitialPlayer('hh', rng)
    expect(p.hp).toBe(50)
    expect(p.cp).toBe(STARTING_CP)
    expect(p.hand.length).toBe(STARTING_HAND_SIZE)
    expect(p.deck.length).toBe(buildFullDeck('hh').length - STARTING_HAND_SIZE)
  })

  it("HH setup: the player who is NOT first gains 1 Dreadful (verified leaflet Hero Setup rule)", () => {
    const state = createInitialGameState('hh', 'hh')
    expect((state.players[0].tokens as any).dreadful).toBe(0) // first player: no bonus
    expect((state.players[1].tokens as any).dreadful).toBe(1) // second player: +1 Dreadful
  })

  it('BW has no equivalent setup bonus for going second (no Dreadful token)', () => {
    const state = createInitialGameState('bw', 'bw')
    expect((state.players[0].tokens as any).agility).toBe(0)
    expect((state.players[1].tokens as any).agility).toBe(0)
  })

  it('buildFullDeck has one copy of every hero card + every common card, no duplicates', () => {
    const deck = buildFullDeck('bw')
    expect(new Set(deck).size).toBe(deck.length)
  })
})

describe('Income Phase (verified: official rulebook)', () => {
  it('Start Player skips their first Income Phase (no CP, no draw)', () => {
    clearCache()
    const rng = mulberry32(5)
    const state = createInitialGameState('hh', 'bw', rng)
    state.turnNumber = 1
    const cpBefore = state.players[0].cp
    const handBefore = state.players[0].hand.length
    playIncomePhase(state, 0, rng)
    expect(state.players[0].cp).toBe(cpBefore)
    expect(state.players[0].hand.length).toBe(handBefore)
  })

  it('grants 1 CP and draws 1 card on any other turn', () => {
    clearCache()
    const rng = mulberry32(6)
    const state = createInitialGameState('hh', 'bw', rng)
    state.turnNumber = 2
    const cpBefore = state.players[0].cp
    const handBefore = state.players[0].hand.length
    playIncomePhase(state, 0, rng)
    expect(state.players[0].cp).toBe(cpBefore + 1)
    expect(state.players[0].hand.length).toBe(handBefore + 1)
  })

  it('CP never exceeds the cap of 15', () => {
    const rng = mulberry32(9)
    const state = createInitialGameState('hh', 'bw', rng)
    state.players[0].cp = CP_CAP
    state.turnNumber = 2
    playIncomePhase(state, 0, rng)
    expect(state.players[0].cp).toBe(CP_CAP)
  })
})

describe('Discard Phase (verified: official rulebook)', () => {
  it('sells cards down to the max hand size, gaining 1 CP per card sold', () => {
    clearCache()
    const rng = mulberry32(11)
    const state = createInitialGameState('hh', 'bw', rng)
    state.players[0].hand = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] // 8 cards
    const cpBefore = state.players[0].cp
    playDiscardPhase(state, 0, greedyHighestDamagePolicy)
    expect(state.players[0].hand.length).toBe(MAX_HAND_SIZE)
    expect(state.players[0].discard.length).toBe(2)
    expect(state.players[0].cp).toBe(cpBefore + 2)
  })

  it('does nothing when already at or below the max hand size', () => {
    clearCache()
    const rng = mulberry32(12)
    const state = createInitialGameState('hh', 'bw', rng)
    state.players[0].hand = ['a', 'b']
    const cpBefore = state.players[0].cp
    playDiscardPhase(state, 0, greedyHighestDamagePolicy)
    expect(state.players[0].hand).toEqual(['a', 'b'])
    expect(state.players[0].cp).toBe(cpBefore)
  })
})

describe('playCard: Hero Upgrades (verified: official rulebook)', () => {
  it('spends CP, moves the card from hand to upgradesInPlay', () => {
    clearCache()
    const rng = mulberry32(20)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    p.hand = ['hacked-ii']
    p.cp = 5
    playCard(state, 0, 'main1', 'hacked-ii', rng)
    expect(p.cp).toBe(4) // hacked-ii costs 1 CP
    expect(p.hand).not.toContain('hacked-ii')
    expect(p.upgradesInPlay).toEqual(['hacked-ii'])
  })

  it('upgrading a slot that already has a card only costs the CP difference (verified: "Hero Upgrades" rulebook)', () => {
    clearCache()
    const rng = mulberry32(21)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    // Simulate already having grapple-ii (2 CP) in play, then "upgrading" to a hypothetical
    // grapple-iii (same slot) costing 3 CP total — should only charge the 1 CP difference.
    p.upgradesInPlay = ['grapple-ii']
    p.hand = ['fake-grapple-iii']
    p.cp = 5
    // Inject a fake level-III card sharing grapple's upgradeSlot to exercise the diff-cost path
    // without needing real level-III data (none exists in the verified card set yet).
    const bwHero = heroTemplateFor('bw')
    bwHero.cards.push({ id: 'fake-grapple-iii', name: 'Grapple III (test fixture)', kind: 'upgrade', cpCost: 3, upgradeSlot: 'grapple', text: '', effect: null, verified: false })
    playCard(state, 0, 'main1', 'fake-grapple-iii', rng)
    expect(p.cp).toBe(4) // 3 - 2 = 1 CP difference, not the full 3
    expect(p.upgradesInPlay).toEqual(['fake-grapple-iii']) // replaces, not appends
    bwHero.cards.pop()
  })

  it('does not play the card if CP is insufficient', () => {
    clearCache()
    const rng = mulberry32(22)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    p.hand = ['vengeance-ii'] // costs 2 CP
    p.cp = 1
    playCard(state, 0, 'main1', 'vengeance-ii', rng)
    expect(p.cp).toBe(1)
    expect(p.hand).toContain('vengeance-ii')
    expect(p.upgradesInPlay).toEqual([])
  })

  it('is not playable during the Roll Phase for a hero without Red Room Training (hh)', () => {
    clearCache()
    const rng = mulberry32(23)
    const state = createInitialGameState('hh', 'bw', rng)
    const p = state.players[0]
    p.hand = ['cleave-ii']
    p.cp = 5
    playCard(state, 0, 'roll', 'cleave-ii', rng)
    expect(p.cp).toBe(5)
    expect(p.hand).toContain('cleave-ii')
  })
})

describe('playCard: Action Cards with structured effects', () => {
  it('applies tokensGrantedToSelf (bw Assemble!: gain 2 Agility)', () => {
    clearCache()
    const rng = mulberry32(24)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    p.hand = ['assemble']
    p.cp = 1
    playCard(state, 0, 'main1', 'assemble', rng)
    expect((p.tokens as any).agility).toBe(2)
    expect(p.discard).toContain('assemble')
    expect(p.hand).not.toContain('assemble')
  })

  it('applies cardDraw (common Double Up!: draw 2)', () => {
    clearCache()
    const rng = mulberry32(25)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    p.hand = ['double-up']
    p.deck = ['a', 'b', 'c']
    p.cp = 1
    playCard(state, 0, 'main1', 'double-up', rng)
    expect(p.hand.length).toBe(2) // double-up left hand, 2 cards drawn
    expect(p.deck.length).toBe(1)
  })

  it('a Roll Phase Action card (dice manipulation) is not wired and has no effect', () => {
    clearCache()
    const rng = mulberry32(26)
    const state = createInitialGameState('bw', 'hh', rng)
    const p = state.players[0]
    p.hand = ['six-it']
    p.cp = 5
    playCard(state, 0, 'main1', 'six-it', rng)
    expect(p.cp).toBe(5)
    expect(p.hand).toContain('six-it')
  })
})

describe('resolveAbilityPhase: Infiltrate advance-Time-Bomb ordering (verified)', () => {
  it('base Infiltrate advances existing TBs BEFORE inflicting the new one (new TB not advanced)', () => {
    clearCache()
    const rng = mulberry32(30)
    const state = createInitialGameState('bw', 'hh', rng)
    const [self, opp] = state.players
    opp.timeBombs = ['0:02'] // pre-existing TB that should advance to 0:01
    // [1,2,3,6,6]: a=2 (Espionage), b=1 (Batons), c=2 (Widow) — matches only Infiltrate.
    resolveAbilityPhase(state, 0, [1, 2, 3, 6, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(self.heroId).toBe('bw')
    // Pre-existing TB advanced to 0:01, and the newly-inflicted one stays at 0:02 (not advanced).
    expect(opp.timeBombs.sort()).toEqual(['0:01', '0:02'])
  })

  it('Infiltrate II inflicts THEN advances (the new TB IS advanced this turn)', () => {
    clearCache()
    const rng = mulberry32(31)
    const state = createInitialGameState('bw', 'hh', rng)
    const [self, opp] = state.players
    self.upgradesInPlay = ['infiltrate-ii']
    opp.timeBombs = []
    // [1,1,4,5,6]: a=2 (Espionage), b=2 (Batons), c=1 (Widow) — matches only Infiltrate.
    // (c=2 would also unlock Infiltrate II's alt-ability Spy Game, which outscores base
    // Infiltrate and would make the greedy policy pick it instead — not what this test targets.)
    resolveAbilityPhase(state, 0, [1, 1, 4, 5, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    // The only TB in play is the newly-inflicted one, and it should already be advanced (0:01).
    expect(opp.timeBombs).toEqual(['0:01'])
  })
})

describe('resolveAbilityPhase: Horrify choice (verified: XOR without the Head, both with it)', () => {
  it('without the Haunted Head, grants only the Policy-chosen bonus', () => {
    clearCache()
    const rng = mulberry32(32)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    ;(self.tokens as any).head = 0
    const policy: Policy = { ...greedyHighestDamagePolicy, chooseHorrifyBonus: () => 'grimPursuit' }
    // [6,6,6,6,1]: c=4 (Scare), a=1 (Axe) — matches only Horrify.
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [policy, greedyHighestDamagePolicy])
    expect((self.tokens as any).grimPursuit).toBeGreaterThan(0)
    expect((self.tokens as any).dreadful).toBe(0)
  })

  it('with the Haunted Head, grants both bonuses automatically', () => {
    clearCache()
    const rng = mulberry32(33)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    ;(self.tokens as any).head = 1
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect((self.tokens as any).dreadful).toBeGreaterThan(0)
    expect((self.tokens as any).grimPursuit).toBeGreaterThan(0)
  })
})

describe('resolveAbilityPhase: Widow\'s Bite deck search (verified: free, up to 2 upgrades)', () => {
  it('puts up to 2 Ability Upgrades from the deck directly into play, for free', () => {
    clearCache()
    const rng = mulberry32(34)
    const state = createInitialGameState('bw', 'hh', rng)
    const self = state.players[0]
    self.deck = ['hacked-ii', 'assemble', 'grapple-ii', 'recoil']
    const cpBefore = self.cp
    // [6,6,6,6,6]: c=5 — matches only Widow's Bite.
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(self.upgradesInPlay.sort()).toEqual(['grapple-ii', 'hacked-ii'])
    expect(self.cp).toBe(cpBefore) // free — no CP spent
    expect(self.deck).not.toContain('hacked-ii')
    expect(self.deck).not.toContain('grapple-ii')
  })
})

describe('resolveAbilityPhase: HH alt-ability The Reaper (Reap II unlocks BBBCC)', () => {
  it('deals undefendable dmg, gains Dreadful, and draws a card', () => {
    clearCache()
    const rng = mulberry32(35)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    self.upgradesInPlay = ['reap-ii']
    const oppHpBefore = opp.hp
    const handBefore = self.hand.length
    // [4,4,4,6,6]: b=3 (Horseshoe), c=2 (Scare) — matches base Reap AND, with reap-ii in play,
    // The Reaper. Reap II also bumps base Reap's own dmg 3->4 (see hero.json upgradedBy), so
    // the two now TIE on baseDamage — the greedy policy's tie-break keeps the first candidate
    // (base Reap), not necessarily The Reaper, so pin the choice explicitly to test resolution.
    const policy: Policy = { ...greedyHighestDamagePolicy, chooseAbility: () => 'The Reaper (BBBCC)' }
    resolveAbilityPhase(state, 0, [4, 4, 4, 6, 6], rng, [policy, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 4)
    expect((self.tokens as any).dreadful).toBe(3)
    expect(self.hand.length).toBe(handBefore + 1)
  })

  it('is not offered without Reap II in play — base Reap resolves instead', () => {
    clearCache()
    const rng = mulberry32(36)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    const oppHpBefore = opp.hp
    resolveAbilityPhase(state, 0, [4, 4, 4, 6, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 3) // base Reap's baseDamage
    expect((self.tokens as any).dreadful).toBe(2) // base Reap's dreadful gain
  })
})

// Cleave/Hacked/Baton Strike/Gauntlets are all Defendable, so an end-to-end opp.hp assertion
// would be entangled with the defender's RNG-driven Hallowed Reckoning/Sabotage roll (already
// covered precisely at the DP/data level in alt-abilities.test.ts). Horrify and Grapple are
// Undefendable, so they're used here to verify sim/turn.ts's real resolution deterministically.
describe('resolveAbilityPhase: base ability numbers buffed by their own II upgrade', () => {
  it('Horrify grants both Dreadful and 2 Grim Pursuit (not the Head-only XOR) once horrify-ii is in play', () => {
    clearCache()
    const rng = mulberry32(38)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    ;(self.tokens as any).head = 0
    self.upgradesInPlay = ['horrify-ii']
    // [6,6,6,6,1]: c=4 (Scare) — matches Horrify, but also Spooky (needs only c>=3, unlocked by
    // the same horrify-ii) with a higher baseDamage (7 vs 6), so the greedy policy would pick
    // Spooky instead — pin the choice to Horrify explicitly to test ITS resolution.
    const policy: Policy = { ...greedyHighestDamagePolicy, chooseAbility: () => 'Horrify (CCCC)' }
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [policy, greedyHighestDamagePolicy])
    expect((self.tokens as any).dreadful).toBe(3)
    expect((self.tokens as any).grimPursuit).toBe(2)
  })

  it('BW Grapple deals 7 base dmg (not 6) once grapple-ii is in play', () => {
    clearCache()
    const rng = mulberry32(39)
    const state = createInitialGameState('bw', 'hh', rng)
    const [self, opp] = state.players
    self.upgradesInPlay = ['grapple-ii']
    const oppHpBefore = opp.hp
    // [6,6,6,6,1]: c=4 — matches only Grapple (undefendable). Real dmg = 7 (upgraded base)
    // + 1 (bonusDamagePerUpgrade x 1 upgrade in play) = 8.
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 8)
  })

  it('Grapple II grants CP unconditionally, even with only 1 total upgrade in play (below the base >=2 threshold)', () => {
    clearCache()
    const rng = mulberry32(46)
    const state = createInitialGameState('bw', 'hh', rng)
    const self = state.players[0]
    self.upgradesInPlay = ['grapple-ii'] // 1 upgrade total — base Grapple's own threshold needs >=2
    self.cp = 3
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(self.cp).toBe(4)
  })

  it('base Grapple (no grapple-ii) still needs >=2 upgrades for its CP gain', () => {
    clearCache()
    const rng = mulberry32(47)
    const state = createInitialGameState('bw', 'hh', rng)
    const self = state.players[0]
    self.upgradesInPlay = ['hacked-ii'] // 1 upgrade, not grapple-ii
    self.cp = 3
    resolveAbilityPhase(state, 0, [6, 6, 6, 6, 1], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect(self.cp).toBe(3) // unchanged — threshold not met, no grapple-ii either
  })
})

describe('resolveAbilityPhase: BW alt-ability Recon (Grapple II unlocks CCC)', () => {
  it('gains Agility and tutors an Ability Upgrade into play, for free', () => {
    clearCache()
    const rng = mulberry32(37)
    const state = createInitialGameState('bw', 'hh', rng)
    const self = state.players[0]
    self.upgradesInPlay = ['grapple-ii']
    self.deck = ['hacked-ii', 'assemble']
    const cpBefore = self.cp
    const agilityBefore = (self.tokens as any).agility
    // [1,2,6,6,6]: c=3 (Widow) — matches Recon (gated on grapple-ii); base Grapple needs c>=4
    // so it doesn't compete here.
    resolveAbilityPhase(state, 0, [1, 2, 6, 6, 6], rng, [greedyHighestDamagePolicy, greedyHighestDamagePolicy])
    expect((self.tokens as any).agility).toBe(agilityBefore + 1)
    expect(self.upgradesInPlay).toContain('hacked-ii')
    expect(self.cp).toBe(cpBefore) // free — no CP spent
  })
})

describe('resolveDefense: uses the DEFENDER\'s own Policy, not the attacker\'s', () => {
  it('does not play a defensive card the attacker\'s Policy would play but the defender\'s would not', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    defender.hand = ['not-this-time']
    defender.cp = 5
    const hpBefore = defender.hp
    // Attacker's Policy always plays defensive cards; defender's (greedy) never does. A prior
    // bug threaded the ACTIVE/attacking player's Policy into resolveDefense's decisions
    // regardless of whose turn it was to decide — this would have wrongly played the card.
    resolveDefense(state, 0, 10, seqRng([6]), [alwaysPlayDefensiveCards, greedyHighestDamagePolicy])
    expect(defender.hand).toContain('not-this-time') // never played
    expect(defender.hp).toBe(hpBefore - 10) // full dmg through, no prevention
  })

  it('does play a defensive card the defender\'s own Policy chooses, even though the attacker\'s would not', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    defender.hand = ['not-this-time']
    defender.cp = 5
    const hpBefore = defender.hp
    // Mirror image of the test above: attacker's Policy never plays defensive cards, but the
    // DEFENDER's does — confirming resolveDefense consults policies[defenderIdx], not
    // policies[attackerIdx].
    resolveDefense(state, 0, 10, seqRng([6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hand).not.toContain('not-this-time')
    expect(defender.hp).toBe(hpBefore - 4) // 10 - 6 prevented
  })
})

describe('resolveDefense: "play only after being Attacked" Roll Phase Action cards', () => {
  it('Not This Time! prevents up to 6 incoming dmg', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    defender.hand = ['not-this-time']
    defender.cp = 5
    const cpBefore = defender.cp
    const hpBefore = defender.hp
    // Hallowed Reckoning rolls 1 die at dreadful=0; face 6 (Scare) -> 0 prevented, 0 counter-dmg.
    resolveDefense(state, 0, 10, seqRng([6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore - 4) // 10 - 6
    expect(defender.cp).toBe(cpBefore - 1)
    expect(defender.hand).not.toContain('not-this-time')
    expect(defender.discard).toContain('not-this-time')
  })

  it('Not This Time! caps prevention at the remaining damage', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    defender.hand = ['not-this-time']
    defender.cp = 5
    const hpBefore = defender.hp
    resolveDefense(state, 0, 4, seqRng([6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore) // fully prevented, not overshooting to +2
  })

  it('Spirited Reprisal! prevents 3 dmg only while holding the Haunted Head', () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    ;(defender.tokens as any).head = 1
    defender.hand = ['spirited-reprisal']
    defender.cp = 5
    const hpBefore = defender.hp
    resolveDefense(state, 0, 10, seqRng([6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore - 7) // 10 - 3
  })

  it("Spirited Reprisal! is still playable (and costs CP) without the Head, but has no effect", () => {
    clearCache()
    const state = createInitialGameState('bw', 'hh')
    const defender = state.players[1]
    ;(defender.tokens as any).head = 0
    defender.hand = ['spirited-reprisal']
    defender.cp = 5
    const cpBefore = defender.cp
    const hpBefore = defender.hp
    resolveDefense(state, 0, 10, seqRng([6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore - 10)
    expect(defender.cp).toBe(cpBefore - 1)
  })

  it('Recoil! rolls 2 dice (after Sabotage resolves first) for CP gain and dmg prevention', () => {
    clearCache()
    const state = createInitialGameState('hh', 'bw')
    const defender = state.players[1]
    defender.hand = ['recoil']
    defender.cp = 5
    const cpBefore = defender.cp
    const hpBefore = defender.hp
    // Sabotage (0 upgrades -> 3 dice): [3,4,5] all Batons -> 0 dmg prevented by Sabotage itself.
    // Recoil then rolls 2 more dice: [1,6] -> Espionage (+1 CP) + Widow (prevent half, rounded up).
    resolveDefense(state, 0, 10, seqRng([3, 4, 5, 1, 6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.cp).toBe(cpBefore + 1) // Recoil costs 0 CP, +1 CP gained
    expect(defender.hp).toBe(hpBefore - 5) // 10 - ceil(10/2)
  })

  it('Elude! is offered and negates all dmg when the Agility roll lands on 5-6', () => {
    clearCache()
    const state = createInitialGameState('hh', 'bw')
    const defender = state.players[1]
    ;(defender.tokens as any).agility = 1
    defender.hand = ['elude']
    defender.cp = 5
    const hpBefore = defender.hp
    // Sabotage: [3,4,5] (0 prevented). Agility roll: [6] -> fails halving, but IS Elude-eligible.
    resolveDefense(state, 0, 10, seqRng([3, 4, 5, 6]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore)
    expect(defender.hand).not.toContain('elude')
  })

  it('Elude! is not offered when the Agility roll fails but lands on 4 (not 5-6)', () => {
    clearCache()
    const state = createInitialGameState('hh', 'bw')
    const defender = state.players[1]
    ;(defender.tokens as any).agility = 1
    defender.hand = ['elude']
    defender.cp = 5
    const hpBefore = defender.hp
    resolveDefense(state, 0, 10, seqRng([3, 4, 5, 4]), [greedyHighestDamagePolicy, alwaysPlayDefensiveCards])
    expect(defender.hp).toBe(hpBefore - 10) // Agility fails (roll=4), Elude not eligible
    expect(defender.hand).toContain('elude') // never played
  })
})

describe('resolveAbilityPhase: attacker "Attack Modifier" Roll Phase Action cards', () => {
  const alwaysPlayAttackModifiers: Policy = { ...greedyHighestDamagePolicy, chooseAttackModifierCards: (_s, _i, _dmg, eligible) => eligible }

  it('Unescapable! spends 1 Grim Pursuit + 1 CP to make an otherwise-defendable attack undefendable', () => {
    clearCache()
    const rng = mulberry32(40)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    self.hand = ['unescapable']
    self.cp = 5
    ;(self.tokens as any).grimPursuit = 1
    const oppHpBefore = opp.hp
    // [1,1,1,4,6]: a=3 — matches only Cleave 3A (defendable:true, 4 base dmg).
    resolveAbilityPhase(state, 0, [1, 1, 1, 4, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 4) // no defense roll applied — attack was made undefendable
    expect(self.cp).toBe(4)
    expect((self.tokens as any).grimPursuit).toBe(0)
    expect(self.hand).not.toContain('unescapable')
    expect(self.discard).toContain('unescapable')
  })

  it('is not offered when the attacker has no Grim Pursuit to spend', () => {
    clearCache()
    const rng = mulberry32(41)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self] = state.players
    self.hand = ['unescapable']
    self.cp = 5
    ;(self.tokens as any).grimPursuit = 0
    resolveAbilityPhase(state, 0, [1, 1, 1, 4, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(self.hand).toContain('unescapable') // never played
    expect(self.cp).toBe(5)
  })

  it('Cranial Assist! adds 3 dmg only if the opponent (also HH) holds the Haunted Head', () => {
    clearCache()
    const rng = mulberry32(42)
    const state = createInitialGameState('hh', 'hh', rng)
    const [self, opp] = state.players
    self.hand = ['cranial-assist']
    self.cp = 5
    ;(opp.tokens as any).head = 1
    const oppHpBefore = opp.hp
    // [1,4,4,4,6]: b=3, c=1 — matches only Reap (undefendable, 3 base dmg).
    resolveAbilityPhase(state, 0, [1, 4, 4, 4, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 6) // 3 (Reap) + 3 (Cranial Assist)
    expect(self.cp).toBe(3)
  })

  it("Cranial Assist! has no effect (but still costs CP) against an opponent without the Head", () => {
    clearCache()
    const rng = mulberry32(43)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self, opp] = state.players
    self.hand = ['cranial-assist']
    self.cp = 5
    const oppHpBefore = opp.hp
    resolveAbilityPhase(state, 0, [1, 4, 4, 4, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 3) // Reap base only
    expect(self.cp).toBe(3)
  })

  it('Subversion! adds 2 dmg + 1 per Ability Upgrade played this turn', () => {
    clearCache()
    const rng = mulberry32(44)
    const state = createInitialGameState('bw', 'hh', rng)
    const [self, opp] = state.players
    self.hand = ['subversion']
    self.cp = 5
    self.upgradesPlayedThisTurn = 2
    const oppHpBefore = opp.hp
    // [1,6,6,6,6]: c=4 — matches only Grapple (undefendable, 6 base dmg at upgrades=0).
    resolveAbilityPhase(state, 0, [1, 6, 6, 6, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(opp.hp).toBe(oppHpBefore - 10) // 6 (Grapple) + 2 + 2 (Subversion)
    expect(self.cp).toBe(4)
  })

  it('Thundering Hooves! converts up to 3 CP into equal Grim Pursuit', () => {
    clearCache()
    const rng = mulberry32(45)
    const state = createInitialGameState('hh', 'bw', rng)
    const [self] = state.players
    self.hand = ['thundering-hooves']
    self.cp = 5
    const grimPursuitBefore = (self.tokens as any).grimPursuit
    // [1,1,1,4,6]: a=3 — matches Cleave 3A (defendable — real defense RNG doesn't matter here,
    // this test only checks the attacker's own CP/token state, not opp.hp).
    resolveAbilityPhase(state, 0, [1, 1, 1, 4, 6], rng, [alwaysPlayAttackModifiers, greedyHighestDamagePolicy])
    expect(self.cp).toBe(2) // 5 - 0 (card cost) - 3 (spent for conversion)
    expect((self.tokens as any).grimPursuit).toBe(grimPursuitBefore + 3)
  })
})

describe('playOffensiveRollPhase: dice-manipulation Roll Phase Action cards', () => {
  it('Six-It! sets one die to 6, costs 1 CP, and is removed from hand', () => {
    clearCache()
    const rng = mulberry32(50)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['six-it']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('six-it') ? [{ cardId: 'six-it', dieIndices: [0], values: [6] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('six-it')
    expect(self.discard).toContain('six-it')
    expect(self.cp).toBe(4)
  })

  it('So Wild! sets one die to any chosen value, costs 2 CP', () => {
    clearCache()
    const rng = mulberry32(51)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['so-wild']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('so-wild') ? [{ cardId: 'so-wild', dieIndices: [0], values: [3] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('so-wild')
    expect(self.cp).toBe(3)
  })

  it('Twice As Wild! sets two dice to any chosen values, costs 3 CP', () => {
    clearCache()
    const rng = mulberry32(52)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['twice-as-wild']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('twice-as-wild') ? [{ cardId: 'twice-as-wild', dieIndices: [0, 1], values: [6, 6] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('twice-as-wild')
    expect(self.cp).toBe(2)
  })

  it("Samesies! sets one die to match another die's current value, costs 1 CP", () => {
    clearCache()
    const rng = mulberry32(53)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['samesies']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, dice, _r, eligible) =>
        eligible.includes('samesies') ? [{ cardId: 'samesies', dieIndices: [0], values: [dice[1]] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('samesies')
    expect(self.cp).toBe(4)
  })

  it('Try, Try Again! rerolls up to two of your own dice, costs 1 CP', () => {
    clearCache()
    const rng = mulberry32(54)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['try-try-again']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('try-try-again') ? [{ cardId: 'try-try-again', dieIndices: [0, 1] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('try-try-again')
    expect(self.cp).toBe(4)
  })

  it('One More Time! grants an additional Roll Attempt, costs 1 CP', () => {
    clearCache()
    const rng = mulberry32(55)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['one-more-time']
    self.cp = 5
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('one-more-time') ? [{ cardId: 'one-more-time' }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).not.toContain('one-more-time')
    expect(self.cp).toBe(4)
    expect(state.log.some(e => e.message.includes('One More Time!'))).toBe(true)
  })

  it('is not offered when unaffordable or not in hand', () => {
    clearCache()
    const rng = mulberry32(56)
    const state = createInitialGameState('hh', 'bw', rng)
    const self = state.players[0]
    self.hand = ['twice-as-wild'] // costs 3 CP
    self.cp = 2
    const policy: Policy = {
      ...greedyHighestDamagePolicy,
      chooseRollManipulationCards: (_s, _i, _dice, _r, eligible) =>
        eligible.includes('twice-as-wild') ? [{ cardId: 'twice-as-wild', dieIndices: [0, 1], values: [6, 6] }] : [],
    }
    playOffensiveRollPhase(state, 0, rng, policy)
    expect(self.hand).toContain('twice-as-wild') // never played — unaffordable
    expect(self.cp).toBe(2)
  })
})
