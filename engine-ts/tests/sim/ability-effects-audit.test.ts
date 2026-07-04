import { describe, it, expect } from 'vitest'
import { createInitialGameState } from '../../src/sim/match.js'
import { resolveAbilityPhase } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { heroTemplateFor, resolvedAbilityByBoardName } from '../../src/sim/data/load.js'
import { mulberry32 } from '../../src/sim/rng.js'
import type { HeroId } from '../../src/sim/types.js'

// SYSTEMATIC AUDIT: for EVERY ability of both heroes (base + upgrade-unlocked alts), resolve a
// real attack through resolveAbilityPhase and assert that everything hero.json DECLARES
// (tokensGrantedToSelf, tokensInflictedOnOpponent.timeBomb, cpGain, cardDraw, searchUpgrades…)
// actually LANDS on the game state. Born from a run of user-reported "the data says X but the
// game silently didn't do X / didn't show X" bugs (giveHead, Ride Down pattern, Grim Pursuit b)
// — this catches the whole declared-vs-applied class at once instead of one report at a time.
//
// Deltas are asserted with >= (bonus rolls / riders can add MORE than the declared floor);
// fresh games keep every token far from its cap so grants are never silently clipped.

interface Case { boardName: string; dice: number[]; upgrades?: string[] }

// Dice are chosen so the target ability matches; overlapping candidates are fine because
// chooseAbility is forced to the audited name (the engine validates it is a legal candidate).
const HH_CASES: Case[] = [
  { boardName: 'Cleave 3A (AAA)', dice: [1, 1, 1, 4, 6] },
  { boardName: 'Cleave 4A (AAAA)', dice: [1, 1, 1, 2, 6] },
  { boardName: 'Cleave 5A (AAAAA)', dice: [1, 1, 2, 2, 3] },
  { boardName: 'Reap (BBBC)', dice: [1, 4, 4, 5, 6] },
  { boardName: 'Ride Down (AAABB)', dice: [1, 1, 2, 4, 5] },
  { boardName: 'Sow Despair S (4-straight)', dice: [1, 2, 3, 4, 4] },
  { boardName: 'Sow Despair L (5-straight)', dice: [2, 3, 4, 5, 6] },
  { boardName: 'Horrify (CCCC)', dice: [1, 6, 6, 6, 6] },
  { boardName: 'Spectral Assault (AAACC)', dice: [1, 1, 1, 6, 6] },
  { boardName: 'Dreadful Charge (CCCCC)', dice: [6, 6, 6, 6, 6] },
  { boardName: 'Ghostly Charge (AABC)', dice: [1, 2, 4, 5, 6], upgrades: ['cleave-ii'] },
  { boardName: 'Cursed Gallop (BBB)', dice: [1, 1, 4, 4, 4], upgrades: ['ride-down-ii'] },
  { boardName: 'The Reaper (BBBCC)', dice: [4, 4, 5, 6, 6], upgrades: ['reap-ii'] },
  { boardName: 'Haunted Strike (AACC)', dice: [1, 1, 4, 6, 6], upgrades: ['spectral-assault-ii'] },
  { boardName: 'Spooky (CCC)', dice: [1, 1, 6, 6, 6], upgrades: ['horrify-ii'] },
]

const BW_CASES: Case[] = [
  { boardName: 'Baton Strike 3B (BBB)', dice: [1, 3, 3, 3, 6] },
  { boardName: 'Baton Strike 4B (BBBB)', dice: [1, 3, 3, 4, 4] },
  { boardName: 'Baton Strike 5B (BBBBB)', dice: [3, 3, 4, 4, 5] },
  { boardName: 'Infiltrate (AABC)', dice: [1, 2, 3, 3, 6] },
  { boardName: "Widow's Gauntlets (BBBAA)", dice: [1, 1, 3, 4, 5] },
  { boardName: 'Hacked (4-straight)', dice: [1, 2, 3, 4, 4] },
  { boardName: 'Grapple (CCCC)', dice: [3, 6, 6, 6, 6] },
  { boardName: 'Vengeance (5-straight)', dice: [2, 3, 4, 5, 6] },
  { boardName: "Widow's Bite (CCCCC)", dice: [6, 6, 6, 6, 6] },
  // BW alt boardNames carry NO dice-pattern suffix in hero.json (unlike HH's) — use them verbatim.
  { boardName: 'Covert Mission', dice: [1, 1, 3, 3, 6], upgrades: ['widows-gauntlets-ii'] },
  { boardName: 'Recon', dice: [1, 3, 6, 6, 6], upgrades: ['grapple-ii'] },
  { boardName: 'Spy Game', dice: [1, 1, 3, 6, 6], upgrades: ['infiltrate-ii'] },
  { boardName: 'Subvert', dice: [1, 3, 3, 3, 5], upgrades: ['vengeance-ii'] },
]

function runCase(heroId: HeroId, c: Case) {
  // Attacker always seat 0 (its hero first); rng-seeded init so decks exist for cardDraw.
  const other: HeroId = heroId === 'hh' ? 'bw' : 'hh'
  const state = createInitialGameState(heroId, other, mulberry32(99))
  const attacker = state.players[0]
  attacker.upgradesInPlay = c.upgrades ?? []
  // covertOps STARTS at its cap (3/3) — lower it so a declared gain is measurable, not clipped.
  if (attacker.tokens.covertOps > 0) attacker.tokens.covertOps = 0
  const before = {
    tokens: { ...attacker.tokens },
    cp: attacker.cp,
    hand: attacker.hand.length,
    upgrades: attacker.upgradesInPlay.length,
    oppTb: state.players[1].timeBombs.length,
  }
  const forced = { ...greedyHighestDamagePolicy, chooseAbility: () => c.boardName }
  resolveAbilityPhase(state, 0, c.dice, mulberry32(7), [forced, greedyHighestDamagePolicy])

  // The forced name must actually have been a legal candidate (guards the dice choices above).
  expect(state.log.some(l => l.message === `Chose ability: ${c.boardName}`),
    `${c.boardName}: not offered as a candidate for dice [${c.dice}]`).toBe(true)

  const data = resolvedAbilityByBoardName(heroTemplateFor(heroId), c.boardName, attacker.upgradesInPlay)!
  expect(data, `${c.boardName}: no data`).toBeTruthy()

  // --- declared self token grants must land (>=: riders/bonus rolls may add more) ---
  for (const [kind, amount] of Object.entries(data.tokensGrantedToSelf ?? {})) {
    if (!amount || kind === 'timeBomb') continue
    const delta = (attacker.tokens as any)[kind] - (before.tokens as any)[kind]
    expect(delta, `${c.boardName}: declared +${amount} ${kind}, applied ${delta}`).toBeGreaterThanOrEqual(amount)
  }
  // --- declared Time Bombs on the opponent ---
  const tbDeclared = data.tokensInflictedOnOpponent?.timeBomb ?? 0
  if (tbDeclared > 0) {
    const tbDelta = state.players[1].timeBombs.length - before.oppTb
    expect(tbDelta, `${c.boardName}: declared ${tbDeclared} TB, applied ${tbDelta}`).toBeGreaterThanOrEqual(tbDeclared)
  }
  // --- declared CP gain (unconditional only; the >=N-upgrades conditional is off with 0/1 upgrades) ---
  if (data.cpGain) {
    const cpDelta = attacker.cp - before.cp
    expect(cpDelta, `${c.boardName}: declared +${data.cpGain} CP, applied ${cpDelta}`).toBeGreaterThanOrEqual(data.cpGain)
  }
  // --- declared card draw (Reap's is Head-conditional; attacker starts holding its own Head) ---
  const drawDeclared = (data.cardDraw ?? 0) + (data.cardDrawIfHasHead && attacker.tokens.head > 0 ? 1 : 0)
  if (drawDeclared > 0) {
    const handDelta = attacker.hand.length - before.hand
    expect(handDelta, `${c.boardName}: declared draw ${drawDeclared}, hand delta ${handDelta}`).toBeGreaterThanOrEqual(drawDeclared)
  }
  // --- declared deck-search into play (Widow's Bite) ---
  if (data.searchUpgradesIntoPlay) {
    const upDelta = attacker.upgradesInPlay.length - before.upgrades
    expect(upDelta, `${c.boardName}: declared search ${data.searchUpgradesIntoPlay} upgrades, applied ${upDelta}`).toBeGreaterThanOrEqual(1)
  }
}

describe('AUDIT: every declared ability effect is actually applied (HH)', () => {
  for (const c of HH_CASES) it(c.boardName, () => runCase('hh', c))
})
describe('AUDIT: every declared ability effect is actually applied (BW)', () => {
  for (const c of BW_CASES) it(c.boardName, () => runCase('bw', c))
})
