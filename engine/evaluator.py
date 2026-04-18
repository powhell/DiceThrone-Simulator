import functools
from itertools import product, combinations

from engine.dice import enumerate_outcomes
from engine.abilities import best_ability_value, best_ability_name

PROB_SINGLE = 1.0 / 6.0


@functools.lru_cache(maxsize=None)
def eval_state(
    kept: tuple,
    rolls_remaining: int,
    dreadful: int,
    head_location: str,
) -> float:
    """
    Returns optimal EV from the current state.

    kept: sorted tuple of kept die values (len 0–5).
    rolls_remaining: how many rolls are still available (0, 1, or 2).
    dreadful: current Dreadful token count (0–5).
    head_location: "player" or "opponent".

    Caller must pass kept as a sorted tuple for correct cache hits.
    """
    if rolls_remaining == 0:
        assert len(kept) == 5
        return best_ability_value(kept, dreadful, head_location)

    n_reroll = 5 - len(kept)
    prob = PROB_SINGLE ** n_reroll

    total_ev = 0.0
    for outcome in enumerate_outcomes(n_reroll):
        full = tuple(sorted(kept + outcome))
        total_ev += prob * _best_keep_ev(full, rolls_remaining - 1, dreadful, head_location)

    return total_ev


def _best_keep_ev(
    full: tuple,
    rolls_remaining: int,
    dreadful: int,
    head_location: str,
) -> float:
    """
    Given exactly 5 dice and rolls remaining, return the EV of the best keeping strategy.
    At rolls_remaining==0, keeping all 5 is the only valid choice.
    """
    if rolls_remaining == 0:
        return eval_state(full, 0, dreadful, head_location)

    best = -1.0
    for r in range(6):
        for idx in combinations(range(5), r):
            kept = tuple(sorted(full[i] for i in idx))
            ev = eval_state(kept, rolls_remaining, dreadful, head_location)
            if ev > best:
                best = ev
    return best


def _optimal_keep(
    full: tuple,
    rolls_remaining: int,
    dreadful: int,
    head_location: str,
) -> tuple:
    """Returns the kept subset (sorted tuple) that maximises EV."""
    if rolls_remaining == 0:
        return full
    best_ev = -1.0
    best_kept = full
    for r in range(6):
        for idx in combinations(range(5), r):
            kept = tuple(sorted(full[i] for i in idx))
            ev = eval_state(kept, rolls_remaining, dreadful, head_location)
            if ev > best_ev:
                best_ev = ev
                best_kept = kept
    return best_kept


@functools.lru_cache(maxsize=None)
def ability_distribution(
    kept: tuple,
    rolls_remaining: int,
    dreadful: int,
    head_location: str,
) -> tuple:
    """
    Returns a sorted tuple of (ability_name, probability) pairs assuming optimal play.
    Probabilities sum to 1.0.
    """
    from collections import defaultdict
    dist: dict = defaultdict(float)

    if rolls_remaining == 0:
        assert len(kept) == 5
        dist[best_ability_name(kept, dreadful, head_location)] = 1.0
        return tuple(sorted(dist.items()))

    n_reroll = 5 - len(kept)
    prob = PROB_SINGLE ** n_reroll

    for outcome in enumerate_outcomes(n_reroll):
        full = tuple(sorted(kept + outcome))
        best_kept = _optimal_keep(full, rolls_remaining - 1, dreadful, head_location)
        for name, p in ability_distribution(best_kept, rolls_remaining - 1, dreadful, head_location):
            dist[name] += prob * p

    return tuple(sorted(dist.items()))


def eval_initial_roll(
    first_roll: tuple,
    dreadful: int,
    head_location: str,
) -> tuple:
    """
    Entry point for a full turn.
    Returns (optimal_ev, best_dice_to_keep) given 5 dice from the first roll.
    """
    assert len(first_roll) == 5

    best_ev = -1.0
    best_keep = ()

    for r in range(6):
        for idx in combinations(range(5), r):
            kept = tuple(sorted(first_roll[i] for i in idx))
            ev = eval_state(kept, 2, dreadful, head_location)
            if ev > best_ev:
                best_ev = ev
                best_keep = kept

    return best_ev, best_keep
