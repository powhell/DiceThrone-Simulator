// Prints FEATURE_COUNT — used by the Python orchestrator to size the network from the single
// source of truth (features.ts) instead of a duplicated constant that could drift.
import { FEATURE_COUNT } from './features.js'
console.log(FEATURE_COUNT)
