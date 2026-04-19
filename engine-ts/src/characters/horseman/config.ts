import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import {
  hhFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface HHState {
  dreadful: number
  hasHead: boolean
}

export const hhConfig: CharacterConfig<HHState> = {
  id: 'hh',
  faceToSymbol(face) {
    return hhFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    return bestAbilityValue(dice, state.dreadful, state.hasHead)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.dreadful, state.hasHead)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.dreadful, state.hasHead)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.dreadful, state.hasHead)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    return `${state.dreadful}|${state.hasHead ? 1 : 0}`
  },
}
