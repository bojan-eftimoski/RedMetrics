"""
Stage 3 hospital surge feature contract.

Per PRD §4 Stage 3, training is monthly resolution: target is
`respiratory_admissions` from the hospital CSV. Daily-scale features
(`rri_lag7`, `bloom_duration_days`) are aggregated to month using the
backfilled `rri_mean_month` and `bloom_days_in_month` columns that Phase 4
writes back into the hospital CSV.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
HOSPITAL_PATH = REPO_ROOT / "data" / "raw" / "hospital" / "hospital_admissions_ligurian_synthetic.csv"

FEATURES_SURGE: list[str] = [
    "rri_lag7",
    "coastal_population",
    "asthma_prevalence_pct",
    "bloom_duration_days",
    "month_sin",
    "month_cos",
]

TARGET_SURGE: str = "respiratory_admissions"

LIGURIAN_COASTAL_POPULATION: int = 180_000
DEFAULT_ASTHMA_PCT: float = 6.5
TRAIN_END_YEAR: int = 2022
VALIDATE_START_YEAR: int = 2022


def _build_monthly_features(hospital: pd.DataFrame) -> pd.DataFrame:
    """Return the per-(hospital, month) feature table ready for training/inference."""
    df = hospital.copy()
    df["year_month_dt"] = pd.to_datetime(df["year_month"], format="%Y-%m")
    df = df.sort_values(["hospital_id", "year_month_dt"]).reset_index(drop=True)

    # rri_lag7 is daily in PRD; at monthly resolution this reduces to "last month's mean RRI".
    df["rri_lag7"] = df.groupby("hospital_id")["rri_mean_month"].shift(1)

    df["bloom_duration_days"] = df["bloom_days_in_month"].fillna(0).astype(float)
    df["coastal_population"] = LIGURIAN_COASTAL_POPULATION
    if "asthma_patients_pct" in df.columns:
        df["asthma_prevalence_pct"] = df["asthma_patients_pct"]
    else:
        df["asthma_prevalence_pct"] = DEFAULT_ASTHMA_PCT

    month = df["year_month_dt"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * month / 12)
    df["month_cos"] = np.cos(2 * np.pi * month / 12)

    return df


def load_training_data(
    path: Path | None = None,
) -> tuple[pd.DataFrame, pd.Series, pd.Series]:
    """Return (X, y, year_month_dt) with rri_lag7 NaN rows dropped (first month per hospital)."""
    csv_path = path or HOSPITAL_PATH
    if not csv_path.exists():
        raise FileNotFoundError(
            f"hospital CSV not found at {csv_path}. "
            f"Run scripts/03_generate_hospital_mock.py and 04_feature_engineering.py first."
        )

    hospital = pd.read_csv(csv_path)
    required = {"year_month", "hospital_id", "respiratory_admissions",
                "rri_mean_month", "bloom_days_in_month"}
    missing = required - set(hospital.columns)
    if missing:
        raise ValueError(f"hospital CSV missing required columns: {sorted(missing)}")

    df = _build_monthly_features(hospital)
    df = df.dropna(subset=["rri_lag7", TARGET_SURGE])

    X = df[FEATURES_SURGE].copy()
    y = df[TARGET_SURGE].astype(float).copy()
    when = df["year_month_dt"].copy()
    return X, y, when


def split_train_validate(
    X: pd.DataFrame, y: pd.Series, when: pd.Series
) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.Series]:
    """Time-based split per PRD: train through 2022, validate 2022-2024."""
    train_mask = when.dt.year < VALIDATE_START_YEAR
    val_mask = when.dt.year >= VALIDATE_START_YEAR
    return X[train_mask], y[train_mask], X[val_mask], y[val_mask]
