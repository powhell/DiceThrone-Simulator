// Chaîne de nuit v2 : après la passe 1 de la matrice, enchaîner des passes SUPPLÉMENTAIRES
// (seeds neufs) jusqu'à ~6 h 15 du matin — chaque passe resserre les marges d'erreur.
//   node calibration/night_chain.mjs   (détaché)
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const pass1 = path.join(root, 'calibration/matrix10_v4.json')
console.log('attente de la fin de la passe 1…')
while (!fs.existsSync(pass1)) await new Promise(r => setTimeout(r, 120000))

let pass = 2
while (new Date().getHours() >= 22 || new Date().getHours() < 6) {
  const out = path.join(root, `calibration/matrix10_v4_pass${pass}.json`)
  console.log(`passe ${pass} (seed-base ${pass * 1000}) — ${new Date().toLocaleTimeString()}`)
  execSync(`node "${path.join(root, 'calibration/matrix10.mjs')}" --games 24 --seed-base ${pass * 1000} --out "${out}"`,
    { stdio: ['ignore', fs.openSync(path.join(root, `calibration/matrix10_v4_pass${pass}.log`), 'w'), 'inherit'], cwd: root })
  pass += 1
  if (pass > 5) break // 5 passes x 24 = 120 parties/paire, largement assez
}
console.log('chaîne de nuit terminée —', pass - 1, 'passes au total')
