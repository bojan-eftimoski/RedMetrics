"""
Phase 7 -- Stage 3 hospital surge training.

Per PRD §4 Stage 3:
  - Ridge regression on monthly hospital admissions
  - Train 2015-2021, validate 2022-2024
  - Verify intercept ~ 420 (baseline) and rri_lag7 coefficient produces
    ~54% increase at RRI=85 (Kirkpatrick prior)
  - Save to data/models/stage3_linear.pkl

Usage:
    python -m models.stage3_hospital_surge.train
"""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
from sklearn.linear_model import RidgeCV
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from models.stage3_hospital_surge.features import (  # noqa: E402
    FEATURES_SURGE,
    load_training_data,
    split_train_validate,
)

MODEL_DIR = REPO_ROOT / "data" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "stage3_linear.pkl"

ALPHA_GRID = [0.1, 0.5, 1.0, 5.0, 10.0, 50.0, 100.0]

BASELINE_ADMISSIONS = 420
KIRKPATRICK_TARGET_INCREASE_PCT = 54.0
KIRKPATRICK_TARGET_RRI = 85


def main() -> int:
    print("=" * 64)
    print("Stage 3 -- Hospital surge training")
    print("=" * 64)

    X, y, when = load_training_data()
    print(f"Total monthly rows: {len(X)}  hospitals*months after dropping first month each")
    print(f"Date range: {when.min().date()} -> {when.max().date()}")
    print(f"Features: {FEATURES_SURGE}")
    print(f"Target ({y.name}): mean={y.mean():.1f}  std={y.std():.1f}")

    X_tr, y_tr, X_val, y_val = split_train_validate(X, y, when)
    print(f"Train: {len(X_tr)} rows  Validate: {len(X_val)} rows")

    if len(X_tr) < 12 or len(X_val) < 6:
        print("[FAIL] Not enough rows to fit Stage 3 reliably.")
        return 1

    model = RidgeCV(alphas=ALPHA_GRID)
    model.fit(X_tr, y_tr)
    print(f"Selected alpha: {model.alpha_}")
    print(f"Intercept: {model.intercept_:.2f}  (Kirkpatrick prior baseline ~ {BASELINE_ADMISSIONS})")
    for name, coef in zip(FEATURES_SURGE, model.coef_):
        print(f"  coef {name:25s} {coef:+.4f}")

    rri_coef = model.coef_[FEATURES_SURGE.index("rri_lag7")]
    implied_increase = rri_coef * KIRKPATRICK_TARGET_RRI
    implied_pct = 100.0 * implied_increase / max(model.intercept_, 1.0)
    print(
        f"Implied surge at rri_lag7={KIRKPATRICK_TARGET_RRI}: "
        f"+{implied_increase:.1f} admissions "
        f"({implied_pct:.1f}% vs intercept; Kirkpatrick target ~{KIRKPATRICK_TARGET_INCREASE_PCT}%)"
    )

    pred_val = model.predict(X_val)
    rmse = float(np.sqrt(mean_squared_error(y_val, pred_val)))
    mae = float(mean_absolute_error(y_val, pred_val))
    r2 = float(r2_score(y_val, pred_val))
    print(f"Validation:  RMSE={rmse:.2f}  MAE={mae:.2f}  R2={r2:.3f}")

    joblib.dump({"model": model, "features": FEATURES_SURGE}, MODEL_PATH)
    print(f"Saved model -> {MODEL_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
