import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, augmentTerminalName, type WildcardFlags } from '../../core/evaluator.js'
import {
  pyFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface PYState {
  fireMastery: number
  fmCap: number // 5 + bonus permanent (Fire Up!/Blazing Soul/Burning Soul II)
  oppBurned: boolean
  oppKnocked: boolean
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
}

export const pyConfig: CharacterConfig<PYState> = {
  id: 'py',
  faceToSymbol(face) {
    return pyFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn)
  },
  bestAbilityName(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0)
    const nameFn = (d: number[]) => bestAbilityName(d, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalName(dice, state.wildcards, evalFn, nameFn)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.fireMastery, state.fmCap, state.oppBurned, state.oppKnocked, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0)
    return `${Math.min(state.fireMastery, state.fmCap)}|${state.fmCap}|${state.oppBurned ? 1 : 0}${state.oppKnocked ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
