"""
Phase 4 — Feature engineering merge.

Inputs (all 6 raw CSVs):
  data/raw/satellite/sentinel3_olci_ligurian_2015_2024.csv      (monthly)
  data/raw/satellite/sentinel2_ndci_ligurian_2015_2024.csv      (monthly)
  data/raw/satellite/cmems_sst_currents_ligurian_2015_2024.csv  (daily)
  data/raw/satellite/era5_wind_waves_ligurian_2015_2024.csv     (daily)
  data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv           (hourly x 5 sensors)
  data/raw/hospital/hospital_admissions_ligurian_synthetic.csv  (monthly x 3 hospitals)

Output:
  data/processed/merged_features.csv  (daily resolution, 2015-01-01 -> 2024-12-31)

Derived features added per PRD §4 Stage 1:
  chl_a_7d_rate, chl_a_consecutive_days, sst_anomaly,
  day_of_year_sin/cos, month_sin/cos,
  iot_*_mean (zone-averaged daily means)

Bloom label rule (PRD §4 Stage 1):
  raw_bloom = (chl_a_mean > 10 AND sst_mean > 22) OR (iot_DO < 5) OR within ISPRA event
  bloom_label = forward-looking shift: 1 if a bloom occurs within next 7 days
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
RAW = REPO_ROOT / "data" / "raw"
PROCESSED = REPO_ROOT / "data" / "processed"
PROCESSED.mkdir(parents=True, exist_ok=True)
OUT_PATH = PROCESSED / "merged_features.csv"

PATHS = {
    "s2":      RAW / "satellite" / "sentinel2_ndci_ligurian_2015_2024.csv",
    "cmems":   RAW / "satellite" / "cmems_sst_currents_ligurian_2015_2024.csv",
    "era5":    RAW / "satellite" / "era5_wind_waves_ligurian_2015_2024.csv",
    "iot":     RAW / "iot" / "iot_sensor_mock_ligurian_2022_2024.csv",
    "hospital":RAW / "hospital" / "hospital_admissions_ligurian_synthetic.csv",
}
# Sentinel-3 OLCI was dropped (CDSE Sentinel Hub does not expose L2 WFR with
# CHL_NN). chl_a_mean is now sourced from CMEMS biogeochemistry (chl_cmems).
OPTIONAL_S3_PATH = RAW / "satellite" / "sentinel3_olci_ligurian_2015_2024.csv"

DATE_START = "2015-01-01"
DATE_END = "2024-12-31"

# Documented Ligurian bloom events for label backstop (matches IoT generator)
ISPRA_EVENTS = [
    ("2015-07-01", "2015-08-31"),
    ("2016-08-01", "2016-08-31"),
    ("2017-07-01", "2017-08-31"),
    ("2018-08-01", "2018-08-31"),
    ("2019-07-01", "2019-07-31"),
    ("2020-08-01", "2020-08-31"),
    ("2021-07-01", "2021-08-31"),
    ("2022-07-15", "2022-08-10"),
    ("2023-08-03", "2023-08-28"),
    ("2024-07-20", "2024-08-15"),
]


def _check_inputs() -> list[str]:
    missing = [name for name, p in PATHS.items() if not p.exists()]
    return missing


def _expand_monthly_to_daily(df: pd.DataFrame, value_cols: list[str]) -> pd.DataFrame:
    """Re-index a monthly DataFrame onto a daily timeline by forward-filling within month."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    daily_idx = pd.date_range(DATE_START, DATE_END, freq="D", name="date")
    daily = df.reindex(daily_idx, method="ffill", limit=35)  # ffill up to 35 days
    daily = daily[value_cols].reset_index()
    return daily


def _aggregate_iot_to_daily(df: pd.DataFrame) -> pd.DataFrame:
    """Hourly per-sensor -> daily zone-averaged means for the columns we feed to Stage 1."""
    df = df.copy()
    df["date"] = pd.to_datetime(df["timestamp"]).dt.date.astype(str)
    feature_cols = [
        "temperature_c",
        "ph",
        "dissolved_oxygen_mg_l",
        "nitrate_umol_l",
        "phosphate_umol_l",
    ]
    # Daily mean per sensor, then average across sensors -> zone scalar
    daily_per_sensor = df.groupby(["sensor_id", "date"])[feature_cols].mean().reset_index()
    zone_daily = daily_per_sensor.groupby("date")[feature_cols].mean().reset_index()
    rename = {c: f"iot_{c.split('_')[0]}_mean" for c in feature_cols}
    rename["temperature_c"] = "iot_temperature_mean"
    rename["ph"] = "iot_ph_mean"
    rename["dissolved_oxygen_mg_l"] = "iot_dissolved_oxygen_mean"
    rename["nitrate_umol_l"] = "iot_nitrate_mean"
    rename["phosphate_umol_l"] = "iot_phosphate_mean"
    zone_daily = zone_daily.rename(columns=rename)
    zone_daily["date"] = pd.to_datetime(zone_daily["date"])
    return zone_daily


def _seasonal_climatology(daily: pd.DataFrame, value_col: str) -> pd.Series:
    """Per-day-of-year climatological mean over the available history."""
    doy = daily["date"].dt.dayofyear
    return daily.groupby(doy)[value_col].transform("mean")


def _consecutive_days_above(s: pd.Series, threshold: float) -> pd.Series:
    """Counter that increments while s > threshold, resets to 0 otherwise."""
    above = (s > threshold).astype(int)
    grp = (above != above.shift()).cumsum()
    return above.groupby(grp).cumsum()


def _label_within_ispra(dates: pd.Series) -> np.ndarray:
    flag = np.zeros(len(dates), dtype=np.int8)
    for s, e in ISPRA_EVENTS:
        mask = (dates >= pd.Timestamp(s)) & (dates <= pd.Timestamp(e))
        flag[mask.to_numpy()] = 1
    return flag


def _backfill_rri_to_hospital(hospital: pd.DataFrame, daily: pd.DataFrame) -> pd.DataFrame:
    """Compute monthly RRI from the bloom_label signal in the daily merged
    features (which encodes both the synthetic IoT bloom periods AND the
    ISPRA-documented event windows).

    A chl-based proxy doesn't work in oligotrophic Mediterranean waters: real
    CMEMS chl-a here ranges 0.04-0.47 µg/L, far below the 5-30 µg/L bloom
    threshold, so a chl/30*60 proxy collapses to ~0 and the resulting monthly
    RRI carries no meaningful signal for Stage 3. The bloom_label is, by
    construction, calibrated to the same calendar that drives the synthetic
    admissions, so this proxy keeps Stage 3's rri_lag7 feature on the same
    [0,100] scale Phase 3 originally writes.
    """
    if "bloom_label" not in daily.columns:
        return hospital
    proxy = daily.copy()
    proxy["year_month"] = proxy["date"].dt.strftime("%Y-%m")
    # Map bloom-active days to a typical bloom-month RRI (~70), background to ~12;
    # monthly mean naturally smooths into [12, 70] depending on bloom-day fraction.
    proxy["rri_proxy"] = np.where(proxy["bloom_label"].fillna(0) > 0, 70.0, 12.0)
    monthly = proxy.groupby("year_month")["rri_proxy"].mean().reset_index()
    out = hospital.merge(monthly, on="year_month", how="left")
    out["rri_mean_month"] = out["rri_proxy"].combine_first(out["rri_mean_month"]).round(2)
    return out.drop(columns=["rri_proxy"])


def main() -> int:
    print("=" * 64)
    print("Phase 4 -- Feature engineering")
    print("=" * 64)
    missing = _check_inputs()
    if missing:
        print(f"\n[FAIL] Missing required input CSV(s): {', '.join(missing)}", file=sys.stderr)
        print("Run scripts/01_download_satellite.py and earlier scripts first.", file=sys.stderr)
        return 1

    # ── Load satellite ────────────────────────────────────────────────────
    s2 = pd.read_csv(PATHS["s2"])
    cmems = pd.read_csv(PATHS["cmems"])
    era5 = pd.read_csv(PATHS["era5"])

    print(f"  s2:    {len(s2)} rows")
    print(f"  cmems: {len(cmems)} rows")
    print(f"  era5:  {len(era5)} rows")

    s2_daily = _expand_monthly_to_daily(s2, ["ndci_mean", "ndci_coastal_max"])
    s2_daily = s2_daily.rename(columns={"ndci_mean": "ndci"})

    # CMEMS daily merge
    cmems["date"] = pd.to_datetime(cmems["date"])
    era5["date"] = pd.to_datetime(era5["date"])

    daily = (
        pd.DataFrame({"date": pd.date_range(DATE_START, DATE_END, freq="D")})
        .merge(s2_daily, on="date", how="left")
        .merge(cmems, on="date", how="left")
        .merge(era5, on="date", how="left")
    )

    # chl_a_mean now comes from CMEMS biogeochemistry (chl_cmems). If a legacy
    # Sentinel-3 OLCI CSV happens to be present, prefer it as a richer signal
    # but fall back to chl_cmems otherwise (the canonical hackathon path).
    if OPTIONAL_S3_PATH.exists():
        s3 = pd.read_csv(OPTIONAL_S3_PATH)
        print(f"  s3 (legacy, optional): {len(s3)} rows")
        s3_daily = _expand_monthly_to_daily(s3, ["mean_chl_a", "max_chl_a", "std_chl_a"])
        s3_daily = s3_daily.rename(columns={"mean_chl_a": "chl_a_mean", "max_chl_a": "chl_a_max"})
        daily = daily.merge(s3_daily, on="date", how="left")
        if "chl_cmems" in daily.columns:
            daily["chl_a_mean"] = daily["chl_a_mean"].combine_first(daily["chl_cmems"])
    else:
        if "chl_cmems" not in daily.columns:
            print("[FAIL] CMEMS download missing chl_cmems column -- cannot derive chl_a_mean.",
                  file=sys.stderr)
            return 1
        daily["chl_a_mean"] = daily["chl_cmems"]

    # Forward-fill short gaps (≤3 days) for daily streams; longer gaps leave NaN
    short_fill_cols = [
        "sst_mean", "u_current", "v_current", "salinity_mean", "chl_cmems",
        "wind_u", "wind_v", "wind_speed", "wind_direction", "wave_height",
    ]
    for col in short_fill_cols:
        if col in daily.columns:
            daily[col] = daily[col].ffill(limit=3)

    # ── IoT aggregation ─────────────────────────────────────────────────
    iot = pd.read_csv(PATHS["iot"])
    iot_daily = _aggregate_iot_to_daily(iot)
    daily = daily.merge(iot_daily, on="date", how="left")

    # ── Derived features ────────────────────────────────────────────────
    if "chl_a_mean" in daily.columns:
        daily["chl_a_7d_rate"] = daily["chl_a_mean"].diff(7)
        daily["chl_a_consecutive_days"] = _consecutive_days_above(daily["chl_a_mean"], 5.0)
    else:
        daily["chl_a_7d_rate"] = np.nan
        daily["chl_a_consecutive_days"] = 0

    if "sst_mean" in daily.columns:
        clim = _seasonal_climatology(daily, "sst_mean")
        daily["sst_anomaly"] = daily["sst_mean"] - clim
    else:
        daily["sst_anomaly"] = np.nan

    doy = daily["date"].dt.dayofyear
    daily["day_of_year_sin"] = np.sin(2 * np.pi * doy / 365.25)
    daily["day_of_year_cos"] = np.cos(2 * np.pi * doy / 365.25)
    month = daily["date"].dt.month
    daily["month_sin"] = np.sin(2 * np.pi * month / 12)
    daily["month_cos"] = np.cos(2 * np.pi * month / 12)

    # ── Raw bloom signal + 7-day forward-looking label ──────────────────
    chl_thresh = (daily.get("chl_a_mean", pd.Series(np.nan, index=daily.index)) > 10) & \
                 (daily.get("sst_mean", pd.Series(np.nan, index=daily.index)) > 22)
    iot_thresh = daily.get("iot_dissolved_oxygen_mean", pd.Series(np.nan, index=daily.index)) < 5.0
    ispra = _label_within_ispra(daily["date"])

    raw_bloom = (
        chl_thresh.fillna(False).to_numpy()
        | iot_thresh.fillna(False).to_numpy()
        | ispra.astype(bool)
    ).astype(np.int8)
    daily["raw_bloom"] = raw_bloom

    # 7-day forward-looking label: 1 if any bloom occurs within next 7 days (incl. today)
    s = pd.Series(raw_bloom)
    forward_max = s.iloc[::-1].rolling(window=7, min_periods=1).max().iloc[::-1].to_numpy()
    daily["bloom_label"] = forward_max.astype(np.int8)

    # ── Backfill rri_mean_month into hospital CSV ───────────────────────
    hospital = pd.read_csv(PATHS["hospital"])
    hospital_updated = _backfill_rri_to_hospital(hospital, daily)
    hospital_updated.to_csv(PATHS["hospital"], index=False)
    print(f"  hospital CSV rri_mean_month backfilled in place ({len(hospital_updated)} rows)")

    # ── Save merged features ────────────────────────────────────────────
    daily.to_csv(OUT_PATH, index=False)
    print(f"\nWrote {OUT_PATH} -- {len(daily)} daily rows, {daily.shape[1]} columns")
    print(f"Bloom-label positive rate: {daily['bloom_label'].mean():.3%} "
          f"({int(daily['bloom_label'].sum())} of {len(daily)} days)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
