# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Run the app:**
```bash
python app.py
# Serves at http://localhost:5000
```

**Run tests:**
```bash
python -m pytest tests/ -v
```

## Architecture

This is a Flask-based dice strategy analyzer. A single POST endpoint (`/eval` in `app.py`) accepts a game state and returns optimal keep strategies via dynamic programming.

**Data flow:**
```
Browser (static/index.html)
  → POST /eval (app.py)
    → engine/evaluator.py   # recursive DP solver with lru_cache memoization
      → engine/abilities.py # matches dice to abilities, returns EV
        → engine/dice.py    # classifies faces as A (1-3), B (4-5), C (6)
        → engine/dreadful.py # marginal value of Dreadful token gain
        → constants.py       # damage values for each ability
```

**Core algorithm** (`engine/evaluator.py`):
- `eval_state(kept, rolls_remaining, dreadful, head_location)` — recursive EV calculator, memoized with `lru_cache`
- Tries all 2^5 = 32 keep subsets per full hand; recurses over all 6^N reroll outcomes weighted by (1/6)^N
- State space: ~6^5 dice × 3 roll counts × 6 dreadful values × 2 head locations ≈ 279K unique states

**Game model** (`constants.py`):
All Headless Horseman abilities are encoded as numeric damage equivalents. Abilities require specific A/B/C symbol counts (dice faces 1-3=A, 4-5=B, 6=C). Dreadful tokens scale certain abilities; the **4th token** triggers "Terrorize" (3 dmg + 1 CP spike); the 5th token is near-worthless and hurts the defense. See `engine/dreadful.py` — `MARGINAL_VALUE = [3.0, 3.0, 3.0, 5.0, 0.5]`.

**UI** (`static/index.html`):
Single-page vanilla JS app. Click dice to cycle face value, right-click to mark as kept. Calls `/eval` and renders top 5 keep strategies + ability board.
