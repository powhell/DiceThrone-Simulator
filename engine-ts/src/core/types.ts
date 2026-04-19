export type Symbol = string

export interface AbilityEntry {
  name: string
  value: number
  baseDamage: number
  matched: boolean
}

export interface CharacterConfig<S> {
  id: string
  faceToSymbol(face: number): Symbol
  bestAbilityValue(dice: number[], state: S): number
  bestAbilityName(dice: number[], state: S): string
  buildAbilityBoard(dice: number[], state: S): AbilityEntry[]
  hasMatchedAbility(dice: number[], state: S): boolean
  stateKey(state: S): string
}
