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

function cacheKey<S>(cfg: CharacterConfig<S>, kept: number[], rollsRemaining: number, state: S, totalDice: number): string {
  return `${cfg.id}|${totalDice}|${kept.join(',')}|${rollsRemaining}|${cfg.stateKey(state)}`
}

export function clearCache(): void {
  evMemo.clear()
  distMemo.clear()
}

// totalDice : 5 normalement — 4 quand Naraxus a volé un dé (Hoarding), le solveur reste exact.
// Cartes de conversion en main (user-caught : "si j'ai 666 j'ai de quoi backer") :
// au JET FINAL, Six-It!/So Wild! peuvent corriger un de — la valeur terminale d'une main
// est donc max(main, meilleure variante - cout CP). Les flags viennent de l'etat du hero.
export interface WildcardFlags { sixIt?: boolean; soWild?: boolean; twiceAsWild?: boolean; samesies?: boolean; tipIt?: boolean }

function hasAnyWildcard(flags: WildcardFlags | undefined): flags is WildcardFlags {
  return !!flags && !!(flags.sixIt || flags.soWild || flags.twiceAsWild || flags.samesies || flags.tipIt)
}

// SOURCE UNIQUE de la logique des cartes de manipulation : énumère les mains converties
// possibles (dé(s) modifié(s)) + leur coût CP. La valeur (augmentTerminalValue) ET le nom
// (augmentTerminalName) consomment ce même générateur pour rester parfaitement synchrones —
// sinon la distribution du coach pointe une habileté différente de son EV (bug user 2026-07-09).
function* wildcardVariants(dice: number[], flags: WildcardFlags): Generator<{ dice: number[]; cost: number }> {
  const counts = new Map<number, number>()
  for (const v of dice) counts.set(v, (counts.get(v) ?? 0) + 1)
  let mode = dice[0]
  for (const [v, n] of counts) if (n > (counts.get(mode) ?? 0)) mode = v
  const single = (i: number, v: number, cost: number): { dice: number[]; cost: number } | null => {
    if (dice[i] === v) return null
    const d2 = dice.slice(); d2[i] = v; d2.sort((a, b) => a - b)
    return { dice: d2, cost }
  }
  for (let i = 0; i < dice.length; i++) {
    if (flags.sixIt) { const r = single(i, 6, 1); if (r) yield r }              // Six-It! : de -> 6, 1 CP
    if (flags.soWild) { for (const v of [6, mode]) { const r = single(i, v, 2); if (r) yield r } } // So Wild! ~= ->6 ou ->majorite, 2 CP
    if (flags.tipIt) {                                                          // Tip It! : ±1, 1 CP
      if (dice[i] < 6) { const r = single(i, dice[i] + 1, 1); if (r) yield r }
      if (dice[i] > 1) { const r = single(i, dice[i] - 1, 1); if (r) yield r }
    }
    if (flags.samesies) {                                                       // Samesies! : copie un autre de, 1 CP
      for (const v of counts.keys()) { const r = single(i, v, 1); if (r) yield r }
    }
  }
  // Twice As Wild! : DEUX des -> meme valeur (3 CP) — le plus gros filet ([6,6,6]+TAW = Ultimate).
  if (flags.twiceAsWild) {
    for (let i = 0; i < dice.length; i++) for (let j = i + 1; j < dice.length; j++) {
      for (const v of [6, mode]) {
        if (dice[i] === v && dice[j] === v) continue
        const d2 = dice.slice(); d2[i] = v; d2[j] = v; d2.sort((a, b) => a - b)
        yield { dice: d2, cost: 3 }
      }
    }
  }
}

export function augmentTerminalValue(
  dice: number[],
  base: number,
  flags: WildcardFlags | undefined,
  evalDice: (d: number[]) => number,
  cpToDmg = 0.75,
): number {
  if (!hasAnyWildcard(flags)) return base
  let best = base
  for (const { dice: d2, cost } of wildcardVariants(dice, flags)) {
    const val = evalDice(d2) - cost * cpToDmg
    if (val > best) best = val
  }
  return best
}

// Nom de l'habileté que le solveur « avec cartes » vise VRAIMENT : le meilleur variant converti
// (net du coût CP) ou la main brute si aucune carte n'améliore. Sert à la distribution du coach —
// sans ça l'EV pointe (p.ex.) Chain Lightning mais la distribution ne liste que les dés bruts.
// N'affecte QUE l'affichage (cfg.bestAbilityName n'est lu que pour probDist), jamais le pilotage.
export function augmentTerminalName(
  dice: number[],
  flags: WildcardFlags | undefined,
  evalDice: (d: number[]) => number,
  nameDice: (d: number[]) => string,
  cpToDmg = 0.75,
): string {
  const baseName = nameDice(dice)
  if (!hasAnyWildcard(flags)) return baseName
  let best = evalDice(dice)
  let bestName = baseName
  for (const { dice: d2, cost } of wildcardVariants(dice, flags)) {
    const val = evalDice(d2) - cost * cpToDmg
    if (val > best) { best = val; bestName = nameDice(d2) }
  }
  return bestName
}

export function evalState<S>(
  cfg: CharacterConfig<S>,
  kept: number[],
  rollsRemaining: number,
  state: S,
  totalDice = 5,
): number {
  if (rollsRemaining === 0) {
    if (kept.length !== totalDice) throw new Error(`evalState: need ${totalDice} dice at rolls=0, got ${kept.length}`)
    return cfg.bestAbilityValue(kept, state)
  }

  const key = cacheKey(cfg, kept, rollsRemaining, state, totalDice)
  const cached = evMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = totalDice - kept.length
  const prob = Math.pow(1 / 6, nReroll)

  let totalEv = 0.0
  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    totalEv += prob * _bestKeepEv(cfg, full, rollsRemaining - 1, state, totalDice)
  }

  evMemo.set(key, totalEv)
  return totalEv
}

function _bestKeepEv<S>(
  cfg: CharacterConfig<S>,
  full: number[],
  rollsRemaining: number,
  state: S,
  totalDice = 5,
): number {
  if (rollsRemaining === 0) return evalState(cfg, full, 0, state, totalDice)

  let best = -Infinity
  const n = full.length
  for (let mask = 0; mask < (1 << n); mask++) {
    const kept: number[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) kept.push(full[i])
    }
    kept.sort((a, b) => a - b)
    const ev = evalState(cfg, kept, rollsRemaining, state, totalDice)
    if (ev > best) best = ev
  }
  return best
}

function _optimalKeep<S>(
  cfg: CharacterConfig<S>,
  full: number[],
  rollsRemaining: number,
  state: S,
  totalDice = 5,
): number[] {
  if (rollsRemaining === 0) return full

  let bestEv = -Infinity
  let bestKept: number[] = full
  const n = full.length
  for (let mask = 0; mask < (1 << n); mask++) {
    const kept: number[] = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) kept.push(full[i])
    }
    kept.sort((a, b) => a - b)
    const ev = evalState(cfg, kept, rollsRemaining, state, totalDice)
    if (ev > bestEv) { bestEv = ev; bestKept = kept }
  }
  return bestKept
}

function _abilityDist<S>(
  cfg: CharacterConfig<S>,
  kept: number[],
  rollsRemaining: number,
  state: S,
  totalDice = 5,
): Record<string, number> {
  if (rollsRemaining === 0) {
    if (kept.length !== totalDice) throw new Error(`Need ${totalDice} dice at rolls=0`)
    return { [cfg.bestAbilityName(kept, state)]: 1.0 }
  }

  const key = cacheKey(cfg, kept, rollsRemaining, state, totalDice)
  const cached = distMemo.get(key)
  if (cached !== undefined) return cached

  const nReroll = totalDice - kept.length
  const prob = Math.pow(1 / 6, nReroll)
  const dist: Record<string, number> = {}

  for (const outcome of enumerateOutcomes(nReroll)) {
    const full = [...kept, ...outcome].sort((a, b) => a - b)
    const bestKept = _optimalKeep(cfg, full, rollsRemaining - 1, state, totalDice)
    const sub = _abilityDist(cfg, bestKept, rollsRemaining - 1, state, totalDice)
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
  const totalDice = dice.length // 4 quand Naraxus a vole un de (Hoarding) — solveur exact quand meme
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
    const dist = _abilityDist(cfg, sorted, 0, state, totalDice)
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

  for (let mask = 0; mask < (1 << totalDice); mask++) {
    const kept: number[] = []
    for (let i = 0; i < totalDice; i++) {
      if (mask & (1 << i)) kept.push(sorted[i])
    }
    kept.sort((a, b) => a - b)
    const kKey = kept.join(',')
    if (seenKeys.has(kKey)) continue
    seenKeys.add(kKey)

    const ev = evalState(cfg, kept, rollsRemaining, state, totalDice)
    const dist = _abilityDist(cfg, kept, rollsRemaining, state, totalDice)
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
