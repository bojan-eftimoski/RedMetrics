"""
Stage 4 -- Parametric payout calculation.

Per PRD §4 Stage 4 ladder:
  rri > 85 AND duration >= 7   -> CRITICAL (100% of insured daily cost)
  rri > 70 AND duration >= 5   -> RED      ( 75% )
  rri > 60 AND duration >= 3   -> AMBER    ( 25% )
  otherwise                    -> NONE     (   0% )

Payout is capped at 120% of the modelled expected surge cost
(surge_additional_admissions * 850 EUR per ER respiratory visit).
"""
from __future__ import annotations

import sys
from typing import Any

import pandas as pd

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

EUR_PER_RESPIRATORY_VISIT: float = 850.0
PAYOUT_CAP_MULTIPLIER: float = 1.2

CRITICAL_RRI: float = 85.0
CRITICAL_DAYS: int = 7
CRITICAL_PCT: float = 1.00

RED_RRI: float = 70.0
RED_DAYS: int = 5
RED_PCT: float = 0.75

AMBER_RRI: float = 60.0
AMBER_DAYS: int = 3
AMBER_PCT: float = 0.25


def _classify_tier(rri_score: float, bloom_duration_days: int) -> tuple[str, float]:
    if rri_score > CRITICAL_RRI and bloom_duration_days >= CRITICAL_DAYS:
        return "CRITICAL", CRITICAL_PCT
    if rri_score > RED_RRI and bloom_duration_days >= RED_DAYS:
        return "RED", RED_PCT
    if rri_score > AMBER_RRI and bloom_duration_days >= AMBER_DAYS:
        return "AMBER", AMBER_PCT
    return "NONE", 0.0


def calculate_payout(
    rri_score: float,
    bloom_duration_days: int,
    hospital_id: str,
    insured_daily_operational_cost_eur: float,
    surge_additional_admissions: float,
    now: pd.Timestamp | None = None,
) -> dict[str, Any]:
    """Return the parametric payout dict per PRD §4 Stage 4.

    `surge_additional_admissions` comes from Stage 3 surge_output()['expected_additional_vs_baseline'].
    `now` is overridable for deterministic certificate IDs in tests/replay.
    """
    tier, payout_pct = _classify_tier(float(rri_score), int(bloom_duration_days))

    expected_surge_cost = max(0.0, float(surge_additional_admissions)) * EUR_PER_RESPIRATORY_VISIT
    raw_payout = payout_pct * float(insured_daily_operational_cost_eur) * int(bloom_duration_days)
    payout_eur = min(raw_payout, expected_surge_cost * PAYOUT_CAP_MULTIPLIER) if expected_surge_cost > 0 else raw_payout

    timestamp = now or pd.Timestamp.now()
    cert_id = f"TA-{hospital_id}-{timestamp.strftime('%Y%m%d%H%M')}"

    return {
        "payout_tier": tier,
        "payout_pct_of_coverage": payout_pct,
        "calculated_payout_eur": round(float(payout_eur), 2),
        "bloom_duration_days": int(bloom_duration_days),
        "trigger_basis": "RRI_AND_IOT_CONFIRMED",
        "event_certificate_id": cert_id,
    }
