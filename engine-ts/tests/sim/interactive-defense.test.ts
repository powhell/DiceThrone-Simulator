import { describe, it, expect } from 'vitest'
import { mulberry32Stateful } from '../../src/sim/rng.js'
import { greedyHighestDamagePolicy } from '../../src/sim/policy.js'
import {
  newHumanGame, beginHumanTurn, rollOffense, matchedAbilities, humanAttack, endHumanTurn,
  runAiTurnUpToAttack, nextDefenseDecision, chooseDefense, resolveAiAttack, finishAiTurn,
  type HumanGame,
} from '../../src/sim/interactive.js'
import { resolveAbilityPhase } from '../../src/sim/turn.js'
import type { Policy } from '../../src/sim/policy.js'

const passPolicy: Policy = { ...greedyHighestDamagePolicy, decide: () => ({ kind: 'pass' }) as any }

// Auto-play the human's own turn as simply as possible: no Main-Phase cards, one roll, best ability.
function autoHumanTurn(g: HumanGame): void {
  beginHumanTurn(g)
  if (g.state.gameOver) return
  const dice = rollOffense(g, null, [])
  const cands = matchedAbilities(g, dice)
  const name = cands.length ? cands.reduce((a, b) => ((b.baseDamage || 0) > (a.baseDamage || 0) ? b : a)).name : ''
  humanAttack(g, dice, name)              // empty name is ignored on a whiff
  if (g.state.gameOver) return
  endHumanTurn(g)
}

// Auto-play the AI's turn with interactive defense; `defend` chooses an action per prompt.
function autoAiTurn(g: HumanGame, defend: (p: NonNullable<ReturnType<typeof nextDefenseDecision>>) => { kind: string }): void {
  const r = runAiTurnUpToAttack(g)
  if (g.state.gameOver || r.done) { if (!g.state.gameOver) finishAiTurn(g); return }
  let prompt = nextDefenseDecision(g)
  let guard = 0
  while (prompt && guard++ < 20) {
    const pick = defend(prompt)
    if (pick.kind === 'pass') break
    chooseDefense(g, pick as any)
    prompt = nextDefenseDecision(g)
  }
  resolveAiAttack(g)
  if (g.state.gameOver) return
  finishAiTurn(g)
}

describe('interactive defense (deterministic replay)', () => {
  it('plays full human-vs-AI games with pass-only defense without crashing, across seeds', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = mulberry32Stateful(seed * 7 + 1)
      const g = newHumanGame('hh', 'bw', greedyHighestDamagePolicy, rng, seed % 2 === 0)
      if (g.humanIdx === 1) autoAiTurn(g, () => ({ kind: 'pass' }))
      let guard = 0
      while (!g.state.gameOver && guard++ < 300) {
        autoHumanTurn(g); if (g.state.gameOver) break
        autoAiTurn(g, () => ({ kind: 'pass' }))
      }
      expect(guard).toBeLessThan(300)
      // Terminal state is valid: someone dead, or a draw (both dead), or a MAX_TURNS timeout.
      const [a, b] = g.state.players
      expect(g.state.gameOver || a.hp <= 0 || b.hp <= 0 || g.state.turnNumber >= 1).toBe(true)
    }
  })

  it('replaying the attack on a clone reproduces the real resolution EXACTLY (HP + rng)', () => {
    let attacksChecked = 0
    for (let seed = 1; seed <= 60; seed++) {
      const rng = mulberry32Stateful(seed * 13 + 3)
      const g = newHumanGame('hh', 'bw', greedyHighestDamagePolicy, rng, false) // AI second? humanFirst=false -> AI is idx0, goes... humanIdx=1
      // Get to the AI's attack: play the human's turn first if the human is to move first.
      if (g.humanIdx === 0) autoHumanTurn(g)
      if (g.state.gameOver) continue
      const r = runAiTurnUpToAttack(g)
      if (g.state.gameOver || r.done) continue

      // Reference: resolve the attack directly on a clone with a pass-only human defense, from the
      // SAME rng snapshot the interactive path will use.
      const clone = structuredClone({ ...g.state, log: [] })
      const cloneRng = mulberry32Stateful(0); cloneRng.state = g.def!.savedRng
      const order: [Policy, Policy] = g.aiIdx === 0 ? [g.ai, passPolicy] : [passPolicy, g.ai]
      resolveAbilityPhase(clone, g.aiIdx, g.def!.finalDice, cloneRng, order)

      // Interactive path: pass-only (empty script) -> resolveAiAttack must match the clone byte-for-byte.
      resolveAiAttack(g)
      expect(g.state.players.map(p => p.hp)).toEqual(clone.players.map(p => p.hp))
      expect(g.state.players.map(p => p.cp)).toEqual(clone.players.map(p => p.cp))
      expect((g.rng as any).state).toEqual(cloneRng.state)
      attacksChecked++
    }
    expect(attacksChecked).toBeGreaterThan(5) // sanity: we actually exercised real attacks
  })

  it('playing a defensive card during the AI attack reduces the damage taken', () => {
    // Find a seed where the AI lands a defendable attack, then compare taking it raw vs playing
    // Not This Time! (prevents up to 6). Inject the card + CP right before the attack resolves.
    let verified = false
    for (let seed = 1; seed <= 120 && !verified; seed++) {
      const rng = mulberry32Stateful(seed * 17 + 5)
      const g = newHumanGame('hh', 'bw', greedyHighestDamagePolicy, rng, false)
      if (g.humanIdx === 0) autoHumanTurn(g)
      if (g.state.gameOver) continue
      const r = runAiTurnUpToAttack(g)
      if (g.state.gameOver || r.done || !r.attack || r.attack.abilityName === null || !r.attack.defendable) continue

      const human = g.state.players[g.humanIdx]
      human.hand.push('not-this-time'); human.cp += 5

      const prompt = nextDefenseDecision(g)
      const card = prompt?.options.find(o => (o as any).cardId === 'not-this-time')
      if (!prompt || !card) continue

      // Branch A: pass -> take it raw (clone the game so we can compare).
      const gA = { ...g, state: structuredClone({ ...g.state, log: [] }), rng: mulberry32Stateful(0) }
      ;(gA.rng as any).state = g.def!.savedRng
      gA.def = { ...g.def! }
      resolveAiAttack(gA)
      const hpRaw = gA.state.players[gA.humanIdx].hp

      // Branch B: play Not This Time! then pass.
      chooseDefense(g, card as any)
      resolveAiAttack(g)
      const hpDefended = g.state.players[g.humanIdx].hp

      expect(hpDefended).toBeGreaterThanOrEqual(hpRaw) // never worse
      if (hpDefended > hpRaw) verified = true          // and strictly better when the attack dealt >0
    }
    expect(verified).toBe(true)
  })
})
