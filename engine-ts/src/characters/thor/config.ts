import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, augmentTerminalName, type WildcardFlags } from '../../core/evaluator.js'
import {
  thFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'
import { CP_TO_DMG_EQUIV } from './constants.js'

export interface THState {
  mjolnirHome: boolean
  electrokinesis: number
  guardBreak?: number
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
  // He Is Worthy! en main (1 CP) : changer 1 dé en 4 ou 5 — filet local au perso
  heIsWorthy?: boolean
}

export const thConfig: CharacterConfig<THState> = {
  id: 'th',
  faceToSymbol(face) {
    return thFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0)
    let v = augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn)
    if (state.heIsWorthy) {
      // essaie chaque dé -> 4 ou 5, coût 1 CP
      for (let i = 0; i < dice.length; i++) {
        for (const f of [4, 5]) {
          if (dice[i] === f) continue
          const alt = dice.slice()
          alt[i] = f
          v = Math.max(v, evalFn(alt) - CP_TO_DMG_EQUIV)
        }
      }
    }
    return v
  },
  bestAbilityName(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0)
    const nameFn = (d: number[]) => bestAbilityName(d, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0)
    return augmentTerminalName(dice, state.wildcards, evalFn, nameFn)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.mjolnirHome, state.electrokinesis, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0) + (state.heIsWorthy ? 32 : 0)
    return `${state.mjolnirHome ? 1 : 0}|${Math.min(state.electrokinesis, 4)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
