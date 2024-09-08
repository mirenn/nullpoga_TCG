import math


def ucb1(sn: int, n: int, w: float) -> float:
    return -w / n + (2 * math.log(sn) / n) ** 0.5
