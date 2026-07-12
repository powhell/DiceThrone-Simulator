// Fenêtre de manipulation des JETS BONUS (ruling user 2026-07-10) : Spider-Reflexes 2d6,
// rider Vengeance, Grim Pursuit (b). Sonde/rejeu déterministe côté humain ; no-op pour l'IA.
import { describe, it, expect } from 'vitest'
import { newHumanGame, beginHumanTurn, humanAttackProbe, humanAttackWithScript } from '../../src/sim/interactive.js'
import { bonusRollWindow } from '../../src/sim/turn.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import { mulberry32, mulberry32Stateful } from '../../src/sim/rng.js'
import { createInitialGameState } from '../../src/sim/match.js'

const SR_DICE = [2, 4, 5, 6, 1] // ABBC + reste : matche Spider-Reflexes

function freshGame(seed = 7) {
  const g = newHumanGame('sm', 'hh', greedyHighestDamagePolicy, mulberry32Stateful(seed), true)
  beginHumanTurn(g, undefined)
  const you = g.state.players[g.humanIdx]
  you.hand = ['six-it']
  you.cp = 3
  return g
}

describe('fenêtre des jets bonus', () => {
  it('sonde : Spider-Reflexes ouvre une fenêtre avec les 2 dés et les options de manipulation', () => {
    const g = freshGame()
    const prompt = humanAttackProbe(g, SR_DICE, 'Spider-Reflexes', [])
    expect(prompt).not.toBeNull()
    expect(prompt!.label).toBe('Spider-Reflexes')
    expect(prompt!.dice).toHaveLength(2)
    // Six-It! en main + CP -> au moins une option setDie sur un dé non-6
    const sixIt = prompt!.options.filter(o => o.kind === 'setDie' && (o as any).cardId === 'six-it')
    if (prompt!.dice.some(v => v !== 6)) expect(sixIt.length).toBeGreaterThan(0)
  })

  it('rejeu : le script Six-It! est appliqué et le jet réel reproduit la sonde', () => {
    const g = freshGame()
    const prompt = humanAttackProbe(g, SR_DICE, 'Spider-Reflexes', [])!
    const i = prompt.dice.findIndex(v => v !== 6)
    expect(i).toBeGreaterThanOrEqual(0)
    const action = { kind: 'setDie', cardId: 'six-it', sets: [{ dieIndex: i, value: 6 }] } as any
    // après l'action, plus de nouvelle fenêtre non scriptée ? (la même fenêtre re-sonde)
    const p2 = humanAttackProbe(g, SR_DICE, 'Spider-Reflexes', [action])
    if (p2) expect(p2.dice[i]).toBe(6) // la fenêtre re-présentée montre le dé changé
    humanAttackWithScript(g, SR_DICE, 'Spider-Reflexes', [action, { kind: 'pass' } as any])
    const altered = g.state.log.find(e => e.message.startsWith('Spider-Reflexes bonus roll altered'))
    expect(altered).toBeTruthy()
    const rolled = g.state.log.find(e => /^Spider-Reflexes: rolled \[/.test(e.message))!
    const vals = rolled.message.match(/\[(\d),(\d)\]/)!.slice(1, 3).map(Number)
    expect(vals[i]).toBe(6)
    // le dé NON modifié reproduit exactement la sonde (déterminisme du rejeu)
    expect(vals[1 - i]).toBe(prompt.dice[1 - i])
    // la carte est bien consommée
    expect(g.state.players[g.humanIdx].hand.includes('six-it')).toBe(false)
  })

  it('no-op pour une policy sans marqueur humain (IA/sim/RL inchangés)', () => {
    const state = createInitialGameState('sm', 'hh', mulberry32(3))
    const dice = [2, 5]
    const out = bonusRollWindow(state, 0, dice, 'Spider-Reflexes', mulberry32(4), greedyHighestDamagePolicy)
    expect(out).toEqual(dice)
    expect(state.pendingRoll ?? null).toBeNull()
  })
})
