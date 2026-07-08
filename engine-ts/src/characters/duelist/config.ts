import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  duFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'
import { CP_TO_DMG_EQUIV } from './constants.js'

export interface DUState {
  footwork: number // -2..+2 (0 = Neutral)
  guardBreak: number
  oppDisarmed: boolean
  bonusAvailable: boolean // le Bonus Footwork du tour n'est pas encore consommé
  defenseTax?: number
  upgradeIds?: string[]
  wildcards?: WildcardFlags
  // Quick Footwork en main (1 CP) : changer 1 dé en 4 ou 5 — même filet local que
  // He Is Worthy! chez Thor.
  quickFootwork?: boolean
}

export const duConfig: CharacterConfig<DUState> = {
  id: 'du',
  faceToSymbol(face) {
    return duFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const evalFn = (d: number[]) => bestAbilityValue(d, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0)
    let v = augmentTerminalValue(dice, evalFn(dice), state.wildcards, evalFn)
    if (state.quickFootwork) {
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
    return bestAbilityName(dice, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.footwork, state.guardBreak, state.oppDisarmed, state.bonusAvailable, state.upgradeIds, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    const w: any = state.wildcards || {}
    const wc = (w.sixIt ? 1 : 0) + (w.soWild ? 2 : 0) + (w.twiceAsWild ? 4 : 0) + (w.samesies ? 8 : 0) + (w.tipIt ? 16 : 0) + (state.quickFootwork ? 32 : 0)
    return `${state.footwork}|${Math.min(state.guardBreak, 2)}|${state.oppDisarmed ? 1 : 0}|${state.bonusAvailable ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}|${upgrades}`
  },
}
