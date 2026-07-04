// Parity gate between the PyTorch trainer and the TS inference runtime. Reads a bundle written
// by rl-py/train.py's `parity` mode ({net, inputs, expected}) and verifies that network.ts's
// forward() reproduces torch's outputs on the same weights and inputs. Any real mismatch means
// the two implementations' architecture contract drifted (activation, layout, ...) — training
// would then optimize a different function than the one the game actually plays. The
// orchestrator runs this before every training session and aborts on failure.
//
// Run: npx tsx src/sim/rl/checkParity.ts <bundle.json> [tolerance=1e-5]
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fromJSON, forward } from './network.js'

const [bundlePath, tolArg] = process.argv.slice(2)
if (!bundlePath) {
  console.error('usage: checkParity.ts <bundle.json> [tolerance]')
  process.exit(1)
}
const tol = Number(tolArg ?? 1e-5)
const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf-8')) as {
  net: string
  inputs: number[][]
  expected: number[]
}
// bundle.net may be relative to wherever train.py ran — fall back to "next to the bundle".
const netPath = fs.existsSync(bundle.net)
  ? bundle.net
  : path.join(path.dirname(bundlePath), path.basename(bundle.net))
const net = fromJSON(fs.readFileSync(netPath, 'utf-8'))
const got = forward(net, bundle.inputs)

let worst = 0
for (let i = 0; i < got.length; i++) {
  worst = Math.max(worst, Math.abs(got[i] - bundle.expected[i]))
}
if (worst > tol) {
  console.error(`PARITY FAIL: worst |ts - torch| = ${worst} > ${tol}`)
  process.exit(1)
}
console.log(`PARITY OK: ${got.length} vectors, worst diff ${worst.toExponential(2)} <= ${tol}`)
