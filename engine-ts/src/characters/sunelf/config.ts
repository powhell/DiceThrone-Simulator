import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, augmentTerminalName, type WildcardFlags } from '../../core/evaluator.js'
import {
  seFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface SEState {
  sunDial: number // 0-5
  dawn: boolean
  gemHeld: boolean
  oppMarked: boolean
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
}

export const seConfig: CharacterConfig<SEState> = {
  id: 'se',
  faceToSymbol(face) {
    return seFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn)
  },
  bestAbilityName(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0)
    const nameFn = (d: number[]) => bestAbilityName(d, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalName(dice, state.wildcards, evalFn, nameFn)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.sunDial, state.dawn, state.gemHeld, state.oppMarked, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0)
    return `${state.sunDial}|${state.dawn ? 1 : 0}|${state.gemHeld ? 1 : 0}|${state.oppMarked ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
