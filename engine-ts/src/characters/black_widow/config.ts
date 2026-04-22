import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import {
  bwFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
  directDamageByName,
} from './abilities.js'

export interface BWState {
  upgrades: number
  tbOnOpp: number
}

export const bwConfig: CharacterConfig<BWState> = {
  id: 'bw',
  faceToSymbol(face) {
    return bwFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    return bestAbilityValue(dice, state.upgrades, state.tbOnOpp)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.upgrades, state.tbOnOpp)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.upgrades, state.tbOnOpp)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.upgrades, state.tbOnOpp)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    return `${state.upgrades}|${state.tbOnOpp}`
  },
  directDamageByName(state) {
    return directDamageByName(state.upgrades, state.tbOnOpp)
  },
}
