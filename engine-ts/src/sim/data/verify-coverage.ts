// Prints how much of each hero's template is still unverified — run this after filling in
// hero.json (by hand, or from an AI reading card scans) to see what's left.
// Run: npx tsx src/sim/data/verify-coverage.ts
import { hhHero, bwHero } from './load.js'
import { reportVerification } from './schema.js'

for (const hero of [hhHero, bwHero]) {
  const r = reportVerification(hero)
  console.log(`\n=== ${hero.name} (${hero.id}) ===`)
  console.log(`abilities: ${r.verifiedAbilities}/${r.totalAbilities} verified`)
  console.log(`cards:     ${r.verifiedCards}/${r.totalCards} verified`)
  if (r.unverifiedNames.length > 0) {
    console.log('unverified:')
    for (const n of r.unverifiedNames) console.log(`  - ${n}`)
  }
}
