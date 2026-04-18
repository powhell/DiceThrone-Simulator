from engine.dice import classify_dice
from engine.dreadful import dreadful_value_of_gaining
from constants import (
    GRIM_PURSUIT_AVG_DMG, CARD_DRAW_VALUE,
    SPECTRAL_ASSAULT_BASE, SPECTRAL_ASSAULT_PER_DREADFUL,
    DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN,
    CLEAVE_3A, CLEAVE_4A, CLEAVE_5A,
    REAP_UNDEFENDABLE, REAP_DREADFUL_GIVEN,
    RIDE_DOWN_BASE,
    SOW_SMALL_DMG, SOW_SMALL_DREADFUL, SOW_LARGE_DMG, SOW_LARGE_DREADFUL,
    HORRIFY_BASE_UNDEFENDABLE, HORRIFY_DREADFUL_GIVEN,
    WHIFF_PURSUIT_TOKENS,
)


def _candidates(dice: tuple, dreadful: int, head_location: str) -> list:
    """Shared helper — returns list of (name, value) for all applicable abilities."""
    counts = classify_dice(dice)
    a, b, c = counts['A'], counts['B'], counts['C']
    out = []
    if c >= 5:
        out.append(('Dreadful Charge', DREADFUL_CHARGE_VALUE + dreadful_value_of_gaining(dreadful, DREADFUL_CHARGE_DREADFUL_GIVEN)))
    if c >= 4:
        out.append(('Horrify', HORRIFY_BASE_UNDEFENDABLE + dreadful_value_of_gaining(dreadful, HORRIFY_DREADFUL_GIVEN)))
    if a >= 3 and c >= 2:
        out.append(('Spectral Assault', SPECTRAL_ASSAULT_BASE + dreadful * SPECTRAL_ASSAULT_PER_DREADFUL))
    if a >= 5:
        out.append(('Cleave 5A', CLEAVE_5A))
    elif a == 4:
        out.append(('Cleave 4A', CLEAVE_4A))
    elif a == 3:
        out.append(('Cleave 3A', CLEAVE_3A))
    if a >= 2 and b >= 2 and c == 0:
        out.append(('Ride Down', RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG))
    if b >= 3 and c >= 1:
        val = REAP_UNDEFENDABLE + dreadful_value_of_gaining(dreadful, REAP_DREADFUL_GIVEN)
        if head_location == 'player':
            val += CARD_DRAW_VALUE
        out.append(('Reap', val))
    if has_straight(dice, 5):
        out.append(('Sow Despair L', SOW_LARGE_DMG + dreadful_value_of_gaining(dreadful, SOW_LARGE_DREADFUL)))
    if has_straight(dice, 4):
        out.append(('Sow Despair S', SOW_SMALL_DMG + dreadful_value_of_gaining(dreadful, SOW_SMALL_DREADFUL)))
    out.append(('Whiff', WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG))
    return out


def has_straight(dice: tuple, length: int) -> bool:  # noqa: E302 — defined before _candidates uses it
    unique = set(dice)
    for start in range(1, 7 - length + 1):
        if all(start + i in unique for i in range(length)):
            return True
    return False


def best_ability_value(dice: tuple, dreadful: int, head_location: str) -> float:
    return max(v for _, v in _candidates(dice, dreadful, head_location))


def best_ability_name(dice: tuple, dreadful: int, head_location: str) -> str:
    return max(_candidates(dice, dreadful, head_location), key=lambda x: x[1])[0]
