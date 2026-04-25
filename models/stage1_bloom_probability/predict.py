"""
Stage 1 inference helper -- called by pipeline/run_live_rri.py.

Loads the calibrated LightGBM bundle saved by train.py and returns a
calibrated probability in [0, 1] for a single day's feature dictionary.
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

from models.stage1_bloom_probability.features import FEATURES  # noqa: E402

MODEL_PATH = REPO_ROOT / "data" / "models" / "stage1_lgbm.pkl"

_BUNDLE: dict | None = None


def _load_bundle() -> dict:
    global _BUNDLE
    if _BUNDLE is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Stage 1 model not found at {MODEL_PATH}. "
                f"Run `python -m models.stage1_bloom_probability.train` first."
            )
        _BUNDLE = joblib.load(MODEL_PATH)
    return _BUNDLE


def predict_bloom_probability(features_today: dict[str, Any]) -> float:
    """Return calibrated bloom probability in [0, 1] for today's features.

    Raises KeyError if any of the 16 required features is missing.
    """
    bundle = _load_bundle()
    expected: list[str] = bundle.get("features", FEATURES)

    missing = [k for k in expected if k not in features_today]
    if missing:
        raise KeyError(f"Missing features for Stage 1 inference: {missing}")

    row = pd.DataFrame([{k: features_today[k] for k in expected}], columns=expected)
    proba = float(bundle["model"].predict_proba(row)[0, 1])
    return max(0.0, min(1.0, proba))
