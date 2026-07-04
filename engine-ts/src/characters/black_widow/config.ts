import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import {
  bwFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
  directDamageByName,
} from './abilities.js'

export interface BWState {
  upgrades: number
  tbOnOpp: number
  // ids of Hero Upgrade cards in play (self.upgradesInPlay) — needed to know WHICH upgrades
  // are active, not just how many, so alt-abilities (e.g. Grapple II -> Recon) can be gated
  // correctly. Optional/defaults to none for legacy callers.
  upgradeIds?: string[]
}

export const bwConfig: CharacterConfig<BWState> = {
  id: 'bw',
  faceToSymbol(face) {
    return bwFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    return bestAbilityValue(dice, state.upgrades, state.tbOnOpp, state.upgradeIds)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.upgrades, state.tbOnOpp, state.upgradeIds)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.upgrades, state.tbOnOpp, state.upgradeIds)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.upgrades, state.tbOnOpp, state.upgradeIds)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgradeIds = (state.upgradeIds ?? []).slice().sort().join(',')
    return `${state.upgrades}|${state.tbOnOpp}|${upgradeIds}`
  },
  directDamageByName(state) {
    return directDamageByName(state.upgrades, state.tbOnOpp, state.upgradeIds)
  },
}
