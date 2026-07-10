// Parité TS <-> PyTorch du réseau 2 TÊTES (contrat v2). Même rôle que checkParity.ts pour le
// v1 : les mêmes entrées passées dans torch (bundle de train.py parity2) et dans forward2()
// doivent coïncider à ~1e-5 — sinon le contrat a dérivé et TOUT l'entraînement est invalide.
// Usage : npx tsx src/sim/rl/checkParity2.ts <net2.json> <bundle.json>
import * as fs from 'node:fs'
import { fromJSON2, forward2 } from './network.js'

const [netPath, bundlePath] = process.argv.slice(2)
if (!netPath || !bundlePath) { console.error('usage: checkParity2.ts <net2.json> <bundle.json>'); process.exit(1) }

const net = fromJSON2(fs.readFileSync(netPath, 'utf-8'))
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8')) as {
  inputs: number[][]; values: number[]; logits: number[][]
}

let maxErr = 0
for (let i = 0; i < bundle.inputs.length; i++) {
  const { value, logits } = forward2(net, bundle.inputs[i])
  maxErr = Math.max(maxErr, Math.abs(value - bundle.values[i]))
  for (let j = 0; j < logits.length; j++) {
    maxErr = Math.max(maxErr, Math.abs(logits[j] - bundle.logits[i][j]))
  }
}
const ok = maxErr < 1e-5
console.log(`PARITY2 ${JSON.stringify({ vectors: bundle.inputs.length, maxErr, ok })}`)
process.exit(ok ? 0 : 1)
