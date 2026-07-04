import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import {
  hhFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface HHState {
  dreadful: number
  hasHead: boolean
  // ids of Hero Upgrade cards in play (self.upgradesInPlay) — needed to know WHICH upgrades
  // are active, not just how many, so alt-abilities (e.g. Cleave II -> Ghostly Charge) can be
  // gated correctly. Optional/defaults to none for legacy callers (static UI calculator).
  upgradeIds?: string[]
}

export const hhConfig: CharacterConfig<HHState> = {
  id: 'hh',
  faceToSymbol(face) {
    return hhFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    return bestAbilityValue(dice, state.dreadful, state.hasHead, state.upgradeIds)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.dreadful, state.hasHead, state.upgradeIds)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.dreadful, state.hasHead, state.upgradeIds)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.dreadful, state.hasHead, state.upgradeIds)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    return `${state.dreadful}|${state.hasHead ? 1 : 0}|${upgrades}`
  },
}
