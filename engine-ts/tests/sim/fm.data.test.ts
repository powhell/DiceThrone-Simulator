// Forgemaster data-layer integrity: the hero.json encoded from the user's scans
// (characters/forge_master/) is complete, verified, and matches the printed deck math.
import { describe, it, expect } from 'vitest'
import { fmHero, commonCards } from '../../src/sim/data/load.js'
import { reportVerification } from '../../src/sim/data/schema.js'

describe('Forgemaster data layer', () => {
  it('everything encoded is verified (photo-sourced)', () => {
    const r = reportVerification(fmHero)
    expect(r.unverifiedNames).toEqual([])
    expect(fmHero.defense?.verified).toBe(true)
    for (const a of fmHero.armors ?? []) expect(a.verified).toBe(true)
    for (const p of fmHero.passives ?? []) expect(p.verified).toBe(true)
  })

  it('deck math matches the printed components list (Hero Cards x34)', () => {
    // 16 Ore (9 Gold + 6 Diamond + 1 Ultimanium) + 18 printed commons = 34.
    // The engine encodes 17 commons (1 tournament-banned card deliberately excluded),
    // so the built deck is 33.
    const oreCount = fmHero.cards.reduce((a, c) => a + (c.count ?? 1), 0)
    expect(oreCount).toBe(16)
    const byId = Object.fromEntries(fmHero.cards.map(c => [c.id, c.count ?? 1]))
    expect(byId['gold-ore']).toBe(9)
    expect(byId['diamond-ore']).toBe(6)
    expect(byId['ultimanium-ore']).toBe(1)
    expect(oreCount + commonCards.cards.length).toBe(33)
  })

  it('ore cards are scrap-able and nothing else', () => {
    for (const c of fmHero.cards) {
      expect(c.kind).toBe('ore')
      expect(c.scrapOptions && c.scrapOptions.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('armor crafting chains are closed (blueprints reference real ore and real armors)', () => {
    const armorIds = new Set((fmHero.armors ?? []).map(a => a.id))
    const oreIds = new Set(fmHero.cards.map(c => c.id))
    expect(armorIds.size).toBe(6) // Gold/Diamond/Ultimanium x Helmet/Shield
    for (const a of fmHero.armors ?? []) {
      for (const oreId of Object.keys(a.blueprint.ore)) expect(oreIds.has(oreId)).toBe(true)
      if (a.tier === 1) expect(a.blueprint.requiresArmorId).toBeUndefined()
      else {
        expect(a.blueprint.requiresArmorId).toBeDefined()
        expect(armorIds.has(a.blueprint.requiresArmorId!)).toBe(true)
        // the prerequisite is the previous tier of the SAME slot
        const prev = (fmHero.armors ?? []).find(x => x.id === a.blueprint.requiresArmorId)!
        expect(prev.slot).toBe(a.slot)
        expect(prev.tier).toBe(a.tier - 1)
      }
    }
  })

  it('board abilities cover the full pattern space seen on the scans', () => {
    const names = fmHero.abilities.map(a => a.boardName)
    expect(names).toEqual([
      'Pick Axe 3A (AAA)', 'Pick Axe 4A (AAAA)', 'Pick Axe 5A (AAAAA)',
      'Furnace (BBBBB)', 'Smelting Time (CCCC)', 'A Good Haul (ABCC)',
      'Armored Up S (4-straight)', 'Armored Up L (5-straight)', 'Final Touches! (CCCCC)',
    ])
    // the ultimate is undefendable and tutors 1 ore
    const ult = fmHero.abilities.find(a => a.id === 'final_touches')!
    expect(ult.defendable).toBe(false)
    expect(ult.searchOreToForge).toBe(1)
  })
})
