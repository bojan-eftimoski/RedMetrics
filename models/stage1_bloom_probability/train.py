"""
Phase 5 — Stage 1 bloom probability training.

Per PRD §4 Stage 1:
  - LightGBM binary classifier with PARAMS
  - TimeSeriesSplit(5) for fold AUC
  - Final model wrapped in CalibratedClassifierCV(method="isotonic", cv=3)
  - Saved to data/models/stage1_lgbm.pkl

Usage:
    python -m models.stage1_bloom_probability.train
"""
from __future__ import annotations

import sys
from pathlib import Path

import joblib
import lightgbm as lgb
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import TimeSeriesSplit

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from models.stage1_bloom_probability.features import FEATURES, load_training_data  # noqa: E402

MODEL_DIR = REPO_ROOT / "data" / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODEL_DIR / "stage1_lgbm.pkl"

PARAMS: dict = {
    "objective": "binary",
    "metric": "auc",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 20,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1,
}

N_SPLITS = 5
N_ESTIMATORS = 500
EARLY_STOPPING_ROUNDS = 30


def _fit_one_fold(X_tr, y_tr, X_val, y_val) -> tuple[lgb.LGBMClassifier, float]:
    model = lgb.LGBMClassifier(n_estimators=N_ESTIMATORS, **PARAMS)
    model.fit(
        X_tr,
        y_tr,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(EARLY_STOPPING_ROUNDS, verbose=False)],
    )
    proba = model.predict_proba(X_val)[:, 1]
    return model, roc_auc_score(y_val, proba)


def main() -> int:
    print("=" * 64)
    print("Stage 1 -- Bloom probability training")
    print("=" * 64)

    X, y, dates = load_training_data()
    print(f"Rows: {len(X)}  Positives: {int(y.sum())}  Rate: {y.mean():.3f}")
    print(f"Date range: {dates.min().date()} -> {dates.max().date()}")
    print(f"Features ({len(FEATURES)}): {FEATURES}")

    if y.nunique() < 2:
        print("[FAIL] Target has only one class -- cannot train a classifier.")
        return 1
    if len(X) < N_SPLITS * 50:
        print(f"[WARN] Small dataset ({len(X)} rows) for TimeSeriesSplit({N_SPLITS}).")

    tscv = TimeSeriesSplit(n_splits=N_SPLITS)
    fold_aucs: list[float] = []
    for fold, (tr_idx, val_idx) in enumerate(tscv.split(X), start=1):
        X_tr, X_val = X.iloc[tr_idx], X.iloc[val_idx]
        y_tr, y_val = y.iloc[tr_idx], y.iloc[val_idx]
        if y_tr.nunique() < 2 or y_val.nunique() < 2:
            print(f"  fold {fold}: skipped (single-class split)")
            continue
        _, auc = _fit_one_fold(X_tr, y_tr, X_val, y_val)
        fold_aucs.append(auc)
        print(f"  fold {fold}: AUC = {auc:.4f}  (train={len(X_tr)}, val={len(X_val)})")

    if fold_aucs:
        print(f"Mean fold AUC: {np.mean(fold_aucs):.4f}  std: {np.std(fold_aucs):.4f}")
    else:
        print("[WARN] No usable folds -- proceeding to fit-and-calibrate on full data.")

    base = lgb.LGBMClassifier(n_estimators=N_ESTIMATORS, **PARAMS)
    # PRD §4 Stage 1 specifies cv=3 inside the calibrator. CalibratedClassifierCV
    # uses StratifiedKFold by default; this is a small leakage risk vs strict
    # time-ordering, accepted to stay faithful to the PRD calibration spec.
    calibrated = CalibratedClassifierCV(base, method="isotonic", cv=3)
    calibrated.fit(X, y)

    importances_attr = getattr(calibrated.calibrated_classifiers_[0].estimator, "feature_importances_", None)
    if importances_attr is not None:
        ranked = sorted(zip(FEATURES, importances_attr), key=lambda kv: kv[1], reverse=True)
        print("Feature importance (calibrated[0] base estimator, gain):")
        for name, val in ranked:
            print(f"  {name:30s} {val}")

    joblib.dump({"model": calibrated, "features": FEATURES}, MODEL_PATH)
    print(f"Saved calibrated model -> {MODEL_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
