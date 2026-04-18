from itertools import product

ALL_FACES = (1, 2, 3, 4, 5, 6)


def face_to_symbol(face: int) -> str:
    if face in (1, 2, 3):
        return 'A'
    elif face in (4, 5):
        return 'B'
    return 'C'


def classify_dice(dice: tuple) -> dict:
    counts = {'A': 0, 'B': 0, 'C': 0}
    for face in dice:
        counts[face_to_symbol(face)] += 1
    return counts


def enumerate_outcomes(n_dice: int) -> list:
    if n_dice == 0:
        return [()]
    return list(product(ALL_FACES, repeat=n_dice))
