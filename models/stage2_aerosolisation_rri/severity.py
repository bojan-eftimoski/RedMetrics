"""
Stage 2 -- RRI severity tier mapping.

Per task list 6.2:
  GREEN     :  0  -  30
  AMBER     : 31  -  60
  RED       : 61  -  85
  CRITICAL  : > 85
"""
from __future__ import annotations

GREEN_MAX: float = 30.0
AMBER_MAX: float = 60.0
RED_MAX: float = 85.0

VALID_SEVERITIES = ("GREEN", "AMBER", "RED", "CRITICAL")


def rri_to_severity(rri: float) -> str:
    """Map an RRI score in [0, 100] to one of GREEN / AMBER / RED / CRITICAL."""
    rri = float(rri)
    if rri <= GREEN_MAX:
        return "GREEN"
    if rri <= AMBER_MAX:
        return "AMBER"
    if rri <= RED_MAX:
        return "RED"
    return "CRITICAL"
