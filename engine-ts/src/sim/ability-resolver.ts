// Reuses the real dice-pattern-matching logic from cfg.buildAbilityBoard() (which comes
// from the actual game rules — dice symbol/straight requirements) but returns EVERY matched
// ability instead of auto-picking one. Which matched ability to activate is a real strategic
// decision the Policy (scripted bot today, learned agent later) must make explicitly.
import { hhConfig, type HHState } from '../characters/horseman/config.js'
import { bwConfig, type BWState } from '../characters/black_widow/config.js'
import { fmConfig, type FMState } from '../characters/forgemaster/config.js'
import { heroTemplateFor, resolvedAbilityByBoardName } from './data/load.js'
import type { AbilityCandidate, HeroId } from './types.js'

export function resolveMatchedAbilities(
  heroId: HeroId,
  dice: number[],
  oracleState: HHState | BWState | FMState,
): AbilityCandidate[] {
  const template = heroTemplateFor(heroId)
  const upgradeIds = oracleState.upgradeIds ?? []
  const board = heroId === 'hh'
    ? hhConfig.buildAbilityBoard(dice, oracleState as HHState)
    : heroId === 'fm'
      ? fmConfig.buildAbilityBoard(dice, oracleState as FMState)
      : bwConfig.buildAbilityBoard(dice, oracleState as BWState)

  return board
    .filter(e => e.matched && e.name !== 'Whiff')
    .map(e => {
      const data = resolvedAbilityByBoardName(template, e.name, upgradeIds)
      return {
        name: e.name,
        baseDamage: data?.baseDamage ?? e.baseDamage,
        defendable: data?.defendable ?? true,
      }
    })
}
