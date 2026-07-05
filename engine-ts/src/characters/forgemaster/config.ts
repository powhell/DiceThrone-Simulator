import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import {
  fmFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

// État solveur du Forgemaster : seul le NOMBRE d'armures portées change la valeur des dés
// (Armored Up: +2 si 2 Armor). Le contenu de la Forge influe sur le craft, pas sur la garde.
// upgradeIds gardé pour l'interface commune (fm n'a aucune carte upgrade — toujours vide).
export interface FMState {
  armorCount: number
  upgradeIds?: string[]
}

export const fmConfig: CharacterConfig<FMState> = {
  id: 'fm',
  faceToSymbol(face) {
    return fmFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    return bestAbilityValue(dice, state.armorCount)
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.armorCount)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.armorCount)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.armorCount)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    return `${Math.min(state.armorCount, 2)}` // au-delà de 2, plus aucun effet sur l'EV
  },
}
