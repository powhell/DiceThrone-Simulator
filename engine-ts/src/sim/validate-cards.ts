// FULL card-coverage validation: does EVERY card in the game actually get played end-to-end in a
// real self-play match? validate-stage5.ts only exercised the Stage 5 mechanics; this drives ALL
// decision hooks (window decide, attack modifiers, roll-manipulation, mid-roll upgrades, sabotage
// reroll) with a maximally-playing "exerciser" so every card fires, then reports per-card coverage
// plus crash/invariant checks. New, self-contained file — modifies nothing.
// Run: npx tsx src/sim/validate-cards.ts [gamesPerMatchup]
import type { GameState, HeroId, WindowAction, TurnLogEntry } from './types.js'
import type { Policy, RollManipulationChoice } from './policy.js'
import { greedyHighestDamagePolicy } from './policy.js'
import { mulberry32 } from './rng.js'
import { playTurn } from './turn.js'
import { createInitialGameState, MAX_TURNS } from './match.js'
import { heroTemplateFor, commonCards } from './data/load.js'

// Every card id -> display name (name is what the engine writes into the log on a play).
function allCards(): { id: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const c of [...heroTemplateFor('hh').cards, ...heroTemplateFor('bw').cards, ...commonCards.cards]) {
    if (!seen.has(c.id)) seen.set(c.id, c.name)
  }
  return [...seen].map(([id, name]) => ({ id, name }))
}

// Builds one roll-manipulation choice per eligible card (the oracle-path cards: Six-It!, Samesies!,
// Try Try Again!, One More Time!, So Wild!, Twice As Wild! played on the roller's OWN dice mid-roll).
function rollManipChoices(dice: number[], eligible: string[]): RollManipulationChoice[] {
  const out: RollManipulationChoice[] = []
  for (const id of eligible) {
    if (id === 'one-more-time') out.push({ cardId: id })
    else if (id === 'try-try-again') out.push({ cardId: id, dieIndices: [0] })
    else if (id === 'six-it' || id === 'so-wild') out.push({ cardId: id, dieIndices: [0], values: [6] })
    else if (id === 'twice-as-wild') out.push({ cardId: id, dieIndices: [0, 1], values: [6, 6] })
    else if (id === 'samesies') out.push({ cardId: id, dieIndices: [0], values: [dice[1]] })
  }
  return out
}

// Plays EVERYTHING it legally can, through every hook, to maximise card coverage.
function makeFullExerciser(): Policy {
  return {
    ...greedyHighestDamagePolicy,
    // Any window: take the first non-pass option (upgrades, instants, cross-player, defensive cards,
    // dice alteration — all route through decide/enumerateWindowActions).
    decide(_state, _idx, request): WindowAction {
      const act = request.options.find(o => o.kind !== 'pass')
      return act ?? { kind: 'pass' }
    },
    chooseGrimPursuitSpend: () => true,
    chooseAttackModifierCards: (_s, _i, _dmg, eligible) => eligible, // play all attack modifiers
    chooseRollManipulationCards: (_s, _i, dice, _rr, eligible) => rollManipChoices(dice, eligible),
    chooseMidRollCards: (state, idx) => { // BW Red Room Training: play affordable upgrades mid-roll
      const p = state.players[idx]
      const hero = heroTemplateFor(p.heroId)
      return p.hand.filter(id => { const c = hero.cards.find(x => x.id === id); return c?.kind === 'upgrade' && p.cp >= (c.cpCost ?? 0) })
    },
    chooseSabotageReroll: (state, idx) => state.players[idx].upgradesInPlay.includes('sabotage-ii'),
  }
}

interface Note { seed: number; matchup: string; msg: string }

function playGame(a: HeroId, b: HeroId, seed: number): GameState {
  const rng = mulberry32(seed)
  const state = createInitialGameState(a, b, rng)
  const ex = makeFullExerciser()
  const policies: [Policy, Policy] = [ex, ex]
  while (!state.gameOver && state.turnNumber < MAX_TURNS) {
    state.turnNumber += 1
    const activeIdx = state.activePlayerIdx
    playTurn(state, activeIdx, rng, policies)
    if (state.gameOver) break
    state.activePlayerIdx = (1 - activeIdx) as 0 | 1
  }
  return state
}

function main(): void {
  const perMatchup = Number(process.argv[2] ?? 60)
  const matchups: [HeroId, HeroId][] = [['hh', 'bw'], ['bw', 'hh'], ['hh', 'hh'], ['bw', 'bw']]
  const cards = allCards()
  const hits: Record<string, number> = Object.fromEntries(cards.map(c => [c.id, 0]))
  const crashes: Note[] = []
  const invariants: Note[] = []
  let games = 0

  for (const [a, b] of matchups) {
    for (let seed = 0; seed < perMatchup; seed++) {
      games++
      let state: GameState
      try { state = playGame(a, b, seed) } catch (err) { crashes.push({ seed, matchup: `${a}-${b}`, msg: String(err) }); continue }
      for (const p of state.players) {
        if (p.cp < 0) invariants.push({ seed, matchup: `${a}-${b}`, msg: `negative CP ${p.cp}` })
        if (p.tokens.dreadful > 5 || p.tokens.grimPursuit > 3 || p.tokens.agility > 2 || p.timeBombs.length > 2) {
          invariants.push({ seed, matchup: `${a}-${b}`, msg: `token cap exceeded` })
        }
      }
      const msgs = (state.log as TurnLogEntry[]).map(e => e.message)
      for (const c of cards) if (msgs.some(m => m.includes(c.name))) hits[c.id]++
    }
  }

  console.log(`=== FULL card-coverage validation — ${games} games (${perMatchup}/matchup × 4), max-play exerciser ===`)
  console.log(`crashes ${crashes.length}, invariant violations ${invariants.length}\n`)
  const never = cards.filter(c => hits[c.id] === 0)
  const byName = [...cards].sort((x, y) => hits[x.id] - hits[y.id])
  console.log('Per-card coverage (games in which the card was played), lowest first:')
  for (const c of byName) console.log(`  ${hits[c.id] > 0 ? '✓' : '✗ NEVER'}  ${c.name.padEnd(24)} ${c.id.padEnd(22)} ${hits[c.id]}/${games}`)
  for (const x of crashes.slice(0, 5)) console.log(`  CRASH ${x.matchup} seed ${x.seed}: ${x.msg}`)
  for (const x of invariants.slice(0, 5)) console.log(`  INVARIANT ${x.matchup} seed ${x.seed}: ${x.msg}`)
  console.log(`\n=== ${cards.length - never.length}/${cards.length} cards fired. Never: ${never.map(c => c.id).join(', ') || 'none'} ===`)
  console.log(`=== crashes ${crashes.length}, invariant violations ${invariants.length} ===`)
}

main()
