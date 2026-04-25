"""
Stage 4 -- Parametric trigger evaluation (B2B2B Flow A).

Per PRD §4 Stage 4: both satellite (RRI) AND IoT confirmation are required to
fire the trigger. Either source alone could be a false positive.

  rri_trigger = (rri_score > 70) and (rri_consecutive_days >= 5)
  iot_trigger = (iot_dissolved_oxygen < 5.0) and (iot_ph < 7.95)
  trigger_fired = rri_trigger and iot_trigger
"""
from __future__ import annotations

import sys
from typing import Any

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

RRI_SCORE_THRESHOLD: float = 70.0
RRI_CONSECUTIVE_DAYS_THRESHOLD: int = 5
IOT_DO_THRESHOLD: float = 5.0
IOT_PH_THRESHOLD: float = 7.95


def evaluate_parametric_trigger(
    rri_score: float,
    rri_consecutive_days: int,
    iot_dissolved_oxygen: float,
    iot_ph: float,
) -> dict[str, Any]:
    rri_trigger = (
        float(rri_score) > RRI_SCORE_THRESHOLD
        and int(rri_consecutive_days) >= RRI_CONSECUTIVE_DAYS_THRESHOLD
    )
    iot_trigger = (
        float(iot_dissolved_oxygen) < IOT_DO_THRESHOLD
        and float(iot_ph) < IOT_PH_THRESHOLD
    )
    trigger_fired = rri_trigger and iot_trigger

    return {
        "trigger_fired": trigger_fired,
        "rri_condition_met": rri_trigger,
        "iot_condition_met": iot_trigger,
        "rri_score": float(rri_score),
        "rri_days_above_threshold": int(rri_consecutive_days),
        "iot_dissolved_oxygen": float(iot_dissolved_oxygen),
        "iot_ph": float(iot_ph),
    }
