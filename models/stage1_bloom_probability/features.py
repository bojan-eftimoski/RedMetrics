"""
Stage 1 features and label contract for the bloom probability classifier.

Per PRD §4 Stage 1: 16 features sourced from merged_features.csv.
Bloom label is forward-looking (7-day) and constructed in Phase 4 feature
engineering, not here.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
MERGED_FEATURES_PATH = REPO_ROOT / "data" / "processed" / "merged_features.csv"

FEATURES: list[str] = [
    "chl_a_mean",
    "chl_a_7d_rate",
    "chl_a_consecutive_days",
    "sst_mean",
    "sst_anomaly",
    "u_current",
    "v_current",
    "salinity_mean",
    "ndci",
    "day_of_year_sin",
    "day_of_year_cos",
    "iot_temperature_mean",
    "iot_ph_mean",
    "iot_dissolved_oxygen_mean",
    "iot_nitrate_mean",
    "iot_phosphate_mean",
]

TARGET: str = "bloom_label"


def load_training_data(
    path: Path | None = None,
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Load merged features and return (X, y, dates) ready for training.

    Drops rows where the target is NaN (early/late edges of the timeline)
    or where any feature is NaN after Phase 4's forward-fill (sparse data
    early in the satellite record).
    """
    csv_path = path or MERGED_FEATURES_PATH
    if not csv_path.exists():
        raise FileNotFoundError(
            f"merged_features.csv not found at {csv_path}. "
            f"Run scripts/04_feature_engineering.py first."
        )

    df = pd.read_csv(csv_path, parse_dates=["date"])
    missing = [c for c in FEATURES + [TARGET, "date"] if c not in df.columns]
    if missing:
        raise ValueError(f"merged_features.csv missing required columns: {missing}")

    df = df.dropna(subset=[TARGET])
    df = df.dropna(subset=FEATURES)
    df = df.sort_values("date").reset_index(drop=True)

    X = df[FEATURES].copy()
    y = df[TARGET].astype(int).copy()
    dates = df["date"].copy()
    return X, y, dates
