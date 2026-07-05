// Observation harness: plays a FROZEN network against itself for many games and tallies every
// decision it makes, so we can describe HOW the trained AI actually plays (ability usage %, which
// cards it values vs ignores, when it Terrorizes, defense behavior, damage/turns/outcomes) — the
// raw material for the hero strategy guides. The network never learns here; we only watch it.
//
// New, self-contained file: imports only already-exported pure pieces, modifies nothing else (a
// training run may share these modules). It wraps createValueGreedyPolicy in a "spy" that records
// each decision as the game proceeds exactly as normal — same pattern as inspect.ts.
//
// Run (one network):
//   npx tsx src/sim/rl/analyze.ts --weights best|latest|backup|<path> --games <perMatchup> --seed <n> --out <file.json>
//
// --games is games PER MATCHUP (4 matchups: hh-bw, bw-hh, hh-hh, bw-bw). Each hero therefore
// appears in 3 of them, so `--games 100` ≈ 300 games of presence per hero.
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GameState, HeroId, WindowAction } from '../types.js'
import type { Policy, RollManipulationChoice } from '../policy.js'
import { fromJSON } from './network.js'
import type { Network } from './network.js'
import { createValueGreedyPolicy } from './valueGreedyPolicy.js'
import { mulberry32 } from '../rng.js'
import { playTurn } from '../turn.js'
import { createInitialGameState, MAX_TURNS } from '../match.js'

const RL_DIR = path.dirname(fileURLToPath(import.meta.url))
const WEIGHTS_DIR = path.join(RL_DIR, 'weights')
const MATCHUPS: Array<[HeroId, HeroId]> = [['hh', 'bw'], ['bw', 'hh'], ['hh', 'hh'], ['bw', 'bw']]

// ---- Per-hero accumulators ---------------------------------------------------------------------
// Everything the AI does while playing this hero, pooled across every matchup it appears in. Counts
// are absolute; percentages/per-game rates are derived at report time from `slots` (number of
// player-seats this hero occupied — a mirror game contributes 2 seats).
interface HeroStats {
  heroId: HeroId
  slots: number // player-seats occupied by this hero (denominator for per-game rates)
  abilityCounts: Record<string, number> // boardName -> times activated
  cardPlays: Record<string, number> // cardId -> times played (any hook/window)
  cardPlaysByWindow: Record<string, Record<string, number>> // window -> cardId -> count
  terrorize: { offered: number; taken: number; dreadfulWhenTaken: number[]; dreadfulWhenDeclined: number[] }
  horrify: { dreadful: number; grimPursuit: number }
  sabotageReroll: { offered: number; rerolled: number }
  grimPursuitSpend: { offered: number; spent: number }
  covertOpsUpgrades: number
  damageDealt: number[] // per seat: HP the opponent lost that game
  damageTaken: number[] // per seat: HP this hero lost that game
}

function emptyHeroStats(heroId: HeroId): HeroStats {
  return {
    heroId, slots: 0,
    abilityCounts: {}, cardPlays: {}, cardPlaysByWindow: {},
    terrorize: { offered: 0, taken: 0, dreadfulWhenTaken: [], dreadfulWhenDeclined: [] },
    horrify: { dreadful: 0, grimPursuit: 0 },
    sabotageReroll: { offered: 0, rerolled: 0 },
    grimPursuitSpend: { offered: 0, spent: 0 },
    covertOpsUpgrades: 0,
    damageDealt: [], damageTaken: [],
  }
}

const inc = (m: Record<string, number>, k: string, n = 1) => { m[k] = (m[k] ?? 0) + n }

// ---- Per-matchup outcome accumulators ----------------------------------------------------------
interface MatchupStats {
  label: string
  games: number
  winsP0: number
  winsP1: number
  draws: number // mutual kill (gameOver, winner null)
  timeouts: number // MAX_TURNS with no decision
  totalTurns: number
}

interface AnalysisReport {
  weightsPath: string
  gamesPerMatchup: number
  seed: number
  hero: Record<HeroId, HeroStats>
  matchups: MatchupStats[]
}

// The window a card was played in, for the "when does it play this?" breakdown.
function cardIdOf(a: WindowAction): string | null {
  switch (a.kind) {
    case 'playCard': case 'playInstant': case 'covertOpsUpgrade':
    case 'alterDie': case 'rerollDie': case 'rerollAll': case 'setDie':
    case 'transferToken': case 'removeToken': case 'removeAllTokens': case 'moveHead':
      return a.cardId
    default:
      return null
  }
}

// Wraps the learned policy so every decision is recorded into the right hero's accumulator, keyed
// by the deciding player's heroId (works for mirror games too — playerIdx tells us who decided).
function makeSpy(base: Policy, statsByHero: Record<HeroId, HeroStats>): Policy {
  const heroAt = (state: GameState, playerIdx: 0 | 1) => statsByHero[state.players[playerIdx].heroId]

  const spy: Policy = {
    ...base,

    chooseAbility(state, playerIdx, candidates) {
      const chosen = base.chooseAbility(state, playerIdx, candidates)
      inc(heroAt(state, playerIdx).abilityCounts, chosen)
      return chosen
    },

    decide(state, playerIdx, request) {
      const action = base.decide(state, playerIdx, request)
      const cardId = cardIdOf(action)
      if (cardId) {
        const h = heroAt(state, playerIdx)
        inc(h.cardPlays, cardId)
        const w = request.ctx.windowType
        h.cardPlaysByWindow[w] ??= {}
        inc(h.cardPlaysByWindow[w], cardId)
        if (action.kind === 'covertOpsUpgrade') h.covertOpsUpgrades += 1
      }
      return action
    },

    chooseHeadlessMayhem(state, playerIdx, canTerrorize) {
      const choice = base.chooseHeadlessMayhem(state, playerIdx, canTerrorize)
      if (canTerrorize) {
        const h = heroAt(state, playerIdx)
        const dreadful = state.players[playerIdx].tokens.dreadful
        h.terrorize.offered += 1
        if (choice === 'terrorize') { h.terrorize.taken += 1; h.terrorize.dreadfulWhenTaken.push(dreadful) }
        else h.terrorize.dreadfulWhenDeclined.push(dreadful)
      }
      return choice
    },

    chooseHorrifyBonus(state, playerIdx) {
      const choice = base.chooseHorrifyBonus(state, playerIdx)
      const h = heroAt(state, playerIdx)
      if (choice === 'dreadful') h.horrify.dreadful += 1
      else h.horrify.grimPursuit += 1
      return choice
    },

    chooseSabotageReroll(state, defenderIdx, dice) {
      const choice = base.chooseSabotageReroll(state, defenderIdx, dice)
      const h = heroAt(state, defenderIdx)
      h.sabotageReroll.offered += 1
      if (choice) h.sabotageReroll.rerolled += 1
      return choice
    },

    chooseAttackModifierCards(state, playerIdx, dmg, eligibleCardIds) {
      const played = base.chooseAttackModifierCards(state, playerIdx, dmg, eligibleCardIds)
      const h = heroAt(state, playerIdx)
      for (const id of played) { inc(h.cardPlays, id); h.cardPlaysByWindow['attackMod'] ??= {}; inc(h.cardPlaysByWindow['attackMod'], id) }
      return played
    },

    chooseRollManipulationCards(state, playerIdx, dice, rollsRemaining, eligibleCardIds): RollManipulationChoice[] {
      const played = base.chooseRollManipulationCards(state, playerIdx, dice, rollsRemaining, eligibleCardIds)
      const h = heroAt(state, playerIdx)
      for (const c of played) { inc(h.cardPlays, c.cardId); h.cardPlaysByWindow['rollManip'] ??= {}; inc(h.cardPlaysByWindow['rollManip'], c.cardId) }
      return played
    },

    chooseMidRollCards(state, playerIdx, dice, rollsRemaining) {
      const played = base.chooseMidRollCards(state, playerIdx, dice, rollsRemaining)
      const h = heroAt(state, playerIdx)
      for (const id of played) { inc(h.cardPlays, id); h.cardPlaysByWindow['midRoll'] ??= {}; inc(h.cardPlaysByWindow['midRoll'], id) }
      return played
    },
  }

  // chooseGrimPursuitSpend is optional on the interface; only wrap if the base provides it.
  if (base.chooseGrimPursuitSpend) {
    spy.chooseGrimPursuitSpend = (state, playerIdx, dmg) => {
      const choice = base.chooseGrimPursuitSpend!(state, playerIdx, dmg)
      const h = heroAt(state, playerIdx)
      h.grimPursuitSpend.offered += 1
      if (choice) h.grimPursuitSpend.spent += 1
      return choice
    }
  }

  return spy
}

function analyzeNetwork(network: Network, gamesPerMatchup: number, seedBase: number): { hero: Record<HeroId, HeroStats>; matchups: MatchupStats[] } {
  const statsByHero: Record<HeroId, HeroStats> = { hh: emptyHeroStats('hh'), bw: emptyHeroStats('bw'), fm: emptyHeroStats('fm') }
  const policy = makeSpy(createValueGreedyPolicy(network), statsByHero)
  const matchups: MatchupStats[] = []

  let seedCursor = seedBase
  for (const [heroA, heroB] of MATCHUPS) {
    const ms: MatchupStats = { label: `${heroA}(p0) vs ${heroB}(p1)`, games: 0, winsP0: 0, winsP1: 0, draws: 0, timeouts: 0, totalTurns: 0 }
    for (let g = 0; g < gamesPerMatchup; g++) {
      const rng = mulberry32(seedCursor++)
      const state = createInitialGameState(heroA, heroB, rng)
      const lost: [number, number] = [0, 0] // HP lost per player this game (damage taken proxy)
      while (!state.gameOver && state.turnNumber < MAX_TURNS) {
        state.turnNumber += 1
        const activeIdx = state.activePlayerIdx
        const before: [number, number] = [state.players[0].hp, state.players[1].hp]
        playTurn(state, activeIdx, rng, [policy, policy])
        for (const i of [0, 1] as const) { const d = before[i] - state.players[i].hp; if (d > 0) lost[i] += d }
        state.activePlayerIdx = (1 - activeIdx) as 0 | 1
      }
      ms.games += 1
      ms.totalTurns += state.turnNumber
      if (state.winner === 0) ms.winsP0 += 1
      else if (state.winner === 1) ms.winsP1 += 1
      else if (state.gameOver) ms.draws += 1
      else ms.timeouts += 1

      // Attribute this game's damage to each hero's seat (dealt ≈ opponent's HP lost).
      for (const i of [0, 1] as const) {
        const h = statsByHero[state.players[i].heroId]
        h.slots += 1
        h.damageTaken.push(lost[i])
        h.damageDealt.push(lost[(1 - i) as 0 | 1])
      }
    }
    matchups.push(ms)
  }
  return { hero: statsByHero, matchups }
}

// ---- CLI ---------------------------------------------------------------------------------------
function resolveWeights(arg: string): string {
  if (arg === 'best') return path.join(WEIGHTS_DIR, 'best.json')
  if (arg === 'latest') return path.join(WEIGHTS_DIR, 'latest.json')
  if (arg === 'backup') return path.join(RL_DIR, 'weights_backup', 'best.json')
  return arg
}

function main(): void {
  const argv = process.argv.slice(2)
  const get = (flag: string) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : undefined }

  const weightsPath = resolveWeights(get('--weights') ?? 'best')
  const gamesPerMatchup = Number(get('--games') ?? 100)
  const seed = Number(get('--seed') ?? 1000)
  const outPath = get('--out')

  if (!fs.existsSync(weightsPath)) throw new Error(`No weights at ${weightsPath}`)
  const network = fromJSON(fs.readFileSync(weightsPath, 'utf-8'))

  const t0 = Date.now()
  console.log(`Analyzing ${path.relative(process.cwd(), weightsPath)} — ${gamesPerMatchup} games/matchup × ${MATCHUPS.length} matchups...`)
  const { hero, matchups } = analyzeNetwork(network, gamesPerMatchup, seed)
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

  // --- console summary (quick sanity read) ---
  console.log(`\nDone in ${elapsed}s. Matchup outcomes:`)
  for (const m of matchups) {
    console.log(`  ${m.label}: p0 ${m.winsP0} / p1 ${m.winsP1} / draws ${m.draws} / timeouts ${m.timeouts} (avg ${(m.totalTurns / m.games).toFixed(1)} turns)`)
  }
  for (const hid of ['hh', 'bw'] as const) {
    const h = hero[hid]
    const totalAbil = Object.values(h.abilityCounts).reduce((a, b) => a + b, 0)
    console.log(`\n${hid.toUpperCase()} — ${h.slots} seats, ${totalAbil} ability activations`)
    const top = Object.entries(h.abilityCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
    for (const [name, c] of top) console.log(`  ${((100 * c) / totalAbil).toFixed(1)}%  ${name} (${c})`)
    if (hid === 'hh') console.log(`  Terrorize: offered ${h.terrorize.offered}, taken ${h.terrorize.taken}`)
    const cards = Object.entries(h.cardPlays).sort((a, b) => b[1] - a[1])
    console.log(`  cards played (distinct): ${cards.length}`)
  }

  const report: AnalysisReport = { weightsPath: path.relative(process.cwd(), weightsPath), gamesPerMatchup, seed, hero, matchups }
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
    console.log(`\nStats written to ${outPath}`)
  }
}

main()
