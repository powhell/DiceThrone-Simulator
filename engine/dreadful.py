# Marginal dmg-equivalent value of gaining the Nth Dreadful token.
# Index = current token count before gain. Terrorize fires at token 4.
MARGINAL_VALUE = [3.0, 3.0, 3.0, 5.0, 0.5]


def dreadful_value_of_gaining(current: int, gained: int) -> float:
    total = 0.0
    for i in range(gained):
        idx = current + i
        if idx >= len(MARGINAL_VALUE):
            break
        total += MARGINAL_VALUE[idx]
    return total
