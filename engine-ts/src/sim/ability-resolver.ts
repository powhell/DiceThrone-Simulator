// Reuses the real dice-pattern-matching logic from cfg.buildAbilityBoard() (which comes
// from the actual game rules — dice symbol/straight requirements) but returns EVERY matched
// ability instead of auto-picking one. Which matched ability to activate is a real strategic
// decision the Policy (scripted bot today, learned agent later) must make explicitly.
import { hhConfig, type HHState } from '../characters/horseman/config.js'
import { bwConfig, type BWState } from '../characters/black_widow/config.js'
import { fmConfig, type FMState } from '../characters/forgemaster/config.js'
import { rvConfig, type RVState } from '../characters/raveness/config.js'
import { drConfig, type DRState } from '../characters/druid/config.js'
import { thConfig, type THState } from '../characters/thor/config.js'
import { smConfig, type SMState } from '../characters/spiderman/config.js'
import { pyConfig, type PYState } from '../characters/pyromancer/config.js'
import { duConfig, type DUState } from '../characters/duelist/config.js'
import { seConfig, type SEState } from '../characters/sunelf/config.js'
import { heroTemplateFor, resolvedAbilityByBoardName } from './data/load.js'
import type { AbilityCandidate, HeroId } from './types.js'

// Le board COMPLET du solveur (matched + valeurs EV nettes, taxe de défense incluse) pour un
// jeu de dés donné — exposé au bundle navigateur pour le panneau « EV par habileté » de l'UI.
export function fullAbilityBoard(
  heroId: HeroId,
  dice: number[],
  oracleState: HHState | BWState | FMState | RVState | DRState | THState | SMState | PYState | DUState | SEState,
) {
  return heroId === 'hh'
    ? hhConfig.buildAbilityBoard(dice, oracleState as HHState)
    : heroId === 'fm'
      ? fmConfig.buildAbilityBoard(dice, oracleState as FMState)
      : heroId === 'rv'
        ? rvConfig.buildAbilityBoard(dice, oracleState as RVState)
        : heroId === 'dr'
          ? drConfig.buildAbilityBoard(dice, oracleState as DRState)
          : heroId === 'th'
            ? thConfig.buildAbilityBoard(dice, oracleState as THState)
            : heroId === 'sm'
              ? smConfig.buildAbilityBoard(dice, oracleState as SMState)
              : heroId === 'py'
                ? pyConfig.buildAbilityBoard(dice, oracleState as PYState)
                : heroId === 'du'
                  ? duConfig.buildAbilityBoard(dice, oracleState as DUState)
                  : heroId === 'se'
                    ? seConfig.buildAbilityBoard(dice, oracleState as SEState)
                    : bwConfig.buildAbilityBoard(dice, oracleState as BWState)
}

export function resolveMatchedAbilities(
  heroId: HeroId,
  dice: number[],
  oracleState: HHState | BWState | FMState | RVState | DRState | THState | SMState | PYState | DUState | SEState,
): AbilityCandidate[] {
  const template = heroTemplateFor(heroId)
  const upgradeIds = oracleState.upgradeIds ?? []
  const board = fullAbilityBoard(heroId, dice, oracleState)

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
