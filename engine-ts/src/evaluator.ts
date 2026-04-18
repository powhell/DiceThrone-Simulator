import { bestAbilityValue, bestAbilityName, buildAbilityBoard, AbilityEntry } from './abilities.js'
import { enumerateOutcomes } from './dice.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeepOption {
  kept: number[]
  ev: number
  probDist: Record<string, number>  // ability name → probability % (0-100)
  isGuaranteed?: boolean
}

export interface SolverResult {
  currentEv: number
  topOptions: KeepOption[]
  abilities: AbilityEntry[]
}

// ─── Memoization ─────────────────────────────────────────────────────────────

const evMemo = new Map<string, number>()
const distMemo = new Map<string, Record<string, number>>()

function cacheKey(kept: number[], rollsRemaining: number, dreadful: number, hasHead: boolean): string {
  return `${kept.join(',')}|${rollsRemaining}|${dreadful}|${hasHead ? 1 : 0}`
}

export function clearCache(): void {
  evMemo.clear()
  distMemo.clear()
}

// ─── Core solver ─────────────────────────────────────────────────────────────

export function evalState(
  kept: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): number {
  if (rollsRemaining === 0) {
    if (kept.length !== 5) throw new Error(`evalState: need 5 dice at rolls=0, got ${kept.length}`)
    return bestAbilityValue(kept, dreadful, hasHead)
  }

  const key = cacheKey(kept, rollsRemaining, dreadful, hasHead)
  const cached = evMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = 5 - kept.length
  const prob = Math.pow(1 / 6, nReroll)

  let totalEv = 0.0
  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    totalEv += prob * _bestKeepEv(full, rollsRemaining - 1, dreadful, hasHead)
  }

  evMemo.set(key, totalEv)
  return totalEv
}

// Given exactly 5 dice, find the EV of the best keeping strategy.
function _bestKeepEv(
  full: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): number {
  if (rollsRemaining === 0) return evalState(full, 0, dreadful, hasHead)

  let best = -Infinity
  // All 2^5 = 32 subsets via bitmask
  for (let mask = 0; mask < 32; mask++) {
    const kept: number[] = []
    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) kept.push(full[i])
    }
    kept.sort((a, b) => a - b)
    const ev = evalState(kept, rollsRemaining, dreadful, hasHead)
    if (ev > best) best = ev
  }
  return best
}

// Given exactly 5 dice, return the optimal kept subset (sorted).
function _optimalKeep(
  full: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): number[] {
  if (rollsRemaining === 0) return full

  let bestEv = -Infinity
  let bestKept: number[] = full

  for (let mask = 0; mask < 32; mask++) {
    const kept: number[] = []
    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) kept.push(full[i])
    }
    kept.sort((a, b) => a - b)
    const ev = evalState(kept, rollsRemaining, dreadful, hasHead)
    if (ev > bestEv) { bestEv = ev; bestKept = kept }
  }
  return bestKept
}

// ─── Ability distribution ────────────────────────────────────────────────────

// Returns probability distribution over ability names (values sum to 1.0),
// assuming optimal play from the given state.
function _abilityDist(
  kept: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): Record<string, number> {
  if (rollsRemaining === 0) {
    if (kept.length !== 5) throw new Error('Need 5 dice at rolls=0')
    return { [bestAbilityName(kept, dreadful, hasHead)]: 1.0 }
  }

  const key = cacheKey(kept, rollsRemaining, dreadful, hasHead)
  const cached = distMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = 5 - kept.length
  const prob = Math.pow(1 / 6, nReroll)
  const dist: Record<string, number> = {}

  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    const bestKept = _optimalKeep(full, rollsRemaining - 1, dreadful, hasHead)
    const sub = _abilityDist(bestKept, rollsRemaining - 1, dreadful, hasHead)
    for (const [name, p] of Object.entries(sub)) {
      dist[name] = (dist[name] ?? 0) + prob * p
    }
  }

  distMemo.set(key, dist)
  return dist
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function calculateOptimalKeep(
  dice: number[],
  rollsRemaining: number,
  dreadful: number,
  hasHead: boolean,
): SolverResult {
  const sorted = [...dice].sort((a, b) => a - b)
  const currentEv = bestAbilityValue(sorted, dreadful, hasHead)

  if (rollsRemaining === 0) {
    const dist = _abilityDist(sorted, 0, dreadful, hasHead)
    return {
      currentEv,
      topOptions: [{
        kept: sorted,
        ev: currentEv,
        probDist: _distToPercent(dist),
      }],
      abilities: buildAbilityBoard(sorted, dreadful, hasHead),
    }
  }

  // Enumerate all 32 unique subsets, compute EV + distribution for each
  const seenKeys = new Set<string>()
  const options: KeepOption[] = []

  for (let mask = 0; mask < 32; mask++) {
    const kept: number[] = []
    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) kept.push(sorted[i])
    }
    kept.sort((a, b) => a - b)
    const kKey = kept.join(',')
    if (seenKeys.has(kKey)) continue
    seenKeys.add(kKey)

    const ev = evalState(kept, rollsRemaining, dreadful, hasHead)
    const dist = _abilityDist(kept, rollsRemaining, dreadful, hasHead)
    options.push({ kept, ev, probDist: _distToPercent(dist) })
  }

  options.sort((a, b) => b.ev - a.ev)

  let topOptions = options.slice(0, 5)

  const currentAbility = bestAbilityName(sorted, dreadful, hasHead)
  if (currentAbility !== 'Whiff' && rollsRemaining > 0) {
    const keepAllKey = sorted.join(',')
    const existing = topOptions.find(o => o.kept.join(',') === keepAllKey)
    if (existing) {
      existing.isGuaranteed = true
    } else {
      const keepAllOpt = options.find(o => o.kept.join(',') === keepAllKey)!
      keepAllOpt.isGuaranteed = true
      topOptions = [...topOptions, keepAllOpt]
    }
  }

  return {
    currentEv,
    topOptions,
    abilities: buildAbilityBoard(sorted, dreadful, hasHead),
  }
}

function _distToPercent(dist: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [name, p] of Object.entries(dist)) {
    out[name] = Math.round(p * 10000) / 100  // two decimal places, as %
  }
  return out
}
