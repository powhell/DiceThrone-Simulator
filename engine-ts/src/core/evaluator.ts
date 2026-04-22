import type { CharacterConfig, AbilityEntry } from './types.js'
import { enumerateOutcomes } from './dice.js'

export interface KeepOption {
  kept: number[]
  ev: number
  probDist: Record<string, number>
  isGuaranteed?: boolean
  // Max direct HP damage across outcomes with non-zero probability, excluding TB/Agility/CP
  // EV. Present only when the config exposes `directDamageByName`. Used by UI for lethal
  // detection — EV includes non-damage gains so can't be compared directly to enemy HP.
  directDamage?: number
}

export interface SolverResult {
  currentEv: number
  topOptions: KeepOption[]
  abilities: AbilityEntry[]
}

const evMemo = new Map<string, number>()
const distMemo = new Map<string, Record<string, number>>()

function cacheKey<S>(cfg: CharacterConfig<S>, kept: number[], rollsRemaining: number, state: S): string {
  return `${cfg.id}|${kept.join(',')}|${rollsRemaining}|${cfg.stateKey(state)}`
}

export function clearCache(): void {
  evMemo.clear()
  distMemo.clear()
}

export function evalState<S>(
  cfg: CharacterConfig<S>,
  kept: number[],
  rollsRemaining: number,
  state: S,
): number {
  if (rollsRemaining === 0) {
    if (kept.length !== 5) throw new Error(`evalState: need 5 dice at rolls=0, got ${kept.length}`)
    return cfg.bestAbilityValue(kept, state)
  }

  const key = cacheKey(cfg, kept, rollsRemaining, state)
  const cached = evMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = 5 - kept.length
  const prob = Math.pow(1 / 6, nReroll)

  let totalEv = 0.0
  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    totalEv += prob * _bestKeepEv(cfg, full, rollsRemaining - 1, state)
  }

  evMemo.set(key, totalEv)
  return totalEv
}

function _bestKeepEv<S>(
  cfg: CharacterConfig<S>,
  full: number[],
  rollsRemaining: number,
  state: S,
): number {
  if (rollsRemaining === 0) return evalState(cfg, full, 0, state)

  let best = -Infinity
  for (let mask = 0; mask < 32; mask++) {
    const kept: number[] = []
    for (let i = 0; i < 5; i++) {
      if (mask & (1 << i)) kept.push(full[i])
    }
    kept.sort((a, b) => a - b)
    const ev = evalState(cfg, kept, rollsRemaining, state)
    if (ev > best) best = ev
  }
  return best
}

function _optimalKeep<S>(
  cfg: CharacterConfig<S>,
  full: number[],
  rollsRemaining: number,
  state: S,
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
    const ev = evalState(cfg, kept, rollsRemaining, state)
    if (ev > bestEv) { bestEv = ev; bestKept = kept }
  }
  return bestKept
}

function _abilityDist<S>(
  cfg: CharacterConfig<S>,
  kept: number[],
  rollsRemaining: number,
  state: S,
): Record<string, number> {
  if (rollsRemaining === 0) {
    if (kept.length !== 5) throw new Error('Need 5 dice at rolls=0')
    return { [cfg.bestAbilityName(kept, state)]: 1.0 }
  }

  const key = cacheKey(cfg, kept, rollsRemaining, state)
  const cached = distMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = 5 - kept.length
  const prob = Math.pow(1 / 6, nReroll)
  const dist: Record<string, number> = {}

  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    const bestKept = _optimalKeep(cfg, full, rollsRemaining - 1, state)
    const sub = _abilityDist(cfg, bestKept, rollsRemaining - 1, state)
    for (const [name, p] of Object.entries(sub)) {
      dist[name] = (dist[name] ?? 0) + prob * p
    }
  }

  distMemo.set(key, dist)
  return dist
}

export function calculateOptimalKeep<S>(
  cfg: CharacterConfig<S>,
  dice: number[],
  rollsRemaining: number,
  state: S,
): SolverResult {
  const sorted = [...dice].sort((a, b) => a - b)
  const currentEv = cfg.bestAbilityValue(sorted, state)
  const directMap = cfg.directDamageByName?.(state) ?? null

  const annotateDirect = (opt: KeepOption): KeepOption => {
    if (!directMap) return opt
    let max = 0
    for (const [name, p] of Object.entries(opt.probDist)) {
      if (p <= 0) continue
      const d = directMap[name] ?? 0
      if (d > max) max = d
    }
    opt.directDamage = max
    return opt
  }

  if (rollsRemaining === 0) {
    const dist = _abilityDist(cfg, sorted, 0, state)
    return {
      currentEv,
      topOptions: [annotateDirect({
        kept: sorted,
        ev: currentEv,
        probDist: _distToPercent(dist),
      })],
      abilities: cfg.buildAbilityBoard(sorted, state),
    }
  }

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

    const ev = evalState(cfg, kept, rollsRemaining, state)
    const dist = _abilityDist(cfg, kept, rollsRemaining, state)
    options.push(annotateDirect({ kept, ev, probDist: _distToPercent(dist) }))
  }

  options.sort((a, b) => b.ev - a.ev)

  let topOptions = options.slice(0, 5)

  if (cfg.hasMatchedAbility(sorted, state) && rollsRemaining > 0) {
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
    abilities: cfg.buildAbilityBoard(sorted, state),
  }
}

function _distToPercent(dist: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [name, p] of Object.entries(dist)) {
    out[name] = Math.round(p * 10000) / 100
  }
  return out
}
