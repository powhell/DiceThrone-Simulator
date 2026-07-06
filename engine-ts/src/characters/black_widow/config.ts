import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  bwFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
  directDamageByName,
} from './abilities.js'

export interface BWState {
  defenseTax?: number // voir HHState.defenseTax
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
    const base = bestAbilityValue(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, base, (state as any).wildcards as WildcardFlags,
      d => bestAbilityValue(d, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0))
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.upgrades, state.tbOnOpp, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgradeIds = (state.upgradeIds ?? []).slice().sort().join(',')
    const _w: any = (state as any).wildcards || {}
    const wc = (_w.sixIt?1:0)+(_w.soWild?2:0)+(_w.twiceAsWild?4:0)+(_w.samesies?8:0)+(_w.tipIt?16:0)
    return `${state.upgrades}|${state.tbOnOpp}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgradeIds}`
  },
  directDamageByName(state) {
    return directDamageByName(state.upgrades, state.tbOnOpp, state.upgradeIds)
  },
}
