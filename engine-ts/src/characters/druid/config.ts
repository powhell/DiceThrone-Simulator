import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  drFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface DRState {
  form: 'druid' | 'cat' | 'bear'
  shapeShift: number
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
}

export const drConfig: CharacterConfig<DRState> = {
  id: 'dr',
  faceToSymbol(face) {
    return drFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const base = bestAbilityValue(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, base, state.wildcards,
      d => bestAbilityValue(d, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0))
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.form, state.shapeShift, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0)
    return `${state.form}|${Math.min(state.shapeShift, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
