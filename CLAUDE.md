# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Build the browser engine:**
```bash
cd engine-ts && npm run build
# Outputs static/engine.js
```

**Open the UI:** Open `static/index.html` directly in a browser (no server required).

**Run TS tests:**
```bash
cd engine-ts && npm test
```

**Run Python tests (engine intact):**
```bash
python -m pytest tests/ -v
```

## Architecture

Vanilla JS single-page app backed by a bundled TypeScript solver (`static/engine.js`). No server required.

**Data flow:**
```
Browser (static/index.html)
  → callEngine() [inline adapter]
    → calculateOptimalKeep() [static/engine.js, bundled from engine-ts/]
      → evaluator.ts   # recursive DP solver with Map memoization
        → abilities.ts # matches dice to abilities, returns EV
          → dice.ts    # classifies faces as A (1-3), B (4-5), C (6)
          → dreadful.ts # marginal value of Dreadful token gain
          → constants.ts # damage values for each ability
```

**Core algorithm** (`engine/evaluator.py`):
- `eval_state(kept, rolls_remaining, dreadful, head_location)` — recursive EV calculator, memoized with `lru_cache`
- Tries all 2^5 = 32 keep subsets per full hand; recurses over all 6^N reroll outcomes weighted by (1/6)^N
- State space: ~6^5 dice × 3 roll counts × 6 dreadful values × 2 head locations ≈ 279K unique states

**Game model** (`constants.py`):
All Headless Horseman abilities are encoded as numeric damage equivalents. Abilities require specific A/B/C symbol counts (dice faces 1-3=A, 4-5=B, 6=C). Dreadful tokens scale certain abilities; Terrorize is an Upkeep CHOICE at >=4 Dreadful. Marginal token values are EMPIRICALLY CALIBRATED (2026-07-05, 57.6k self-play games): `MARGINAL_VALUE = [1.9, 0.9, 0.9, 1.1, 0.0]` — see engine-ts/src/characters/horseman/dreadful.ts and calibration/.

**UI** (`static/index.html`):
Single-page vanilla JS app. Click dice to cycle face value, right-click to mark as kept. Calls `/eval` and renders top 5 keep strategies + ability board.
