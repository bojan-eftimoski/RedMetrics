"""
Phase 3 — Hospital admissions mock data generator.

Monthly synthetic admissions for 3 Genoa hospitals (2015-01 -> 2024-12),
calibrated to Florida priors (Kirkpatrick 2006: +54% respiratory during bloom;
Hoagland 2014: GI = 0.41 x respiratory) and scaled to Ligurian coastal pop (~180k).

Output: data/raw/hospital/hospital_admissions_ligurian_synthetic.csv
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = REPO_ROOT / "data" / "raw" / "hospital"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "hospital_admissions_ligurian_synthetic.csv"

SEED = 20260425

HOSPITALS = [
    {"id": "OSP_SAN_MARTINO", "asthma_pct": 6.8, "weight": 1.10},  # largest catchment
    {"id": "OSP_GALLIERA",    "asthma_pct": 6.5, "weight": 0.95},
    {"id": "OSP_VILLA_SCASSI", "asthma_pct": 6.3, "weight": 0.95},
]
# weights sum ~3.0 -> baseline 420 splits roughly per weight share

# ISPRA-aligned Ligurian bloom months 2015-2024 (year, month, intensity[0..1], days_active)
BLOOM_MONTHS = [
    # 2015
    (2015, 7, 0.55, 14), (2015, 8, 0.70, 22),
    # 2016
    (2016, 8, 0.50, 12),
    # 2017
    (2017, 7, 0.60, 18), (2017, 8, 0.75, 24),
    # 2018
    (2018, 8, 0.45, 10),
    # 2019
    (2019, 7, 0.40, 8),
    # 2020
    (2020, 8, 0.35, 7),
    # 2021
    (2021, 7, 0.50, 12), (2021, 8, 0.55, 15),
    # 2022 (matches IoT bloom 2022-07-15 to 2022-08-10)
    (2022, 7, 0.62, 17), (2022, 8, 0.55, 10),
    # 2023 (matches IoT 2023-08-03 to 2023-08-28)
    (2023, 8, 0.85, 26),
    # 2024 (matches IoT 2024-07-20 to 2024-08-15)
    (2024, 7, 0.50, 12), (2024, 8, 0.78, 15),
]
BLOOM_LOOKUP = {(y, m): (intensity, days) for y, m, intensity, days in BLOOM_MONTHS}

BASELINE_TOTAL_RESP = 420.0       # mean monthly respiratory ER admissions, all 3 hospitals combined
BASELINE_STD = 22.0
BLOOM_MEAN_MULTIPLIER = 1.54      # +54% per Kirkpatrick 2006
BLOOM_STD = 35.0
COASTAL_FRAC_BLOOM = 0.35
COASTAL_FRAC_BASELINE = 0.22
GI_RATIO = 0.41                   # Hoagland: 4.06 / 9.88

# Approximate bloom-day rri_mean (used as monthly summary for backfill in Phase 4)
NON_BLOOM_RRI_MEAN = 12.0
NON_BLOOM_RRI_STD = 5.0

# Carryover (lag) parameters — bloom-driven respiratory inflammation has a
# 4-12 week tail, so admissions stay elevated for ~1 month after RRI peak.
# This term is what gives Stage 3's `rri_lag7` (= prev-month RRI) a positive
# coefficient and recovers the Kirkpatrick prior shape.
LAG_RRI_THRESHOLD = 30.0          # carryover only kicks in above this RRI
LAG_ADMISSIONS_PER_RRI_POINT = 3.4  # 1 RRI-point above threshold -> +3.4 zone-monthly admissions
                                    # (calibrated so RRI=85 prev month produces ~54% surge,
                                    # matching the Kirkpatrick 2006 prior; verified by Stage 3
                                    # diagnostic which lands within +/-5%)


def main() -> int:
    rng = np.random.default_rng(SEED)
    months = pd.date_range("2015-01-01", "2024-12-31", freq="MS")
    print(f"Generating hospital mock for {len(months)} months x {len(HOSPITALS)} hospitals")

    # First pass: compute the zone-monthly RRI sequence so we have prev_rri available
    zone_rri: dict[tuple[int, int], float] = {}
    for ts in months:
        ym = (ts.year, ts.month)
        if ym in BLOOM_LOOKUP:
            intensity, _ = BLOOM_LOOKUP[ym]
            zone_rri[ym] = float(np.clip(45 + 50 * intensity + rng.normal(0, 6), 0, 100))
        else:
            zone_rri[ym] = float(np.clip(rng.normal(NON_BLOOM_RRI_MEAN, NON_BLOOM_RRI_STD), 0, 35))

    weight_sum = sum(h["weight"] for h in HOSPITALS)
    rows = []
    for ts in months:
        ym = (ts.year, ts.month)
        is_bloom = ym in BLOOM_LOOKUP
        intensity, days = BLOOM_LOOKUP.get(ym, (0.0, 0))
        rri_month = zone_rri[ym]

        # Previous month's RRI drives the carryover (lag) admissions term
        prev_ts = ts - pd.DateOffset(months=1)
        prev_ym = (prev_ts.year, prev_ts.month)
        prev_rri = zone_rri.get(prev_ym, NON_BLOOM_RRI_MEAN)
        lag_uplift = max(0.0, prev_rri - LAG_RRI_THRESHOLD) * LAG_ADMISSIONS_PER_RRI_POINT

        # Same-month bloom uplift (Kirkpatrick prior) + carryover from last month's RRI
        if is_bloom:
            mu = BASELINE_TOTAL_RESP * (1 + (BLOOM_MEAN_MULTIPLIER - 1) * intensity)
        else:
            mu = BASELINE_TOTAL_RESP
        zone_total = max(0.0, rng.normal(mu, BLOOM_STD if is_bloom else BASELINE_STD) + lag_uplift)

        for h in HOSPITALS:
            share = h["weight"] / weight_sum
            resp = int(round(zone_total * share + rng.normal(0, 4)))
            resp = max(0, resp)
            coastal_frac = COASTAL_FRAC_BLOOM if is_bloom else COASTAL_FRAC_BASELINE
            coastal = int(round(resp * coastal_frac + rng.normal(0, 2)))
            coastal = max(0, min(coastal, resp))
            gi = int(round(resp * GI_RATIO + rng.normal(0, 3)))
            gi = max(0, gi)

            rows.append({
                "year_month": ts.strftime("%Y-%m"),
                "hospital_id": h["id"],
                "respiratory_admissions": resp,
                "gi_admissions": gi,
                "coastal_respiratory": coastal,
                "bloom_active": int(is_bloom),
                "bloom_intensity": round(intensity, 2),
                "bloom_days_in_month": int(days),
                "rri_mean_month": round(rri_month, 2),
                "asthma_patients_pct": h["asthma_pct"],
            })

    df = pd.DataFrame(rows)
    df.to_csv(OUT_PATH, index=False)
    print(f"Wrote {OUT_PATH} -- {len(df)} rows")
    print()
    print("Sanity: monthly totals (mean per group)")
    summary = df.groupby("bloom_active")["respiratory_admissions"].agg(["mean", "std", "count"])
    print(summary.round(1))
    print()
    print(f"Same-month bloom uplift: "
          f"{summary.loc[1,'mean']/summary.loc[0,'mean']:.2f}x "
          f"(target ~1.54x weighted by intensity)")

    # Diagnostic: post-bloom carryover effect by inspecting Aug -> Sep transitions
    df_sorted = df.sort_values(["hospital_id", "year_month"]).copy()
    df_sorted["prev_rri"] = df_sorted.groupby("hospital_id")["rri_mean_month"].shift(1)
    high_lag = df_sorted[df_sorted["prev_rri"] > 60]
    low_lag = df_sorted[df_sorted["prev_rri"] <= 30]
    print(f"Months following high RRI (>60): mean admissions = {high_lag['respiratory_admissions'].mean():.1f} "
          f"(n={len(high_lag)})")
    print(f"Months following low  RRI (<=30): mean admissions = {low_lag['respiratory_admissions'].mean():.1f} "
          f"(n={len(low_lag)})")
    print(f"Implied carryover lift: {high_lag['respiratory_admissions'].mean()/low_lag['respiratory_admissions'].mean():.2f}x")
    return 0


if __name__ == "__main__":
    sys.exit(main())
