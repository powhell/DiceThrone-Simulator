import type { CharacterConfig, AbilityEntry } from '../../core/types.js'
import { augmentTerminalValue, type WildcardFlags } from '../../core/evaluator.js'
import {
  hhFaceToSymbol, bestAbilityValue, bestAbilityName, buildAbilityBoard, getCandidates,
} from './abilities.js'

export interface HHState {
  dreadful: number
  hasHead: boolean
  // Perte moyenne d'une attaque DÉFENDABLE contre l'adversaire actuel (prévention attendue +
  // contre-dégâts attendus de sa défense). Soustraite des candidates défendables seulement —
  // c'est la prime "indéfendable" (user-caught : Reap/Horrify n'étaient pas créditées d'esquiver
  // la défense). Calculée par oracleStateFor depuis l'état réel de l'adversaire ; défaut 0.
  defenseTax?: number
  // ids of Hero Upgrade cards in play (self.upgradesInPlay) — needed to know WHICH upgrades
  // are active, not just how many, so alt-abilities (e.g. Cleave II -> Ghostly Charge) can be
  // gated correctly. Optional/defaults to none for legacy callers (static UI calculator).
  upgradeIds?: string[]
  // Stock actuel de Grim Pursuit (cap 3) : les gains au-delà du cap ne valent rien
  // (user-caught : Ride Down surévalué à cap plein). Défaut 0 (anciens appels).
  grimPursuit?: number
  // Cartes de conversion en main (payables) : filet de securite au jet final.
  wildcards?: WildcardFlags
}

export const hhConfig: CharacterConfig<HHState> = {
  id: 'hh',
  faceToSymbol(face) {
    return hhFaceToSymbol(face)
  },
  bestAbilityValue(dice, state) {
    const base = bestAbilityValue(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0)
    return augmentTerminalValue(dice, base, state.wildcards,
      d => bestAbilityValue(d, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0))
  },
  bestAbilityName(dice, state) {
    return bestAbilityName(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0)
  },
  buildAbilityBoard(dice, state): AbilityEntry[] {
    return buildAbilityBoard(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0)
  },
  hasMatchedAbility(dice, state) {
    const cands = getCandidates(dice, state.dreadful, state.hasHead, state.upgradeIds, state.defenseTax ?? 0, state.grimPursuit ?? 0)
    return cands.some(([name]) => name !== 'Whiff')
  },
  stateKey(state) {
    const upgrades = (state.upgradeIds ?? []).slice().sort().join(',')
    // tax arrondie au 1/2 pour garder le cache DP compact
    const _w: any = state.wildcards || {}
    const wc = (_w.sixIt?1:0)+(_w.soWild?2:0)+(_w.twiceAsWild?4:0)+(_w.samesies?8:0)+(_w.tipIt?16:0)
    return `${state.dreadful}|${state.hasHead ? 1 : 0}|${Math.round((state.defenseTax ?? 0) * 2)}|${Math.min(state.grimPursuit ?? 0, 3)}|${wc}|${upgrades}`
  },
}
