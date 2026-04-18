from flask import Flask, jsonify, request, send_from_directory
from itertools import combinations
from engine.evaluator import eval_state, ability_distribution
from engine.abilities import best_ability_value, has_straight
from engine.dice import classify_dice
from engine.dreadful import dreadful_value_of_gaining
from constants import (
    DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN,
    SPECTRAL_ASSAULT_BASE, SPECTRAL_ASSAULT_PER_DREADFUL,
    CLEAVE_3A, CLEAVE_4A, CLEAVE_5A, REAP_UNDEFENDABLE, REAP_DREADFUL_GIVEN,
    CARD_DRAW_VALUE, RIDE_DOWN_BASE, GRIM_PURSUIT_AVG_DMG,
    SOW_SMALL_DMG, SOW_SMALL_DREADFUL, SOW_LARGE_DMG, SOW_LARGE_DREADFUL,
    HORRIFY_BASE_UNDEFENDABLE, HORRIFY_DREADFUL_GIVEN,
    WHIFF_PURSUIT_TOKENS,
)

app = Flask(__name__, static_folder='static')


def _ability_breakdown(dice, dreadful, head_location):
    """Return a list of {name, value, base_damage, matched} for all abilities."""
    counts = classify_dice(dice)
    a, b, c = counts['A'], counts['B'], counts['C']
    results = []

    def add(name, value, matched, base_damage=None):
        v = round(value, 2)
        bd = round(base_damage, 2) if base_damage is not None else v
        results.append({'name': name, 'value': v, 'base_damage': bd, 'matched': matched})

    add('Dreadful Charge (CCCCC)',
        DREADFUL_CHARGE_VALUE + dreadful_value_of_gaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN),
        c >= 5,
        base_damage=DREADFUL_CHARGE_VALUE)
    add('Horrify (CCCC)',
        HORRIFY_BASE_UNDEFENDABLE + dreadful_value_of_gaining(dreadful, HORRIFY_DREADFUL_GIVEN),
        c >= 4 and c < 5,
        base_damage=HORRIFY_BASE_UNDEFENDABLE)
    add('Spectral Assault (AAACC)',
        SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL,
        a >= 3 and c >= 2)
    add('Cleave 5A (AAAAA)', CLEAVE_5A, a >= 5)
    add('Cleave 4A (AAAA)', CLEAVE_4A, a == 4)
    add('Cleave 3A (AAA)', CLEAVE_3A, a == 3)
    add('Ride Down (AAABB)', RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG, a >= 2 and b >= 2 and c == 0)
    reap_base = REAP_UNDEFENDABLE + (CARD_DRAW_VALUE if head_location == 'player' else 0)
    add('Reap (BBBC)',
        reap_base + dreadful_value_of_gaining(dreadful, REAP_DREADFUL_GIVEN),
        b >= 3 and c >= 1,
        base_damage=reap_base)
    add('Sow Despair L (5-straight)',
        SOW_LARGE_DMG + dreadful_value_of_gaining(dreadful, SOW_LARGE_DREADFUL),
        has_straight(dice, 5),
        base_damage=SOW_LARGE_DMG)
    add('Sow Despair S (4-straight)',
        SOW_SMALL_DMG + dreadful_value_of_gaining(dreadful, SOW_SMALL_DREADFUL),
        has_straight(dice, 4) and not has_straight(dice, 5),
        base_damage=SOW_SMALL_DMG)
    add('Whiff', WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG, not any(r['matched'] for r in results))

    return results


def _all_keep_options(dice, rolls_remaining, dreadful, head_location):
    """Return sorted list of {kept, ev} for all 32 subsets."""
    if rolls_remaining == 0:
        full = tuple(sorted(dice))
        ev = best_ability_value(full, dreadful, head_location)
        return [{'kept': list(full), 'ev': round(ev, 3)}]

    options = []
    seen = set()
    for r in range(6):
        for idx in combinations(range(5), r):
            kept = tuple(sorted(dice[i] for i in idx))
            if kept in seen:
                continue
            seen.add(kept)
            ev = eval_state(kept, rolls_remaining, dreadful, head_location)
            options.append({'kept': list(kept), 'ev': round(ev, 3)})
    options.sort(key=lambda x: -x['ev'])

    # Add probability distribution to top 5 only (perf)
    for opt in options[:5]:
        raw = ability_distribution(tuple(opt['kept']), rolls_remaining, dreadful, head_location)
        opt['prob_dist'] = {name: round(p * 100, 1) for name, p in raw if p > 0.001}

    return options


@app.route('/')
def index():
    return send_from_directory('static', 'index.html')


@app.route('/eval', methods=['POST'])
def evaluate():
    data = request.json
    dice = tuple(data['dice'])          # list of 5 ints 1-6
    rolls_remaining = int(data['rolls_remaining'])
    dreadful = int(data['dreadful'])
    head_location = data['head_location']

    assert len(dice) == 5
    assert rolls_remaining in (0, 1, 2)
    assert 0 <= dreadful <= 5
    assert head_location in ('player', 'opponent')

    options = _all_keep_options(dice, rolls_remaining, dreadful, head_location)
    abilities = _ability_breakdown(dice, dreadful, head_location)
    current_ev = best_ability_value(tuple(sorted(dice)), dreadful, head_location)

    return jsonify({
        'current_ev': round(current_ev, 3),
        'top_options': options[:5],
        'abilities': abilities,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
