import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
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
    return bestAbilityValue(dice, state.armorCount, state.defenseTax ?? 0)
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
    return `${Math.min(state.armorCount, 2)}|${Math.round((state.defenseTax ?? 0) * 2)}`
  },
}
