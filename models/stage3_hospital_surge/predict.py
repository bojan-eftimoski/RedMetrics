"""
Stage 3 inference -- expected respiratory admissions surge for one hospital.

`surge_output` returns the dict shape mandated by PRD §4 Stage 3 and consumed
by the hospital frontend's surge forecast page.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from models.stage3_hospital_surge.features import FEATURES_SURGE  # noqa: E402

MODEL_PATH = REPO_ROOT / "data" / "models" / "stage3_linear.pkl"

# Per-hospital monthly baseline (matches Stage 3 training target scale).
# Stage 3 trains on per-hospital admissions; mean of non-bloom months is ~130.
BASELINE = 130
LOW_THRESHOLD = 25      # per-hospital "additional vs baseline" (zone total ~75 across 3 hospitals)
MODERATE_THRESHOLD = 60 # per-hospital threshold (zone total ~180 across 3 hospitals)
NURSING_PER_EXTRA_25 = 25
EUR_PER_ADDITIONAL_PATIENT = 95
CI_LOW_PCT = 0.85
CI_HIGH_PCT = 1.15

_BUNDLE: dict | None = None


def _load_bundle() -> dict:
    global _BUNDLE
    if _BUNDLE is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Stage 3 model not found at {MODEL_PATH}. "
                f"Run `python -m models.stage3_hospital_surge.train` first."
            )
        _BUNDLE = joblib.load(MODEL_PATH)
    return _BUNDLE


def _severity(additional: float) -> str:
    if additional < LOW_THRESHOLD:
        return "LOW SURGE"
    if additional < MODERATE_THRESHOLD:
        return "MODERATE SURGE"
    return "HIGH SURGE"


def surge_output(
    model: Any | None = None,
    features_today: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return the surge forecast dict for one hospital-day's features.

    `model` is optional -- when omitted, the persisted bundle is used so the
    function works as a single-call entry point from the live pipeline.
    """
    if features_today is None:
        raise ValueError("features_today is required")

    if model is None:
        model = _load_bundle()["model"]

    expected = FEATURES_SURGE
    missing = [k for k in expected if k not in features_today]
    if missing:
        raise KeyError(f"Missing features for Stage 3 inference: {missing}")

    row = pd.DataFrame([{k: features_today[k] for k in expected}], columns=expected)
    predicted_admissions = float(model.predict(row)[0])
    additional = predicted_admissions - BASELINE

    return {
        "expected_total_admissions": int(round(predicted_admissions)),
        "expected_additional_vs_baseline": int(round(additional)),
        "severity_tier": _severity(additional),
        "recommended_extra_nursing_shifts": max(0, int(additional / NURSING_PER_EXTRA_25)),
        "recommended_medication_stock_eur": max(0, int(additional * EUR_PER_ADDITIONAL_PATIENT)),
        "confidence_interval_low": int(round(predicted_admissions * CI_LOW_PCT)),
        "confidence_interval_high": int(round(predicted_admissions * CI_HIGH_PCT)),
    }
