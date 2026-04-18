import pytest
from engine.evaluator import eval_state, eval_initial_roll
from constants import DREADFUL_CHARGE_VALUE, DREADFUL_CHARGE_DREADFUL_GIVEN, SPECTRAL_ASSAULT_BASE, GRIM_PURSUIT_AVG_DMG
from engine.dreadful import dreadful_value_of_gaining


class TestBaseCase:
    def test_dreadful_charge_guaranteed(self):
        """5×C at rolls=0 → Dreadful Charge (base + dreadful gain)."""
        result = eval_state((6, 6, 6, 6, 6), 0, 0, "opponent")
        expected = DREADFUL_CHARGE_VALUE + dreadful_value_of_gaining(0, DREADFUL_CHARGE_DREADFUL_GIVEN)
        assert result == expected

    def test_spectral_assault_guaranteed(self):
        """3A+2C at rolls=0 → Spectral Assault base."""
        result = eval_state((1, 1, 1, 6, 6), 0, 0, "opponent")
        assert result == SPECTRAL_ASSAULT_BASE


class TestStrategicEV:
    def test_ev_exceeds_whiff(self):
        """Any first roll should produce EV above whiff value."""
        ev, _ = eval_initial_roll((1, 2, 4, 5, 6), 0, "opponent")
        assert ev > GRIM_PURSUIT_AVG_DMG

    def test_strong_position_keeps_scares(self):
        """CCCCA first roll → should keep at least 3 Scares (toward Dreadful Charge)."""
        ev, keep = eval_initial_roll((6, 6, 6, 6, 1), 0, "opponent")
        scare_count = sum(1 for d in keep if d == 6)
        assert scare_count >= 3

    def test_all_scare_first_roll(self):
        """5×C first roll → keep all (already best outcome)."""
        ev, keep = eval_initial_roll((6, 6, 6, 6, 6), 0, "opponent")
        expected_ev = DREADFUL_CHARGE_VALUE + dreadful_value_of_gaining(0, DREADFUL_CHARGE_DREADFUL_GIVEN)
        assert ev == expected_ev
        assert keep == (6, 6, 6, 6, 6)

    def test_ev_with_rolls_remaining(self):
        """EV at rolls=2 should be >= EV at rolls=0 for same kept dice."""
        dice_0 = (1, 1, 6, 6, 4)
        ev_0 = eval_state(dice_0, 0, 0, "opponent")
        ev_2 = eval_state((), 2, 0, "opponent")
        assert ev_2 >= ev_0


class TestMemoization:
    def test_same_call_returns_same_result(self):
        dice = (1, 1, 6, 6, 4)
        r1 = eval_state(dice, 1, 2, "opponent")
        r2 = eval_state(dice, 1, 2, "opponent")
        assert r1 == r2

    def test_sorted_tuple_equivalence(self):
        d1 = tuple(sorted((1, 6, 1, 4, 6)))
        d2 = tuple(sorted((6, 1, 4, 1, 6)))
        r1 = eval_state(d1, 1, 0, "opponent")
        r2 = eval_state(d2, 1, 0, "opponent")
        assert r1 == r2
