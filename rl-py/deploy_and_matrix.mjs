// Chaîne de nuit : attendre la fin de l'entraînement v4b -> déployer best.json ->
// ai-weights.js -> matrice complète 10 héros (24 parties/paire). Détaché de Claude.
//   node rl-py/deploy_and_matrix.mjs
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const logf = path.join(root, 'rl-py/train_v4b.log')
const done = () => { try { return /FIN|round 165\/165/.test(fs.readFileSync(logf, 'utf8')) } catch (e) { return false } }
const trainerAlive = () => {
  try { return execSync('tasklist /FI "IMAGENAME eq python.exe" /FO CSV', { encoding: 'utf8' }).split('\n').length > 2 } catch (e) { return false }
}
console.log('attente de la fin de l entrainement…')
while (!done() && trainerAlive()) await new Promise(r => setTimeout(r, 60000))
console.log('entrainement termine — deploiement')

const W = JSON.parse(fs.readFileSync(path.join(root, 'rl-py/weights/best.json'), 'utf8'))
const tag = `${new Date().toISOString().slice(0, 10)}-v4-10heros`
const tail = fs.readFileSync(logf, 'utf8').trim().split('\n').slice(-3).join(' | ')
fs.writeFileSync(path.join(root, 'static/ai-weights.js'),
  `window.AI_WEIGHTS_VERSION = "${tag}";\n// GENERATED ${tag} — réseau v4 (FEATURE_COUNT ${W.sizes[0]}, les 10 héros dont Duelist/Sun Elf). ${tail.replace(/"/g, "'")}\nwindow.AI_WEIGHTS = ${JSON.stringify(W)};\n`)
console.log('ai-weights.js deploye (' + tag + ') — lancement matrice')
execSync(`node "${path.join(root, 'calibration/matrix10.mjs')}" --games 24 --out "${path.join(root, 'calibration/matrix10_v4.json')}"`,
  { stdio: ['ignore', fs.openSync(path.join(root, 'calibration/matrix10_v4.log'), 'w'), 'inherit'], cwd: root })
console.log('matrice terminee -> calibration/matrix10_v4.json')
