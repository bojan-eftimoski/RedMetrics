# Stage 3 — Hospital Surge

Ridge regression that turns satellite-derived RRI into a per-hospital monthly admissions forecast and a surge tier (`LOW / MODERATE / HIGH SURGE`).

| | |
|---|---|
| **Resolution** | Monthly per hospital. Daily-scale `rri_lag7` from PRD reduces to "last month's mean RRI" at this granularity. |
| **Inputs** | `data/raw/hospital/hospital_admissions_ligurian_synthetic.csv` (with `rri_mean_month` backfilled by Phase 4). 6 features in `FEATURES_SURGE`. |
| **Target** | `respiratory_admissions` (monthly count per hospital) |
| **Model** | `RidgeCV` over `[0.1, 0.5, 1, 5, 10, 50, 100]` |
| **Split** | Train ≤ 2021, validate 2022–2024 |
| **Output** | `data/models/stage3_linear.pkl` — joblib bundle |

## Calibration sanity checks (printed at training time)

- **Intercept** should land near 420 (Kirkpatrick baseline)
- Coefficient on `rri_lag7` should produce roughly **+54% admissions at RRI = 85** (Kirkpatrick prior). The training script prints the implied % so drift is visible.

## Inference

```python
from models.stage3_hospital_surge.predict import surge_output
out = surge_output(features_today={
    "rri_lag7": 78.0, "coastal_population": 180000,
    "asthma_prevalence_pct": 6.5, "bloom_duration_days": 9,
    "month_sin": 0.5, "month_cos": -0.866,
})
# -> {expected_total_admissions, expected_additional_vs_baseline, severity_tier, ...}
```
