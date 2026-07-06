import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  fmFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

// État solveur du Forgemaster : seul le NOMBRE d'armures portées change la valeur des dés
// (Armored Up: +2 si 2 Armor). Le contenu de la Forge influe sur le craft, pas sur la garde.
// upgradeIds gardé pour l'interface commune (fm n'a aucune carte upgrade — toujours vide).
export interface FMState {
  defenseTax?: number // voir HHState.defenseTax
  armorCount: number
  upgradeIds?: string[]
}

export const fmConfig: CharacterConfig<FMState> = {
  id: 'fm',
  faceToSymbol(face) {
    return fmFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const base = bestAbilityValue(dice, state.armorCount, state.defenseTax ?? 0)
    return augmentTerminalValue(dice, base, (state as any).wildcards as WildcardFlags,
      d => bestAbilityValue(d, state.armorCount, state.defenseTax ?? 0))
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.armorCount, state.defenseTax ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.armorCount, state.defenseTax ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.armorCount, state.defenseTax ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const wc = ((state as any).wildcards?.sixIt ? 1 : 0) + ((state as any).wildcards?.soWild ? 2 : 0)
    return `${Math.min(state.armorCount, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}|${wc}`
  },
}
