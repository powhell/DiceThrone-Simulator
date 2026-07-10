// Banc de force (Phase 0 du PLAN_STRONG_AI) — LA métrique du projet : fait s'affronter deux
// agents (Policy) sur N parties et renvoie winrate + intervalle de confiance. Chaque phase
// suivante doit battre la précédente ICI (Phase 2 : CI ne chevauchant pas 50 %).
// Les parties vont par PAIRES MIROIR : même graine, sièges échangés (A joueur 0 puis A joueur 1).
// Ça annule l'avantage du premier joueur, réduit la variance (même chance de dés des deux côtés),
// et rend le banc exactement symétrique — benchStrength(B, A) inverse les comptes de
// benchStrength(A, B). L'alternance non appariée d'evalNets.ts (graine différente par siège) ne
// donnait pas cette garantie. Duels héros-vs-héros uniquement (pas de boss nx : mesurer A contre
// B tête-à-tête n'a pas besoin de Naraxus).
import type { HeroId } from './types.js'
import type { Policy } from './policy.js'
import { runMatch } from './match.js'
import { EVAL_MATCHUPS } from './rl/matchups.js'

export interface BenchOptions {
  gamesPerMatchup: number // arrondi au pair supérieur (les parties vont par paires miroir)
  matchups?: Array<[HeroId, HeroId]> // défaut : EVAL_MATCHUPS sans les paires boss
  seed?: number
}

export interface BenchResult {
  games: number // total joué = gamesPerMatchup × matchups.length
  aWins: number
  bWins: number
  draws: number // gameOver sans vainqueur (entre-tuerie simultanée)
  timeouts: number // cap MAX_TURNS atteint — signal de bug, pas un résultat de jeu
  winrate: number // part de A parmi les parties DÉCISIVES (draws/timeouts exclus)
  ci: [number, number] // Wilson 95 % sur les parties décisives
}

export function benchStrength(polA: Policy, polB: Policy, opts: BenchOptions): BenchResult {
  const matchups = opts.matchups ?? EVAL_MATCHUPS.filter(([, b]) => b !== 'nx')
  const pairsPerMatchup = Math.ceil(opts.gamesPerMatchup / 2)
  let seed = opts.seed ?? 7000
  let games = 0
  let aWins = 0, bWins = 0, draws = 0, timeouts = 0
  for (const [heroA, heroB] of matchups) {
    for (let pair = 0; pair < pairsPerMatchup; pair++) {
      const pairSeed = seed++
      for (const aSeat of [0, 1] as const) {
        const policies: [Policy, Policy] = aSeat === 0 ? [polA, polB] : [polB, polA]
        const r = runMatch(heroA, heroB, pairSeed, policies)
        games += 1
        if (r.winner === null) {
          if (r.finalState.gameOver) draws += 1
          else timeouts += 1
        } else if (r.winner === aSeat) aWins += 1
        else bWins += 1
      }
    }
  }
  const decisive = aWins + bWins
  const winrate = decisive > 0 ? aWins / decisive : 0.5
  return {
    games,
    aWins, bWins, draws, timeouts,
    winrate,
    ci: wilson(aWins, decisive),
  }
}

// Intervalle de Wilson à 95 % pour une proportion binomiale — préféré à l'approximation
// normale car il reste valide aux petits N et aux proportions extrêmes (0 ou 1), exactement
// les régimes d'un banc A/B court. n = 0 → [0, 1] (aucune information).
export function wilson(wins: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1]
  const p = wins / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const half = (z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / denom
  return [Math.max(0, center - half), Math.min(1, center + half)]
}
