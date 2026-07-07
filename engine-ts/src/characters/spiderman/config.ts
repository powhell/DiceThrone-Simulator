import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  smFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface SMState {
  comboHeld: boolean
  invisHeld: boolean
  oppWebbed: boolean
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
}

export const smConfig: CharacterConfig<SMState> = {
  id: 'sm',
  faceToSymbol(face) {
    return smFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.comboHeld, state.invisHeld, state.oppWebbed, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0)
    return `${state.comboHeld ? 1 : 0}${state.invisHeld ? 1 : 0}${state.oppWebbed ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
