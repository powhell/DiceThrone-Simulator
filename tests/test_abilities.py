import pytest
from engine.abilities import best_ability_value, has_straight
from engine.dreadful import dreadful_value_of_gaining
from constants import (
    DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN,
    SPECTRAL_ASSAULT_BASE, SPECTRAL_ASSAULT_PER_DREADFUL,
    CLEAVE_3A, CLEAVE_4A, CLEAVE_5A,
    REAP_UNDEFENDABLE, CARD_DRAW_VALUE,
    RIDE_DOWN_BASE, GRIM_PURSUIT_AVG_DMG,
    SOW_SMALL_DMG, SOW_LARGE_DMG,
    HORRIFY_BASE_UNDEFENDABLE,
    WHIFF_PURSUIT_TOKENS,
)


class TestStraightDetection:
    def test_5_straight(self):
        assert has_straight((1, 2, 3, 4, 5), 5)

    def test_4_straight_low(self):
        assert has_straight((1, 2, 3, 4, 6), 4)

    def test_4_straight_high(self):
        assert has_straight((2, 3, 4, 5, 6), 4)

    def test_no_straight(self):
        assert not has_straight((1, 1, 1, 6, 6), 4)

    def test_6_straight_impossible(self):
        assert not has_straight((1, 2, 3, 4, 5), 6)


class TestAbilityMatching:
    def test_dreadful_charge(self):
        expected = DREADFUL_CHARGE_VALUE + dreadful_value_of_gaining(0, DREADFUL_CHARGE_DREADFUL_GIVEN)
        assert best_ability_value((6, 6, 6, 6, 6), 0, "opponent") == expected

    def test_dreadful_charge_beats_horrify(self):
        dc = best_ability_value((6, 6, 6, 6, 6), 0, "opponent")
        horrify = best_ability_value((6, 6, 6, 6, 4), 0, "opponent")
        assert dc > horrify

    def test_spectral_assault_base(self):
        assert best_ability_value((1, 1, 1, 6, 6), 0, "opponent") == SPECTRAL_ASSAULT_BASE

    def test_spectral_assault_scales_with_dreadful(self):
        d0 = best_ability_value((1, 1, 1, 6, 6), 0, "opponent")
        d3 = best_ability_value((1, 1, 1, 6, 6), 3, "opponent")
        assert abs((d3 - d0) - 3 * SPECTRAL_ASSAULT_PER_DREADFUL) < 1e-9

    def test_cleave_3a(self):
        # AAA + BB → Ride Down wins over Cleave 3A
        result = best_ability_value((1, 1, 1, 4, 5), 0, "opponent")
        expected = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG
        assert abs(result - expected) < 1e-9

    def test_cleave_4a(self):
        # AAAA + C → Cleave 4A (c != 0, b = 0, can't be Ride Down)
        result = best_ability_value((1, 1, 1, 2, 6), 0, "opponent")
        # a=4, c=1 → also Spectral Assault? No: needs c>=2. So Cleave 4A = 5
        assert result == CLEAVE_4A

    def test_cleave_5a(self):
        result = best_ability_value((1, 2, 1, 2, 3), 0, "opponent")
        assert result == CLEAVE_5A

    def test_reap_without_head(self):
        # BBB + CC
        result = best_ability_value((4, 5, 4, 6, 6), 0, "opponent")
        expected = REAP_UNDEFENDABLE + dreadful_value_of_gaining(0, 2)
        assert abs(result - expected) < 1e-9

    def test_reap_with_head(self):
        result = best_ability_value((4, 5, 4, 6, 6), 0, "player")
        expected = REAP_UNDEFENDABLE + dreadful_value_of_gaining(0, 2) + CARD_DRAW_VALUE
        assert abs(result - expected) < 1e-9

    def test_ride_down(self):
        # AA + BBB → a=2, b=3, c=0 → Ride Down
        result = best_ability_value((1, 2, 4, 5, 4), 0, "opponent")
        expected = RIDE_DOWN_BASE + 2 * GRIM_PURSUIT_AVG_DMG
        assert abs(result - expected) < 1e-9

    def test_sow_despair_large(self):
        result = best_ability_value((1, 2, 3, 4, 5), 0, "opponent")
        expected = SOW_LARGE_DMG + dreadful_value_of_gaining(0, 2)
        assert result >= expected - 1e-9

    def test_sow_despair_small(self):
        # 4-straight but not 5 → Sow Despair Small
        result = best_ability_value((1, 2, 3, 4, 6), 0, "opponent")
        expected = SOW_SMALL_DMG + dreadful_value_of_gaining(0, 1)
        assert result >= expected - 1e-9

    def test_horrify(self):
        # CCCC + A
        result = best_ability_value((6, 6, 6, 6, 1), 0, "opponent")
        expected = HORRIFY_BASE_UNDEFENDABLE + dreadful_value_of_gaining(0, 3)
        assert abs(result - expected) < 1e-9

    def test_whiff(self):
        # No matching ability
        result = best_ability_value((1, 4, 6, 4, 1), 0, "opponent")
        # A=2, B=2, C=1 → Ride Down needs c=0, Reap needs b>=3, SA needs a>=3 and c>=2
        # Cleave needs a>=3 — none match except whiff
        assert result == WHIFF_PURSUIT_TOKENS * GRIM_PURSUIT_AVG_DMG
