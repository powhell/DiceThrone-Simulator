import { describe, it, expect, beforeEach } from 'vitest'
import { clearCache } from '../src/index.js'
import { hhConfig } from '../src/characters/horseman/config.js'
import { bwConfig } from '../src/characters/black_widow/config.js'

beforeEach(() => clearCache())

function hhEntry(dice: number[], dreadful: number, hasHead: boolean, upgradeIds: string[], name: string) {
  return hhConfig.buildAbilityBoard(dice, { dreadful, hasHead, upgradeIds }).find(e => e.name === name)
}

function bwEntry(dice: number[], upgrades: number, tbOnOpp: number, upgradeIds: string[], name: string) {
  return bwConfig.buildAbilityBoard(dice, { upgrades, tbOnOpp, upgradeIds }).find(e => e.name === name)
}

// Each of these 9 alt-abilities is unlocked by a Hero Upgrade card and was previously never
// selectable by the DP solver (it only knew the upgrade COUNT, not WHICH upgrades were in
// play). All are independent `if`s (not elif) matching existing sibling abilities' convention
// (e.g. Horrify/Dreadful Charge) — the pattern is "at least N", and multiple candidates can be
// simultaneously offered; the Policy picks among them.

describe('HH alt-abilities gated by upgradeIds', () => {
  it('Ghostly Charge (Cleave II -> AABC): only appears with cleave-ii in play', () => {
    const dice = [1, 2, 4, 5, 6] // a=2, b=2, c=1
    expect(hhEntry(dice, 0, false, [], 'Ghostly Charge (AABC)')).toBeUndefined()
    const e = hhEntry(dice, 0, false, ['cleave-ii'], 'Ghostly Charge (AABC)')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(2.0 + 2 * 1.8, 5) // GP calibré 1.8
  })

  it('Cursed Gallop (Ride Down II -> BBB): only appears with ride-down-ii in play', () => {
    const dice = [1, 2, 4, 4, 5] // a=2, b=3
    expect(hhEntry(dice, 0, false, [], 'Cursed Gallop (BBB)')).toBeUndefined()
    const e = hhEntry(dice, 0, false, ['ride-down-ii'], 'Cursed Gallop (BBB)')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(1.0 + 1.8, 5)
  })

  it('The Reaper (Reap II -> BBBCC): only appears with reap-ii in play', () => {
    const dice = [4, 4, 4, 6, 6] // b=3, c=2
    expect(hhEntry(dice, 0, false, [], 'The Reaper (BBBCC)')).toBeUndefined()
    const e = hhEntry(dice, 0, false, ['reap-ii'], 'The Reaper (BBBCC)')
    expect(e?.matched).toBe(true)
    // 4 dmg + dreadfulValueOfGaining(0,3)=9.0 + card draw (2.0)
    expect(e?.value).toBeCloseTo(4.0 + (1.9 + 0.9 + 0.9) + 1.6, 5) // The Reaper: dmg + 3 Dreadful calibrés + pioche 1.6
  })

  it('Haunted Strike (Spectral Assault II -> AACC): only appears with spectral-assault-ii in play', () => {
    const dice = [1, 2, 4, 6, 6] // a=2, c=2
    expect(hhEntry(dice, 0, false, [], 'Haunted Strike (AACC)')).toBeUndefined()
    const e = hhEntry(dice, 0, false, ['spectral-assault-ii'], 'Haunted Strike (AACC)')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(4.0, 5)
  })

  it('Spooky (Horrify II -> CCC): only appears with horrify-ii in play', () => {
    const dice = [1, 2, 6, 6, 6] // a=2, c=3
    expect(hhEntry(dice, 0, false, [], 'Spooky (CCC)')).toBeUndefined()
    const e = hhEntry(dice, 0, false, ['horrify-ii'], 'Spooky (CCC)')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(7.0 + 2 * 1.8, 5)
  })
})

describe('BW alt-abilities gated by upgradeIds', () => {
  it("Covert Mission (Widow's Gauntlets II -> AABB): only appears with widows-gauntlets-ii in play", () => {
    const dice = [1, 2, 3, 4, 4] // a=2, b=3
    expect(bwEntry(dice, 1, 0, [], 'Covert Mission')).toBeUndefined()
    const e = bwEntry(dice, 1, 0, ['widows-gauntlets-ii'], 'Covert Mission')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(1.6, 5) // TB calibrée 1.6 (upgrades<6)
  })

  it('Recon (Grapple II -> CCC): only appears with grapple-ii in play', () => {
    const dice = [1, 2, 6, 6, 6] // a=2, c=3 (base Grapple needs c>=4, so it alone doesn't compete)
    expect(bwEntry(dice, 1, 0, [], 'Recon')).toBeUndefined()
    const e = bwEntry(dice, 1, 0, ['grapple-ii'], 'Recon')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(1.5 + 4.0, 5) // Agility calibrée 1.5 + upgrade-search heuristic
  })

  it('Spy Game (Infiltrate II -> AABCC): only appears with infiltrate-ii in play', () => {
    const dice = [1, 2, 3, 6, 6] // a=2, b=1, c=2
    expect(bwEntry(dice, 1, 0, [], 'Spy Game')).toBeUndefined()
    const e = bwEntry(dice, 1, 0, ['infiltrate-ii'], 'Spy Game')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(6.0 + 0.75 + 1.5, 5) // dmg + Covert Ops 0.75 + Agility 1.5 (calibrés)
  })

  it('Subvert (Vengeance II -> ABBB): only appears with vengeance-ii in play', () => {
    const dice = [1, 3, 4, 5, 6] // a=1, b=3
    expect(bwEntry(dice, 1, 0, [], 'Subvert')).toBeUndefined()
    const e = bwEntry(dice, 1, 0, ['vengeance-ii'], 'Subvert')
    expect(e?.matched).toBe(true)
    expect(e?.value).toBeCloseTo(0.75 + 1.5, 5) // Covert Ops + Agility calibrés
  })
})

// Distinct from the alt-abilities above: these 10 Hero Upgrade ("II") cards ALSO replace the
// printed numbers on their own PARENT base ability (not a new ability) once in play — e.g.
// Cleave II changes Cleave 3A's dmg from 4 to 5. Previously unmodeled: neither the DP oracle
// nor real resolution (sim/turn.ts) picked up the buffed numbers regardless of upgradesInPlay.
describe('HH base abilities buffed by their own II upgrade', () => {
  it('Cleave 3A/4A/5A: 4/5/7 -> 5/6/8 dmg with cleave-ii in play', () => {
    expect(hhEntry([1, 1, 1, 4, 6], 0, false, [], 'Cleave 3A (AAA)')?.baseDamage).toBeCloseTo(4.0)
    expect(hhEntry([1, 1, 1, 4, 6], 0, false, ['cleave-ii'], 'Cleave 3A (AAA)')?.baseDamage).toBeCloseTo(5.0)
    expect(hhEntry([1, 1, 1, 1, 6], 0, false, ['cleave-ii'], 'Cleave 4A (AAAA)')?.baseDamage).toBeCloseTo(6.0)
    expect(hhEntry([1, 1, 1, 1, 1], 0, false, ['cleave-ii'], 'Cleave 5A (AAAAA)')?.baseDamage).toBeCloseTo(8.0)
  })

  it('Ride Down: Grim Pursuit gain 2 -> 3 with ride-down-ii in play (dmg unchanged at 6)', () => {
    const dice = [1, 2, 3, 4, 5] // a=3, b=2, c=0
    expect(hhEntry(dice, 0, false, [], 'Ride Down (AAABB)')?.value).toBeCloseTo(6.0 + 2 * 1.8, 5)
    expect(hhEntry(dice, 0, false, ['ride-down-ii'], 'Ride Down (AAABB)')?.value).toBeCloseTo(6.0 + 3 * 1.8, 5)
  })

  it('Sow Despair S/L: dreadful gain bumped (1->2 / 2->3), L also 9 -> 10 dmg, with sow-despair-ii', () => {
    expect(hhEntry([1, 2, 3, 4, 6], 0, false, [], 'Sow Despair S (4-straight)')?.baseDamage).toBeCloseTo(7.0)
    expect(hhEntry([1, 2, 3, 4, 6], 0, false, ['sow-despair-ii'], 'Sow Despair S (4-straight)')?.baseDamage).toBeCloseTo(7.0)
    expect(hhEntry([1, 2, 3, 4, 5], 0, false, [], 'Sow Despair L (5-straight)')?.baseDamage).toBeCloseTo(9.0)
    expect(hhEntry([1, 2, 3, 4, 5], 0, false, ['sow-despair-ii'], 'Sow Despair L (5-straight)')?.baseDamage).toBeCloseTo(10.0)
  })

  it('Reap: 3 -> 4 dmg with reap-ii in play', () => {
    const dice = [1, 4, 4, 4, 6] // b=3, c=1 (not >=2, so The Reaper doesn't also match)
    expect(hhEntry(dice, 0, false, [], 'Reap (BBBC)')?.baseDamage).toBeCloseTo(3.0)
    expect(hhEntry(dice, 0, false, ['reap-ii'], 'Reap (BBBC)')?.baseDamage).toBeCloseTo(4.0)
  })

  it('Spectral Assault: 8 -> 9 dmg with spectral-assault-ii in play', () => {
    const dice = [1, 2, 3, 6, 6] // a=3, c=2
    expect(hhEntry(dice, 0, false, [], 'Spectral Assault (AAACC)')?.baseDamage).toBeCloseTo(8.0)
    expect(hhEntry(dice, 0, false, ['spectral-assault-ii'], 'Spectral Assault (AAACC)')?.baseDamage).toBeCloseTo(9.0)
  })

  it('Horrify: Grim Pursuit becomes unconditional 2 (was 1, Head-only) with horrify-ii in play', () => {
    const dice = [6, 6, 6, 6, 1] // c=4, a=1
    expect(hhEntry(dice, 0, false, [], 'Horrify (CCCC)')?.value).toBeCloseTo(6.0 + (1.9 + 0.9 + 0.9), 5) // no Head, no upgrade (Dreadful calibrés)
    expect(hhEntry(dice, 0, false, ['horrify-ii'], 'Horrify (CCCC)')?.value).toBeCloseTo(6.0 + (1.9 + 0.9 + 0.9) + 2 * 1.8, 5) // Dreadful + GP calibrés
  })
})

describe('BW base abilities buffed by their own II upgrade', () => {
  it('Baton Strike 3B/4B/5B: 5/6/7 -> 6/7/8 dmg with baton-strike-ii in play', () => {
    const dice3b = [1, 2, 3, 4, 5] // a=2, b=3
    expect(bwEntry(dice3b, 0, 0, [], 'Baton Strike 3B (BBB)')?.baseDamage).toBeCloseTo(5.0)
    expect(bwEntry(dice3b, 0, 0, ['baton-strike-ii'], 'Baton Strike 3B (BBB)')?.baseDamage).toBeCloseTo(6.0)
    expect(bwEntry([3, 4, 4, 5, 1], 0, 0, ['baton-strike-ii'], 'Baton Strike 4B (BBBB)')?.baseDamage).toBeCloseTo(7.0)
    expect(bwEntry([3, 4, 4, 5, 5], 0, 0, ['baton-strike-ii'], 'Baton Strike 5B (BBBBB)')?.baseDamage).toBeCloseTo(8.0)
  })

  it("Widow's Gauntlets: 6 -> 7 dmg with widows-gauntlets-ii in play", () => {
    const dice = [1, 2, 3, 4, 5] // a=2, b=3
    expect(bwEntry(dice, 0, 0, [], "Widow's Gauntlets (BBBAA)")?.baseDamage).toBeCloseTo(6.0)
    expect(bwEntry(dice, 0, 0, ['widows-gauntlets-ii'], "Widow's Gauntlets (BBBAA)")?.baseDamage).toBeCloseTo(7.0)
  })

  it('Hacked: 5 -> 6 dmg with hacked-ii in play', () => {
    const dice = [1, 2, 3, 4, 6] // small straight
    expect(bwEntry(dice, 0, 0, [], 'Hacked (4-straight)')?.baseDamage).toBeCloseTo(5.0)
    expect(bwEntry(dice, 0, 0, ['hacked-ii'], 'Hacked (4-straight)')?.baseDamage).toBeCloseTo(6.0)
  })

  it('Grapple: 6 -> 7 dmg with grapple-ii in play', () => {
    const dice = [6, 6, 6, 6, 1] // c=4
    expect(bwEntry(dice, 0, 0, [], 'Grapple (CCCC)')?.baseDamage).toBeCloseTo(6.0)
    expect(bwEntry(dice, 0, 0, ['grapple-ii'], 'Grapple (CCCC)')?.baseDamage).toBeCloseTo(7.0)
  })
})
