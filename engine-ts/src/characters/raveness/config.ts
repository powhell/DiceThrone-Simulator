import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  rvFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface RVState {
  feathers: number             // stock actuel (cap 5) — les gains au-delà ne valent rien
  nevermoreOnOpponent: boolean // Absorb dispo -> activation légèrement plus chère
  hexed: boolean               // Hex sur SOI : les 6 sont des faces blanches
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
}

export const rvConfig: CharacterConfig<RVState> = {
  id: 'rv',
  faceToSymbol(face) {
    return rvFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const base = bestAbilityValue(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, base, state.wildcards,
      d => bestAbilityValue(d, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0))
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.feathers, state.nevermoreOnOpponent, state.hexed, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0)
    return `${Math.min(state.feathers, 6)}|${state.nevermoreOnOpponent ? 1 : 0}|${state.hexed ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
