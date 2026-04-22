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
  // Map from ability short-name (as in bestAbilityName / probDist) to direct HP damage,
  // excluding TB / Agility / CP gains. Only the values that actually subtract from enemy
  // HP this turn. Optional : characters that don't need lethal-without-TB leave undefined
  // and consumers fall back to baseDamage.
  directDamageByName?(state: S): Record<string, number>
}
