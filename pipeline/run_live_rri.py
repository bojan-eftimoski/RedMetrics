"""
Phase 10 -- Live inference pipeline.

Reads the latest day from data/processed/merged_features.csv, runs Stages 1-4,
and persists results to Supabase (rri_scores, sensor_readings,
hospital_surge_forecasts, trigger_events).

  scripts/04_feature_engineering.py  -> merged_features.csv (latest row)
                |
                v
  Stage 1 (LightGBM)        bloom_probability
  Stage 2 (physics)         rri_score, severity
                |  rri_consecutive_days from prior rri_scores rows in Supabase
                v
  Stage 3 (Ridge)           per-hospital surge forecast
  Stage 4 (parametric)      trigger_eval (+ payout when fired)

Usage:
    python -m pipeline.run_live_rri
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))
load_dotenv(REPO_ROOT / ".env")

from models.stage1_bloom_probability.features import FEATURES as STAGE1_FEATURES  # noqa: E402
from models.stage1_bloom_probability.predict import predict_bloom_probability  # noqa: E402
from models.stage2_aerosolisation_rri.calculate import (  # noqa: E402
    LIGURIAN_SHORE_NORMAL,
    calculate_rri,
)
from models.stage2_aerosolisation_rri.severity import rri_to_severity  # noqa: E402
from models.stage3_hospital_surge.features import FEATURES_SURGE  # noqa: E402
from models.stage3_hospital_surge.predict import surge_output  # noqa: E402
from models.stage4_insurance_loss.payout import calculate_payout  # noqa: E402
from models.stage4_insurance_loss.trigger import (  # noqa: E402
    RRI_SCORE_THRESHOLD,
    evaluate_parametric_trigger,
)

MERGED_PATH = REPO_ROOT / "data" / "processed" / "merged_features.csv"
HOSPITAL_PATH = REPO_ROOT / "data" / "raw" / "hospital" / "hospital_admissions_ligurian_synthetic.csv"
IOT_PATH = REPO_ROOT / "data" / "raw" / "iot" / "iot_sensor_mock_ligurian_2022_2024.csv"

INSURER_ID = "INSURER_DEMO_LIGURIA"

HOSPITAL_DAILY_COST_EUR: dict[str, float] = {
    "OSP_SAN_MARTINO":  22000.0,
    "OSP_GALLIERA":     16000.0,
    "OSP_VILLA_SCASSI": 12000.0,
}


def _supabase_client():
    from supabase import create_client  # local import keeps top-level fast

    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not service_key:
        raise RuntimeError("SUPABASE_URL / SUPABASE_SERVICE_KEY missing in .env")
    return create_client(url, service_key)


def _resolve_zone_id(supabase) -> str:
    resp = supabase.table("coastal_zones").select("id").eq("name", "Genoa Ligurian Coast").limit(1).execute()
    if not resp.data:
        raise RuntimeError("coastal_zones row 'Genoa Ligurian Coast' not found -- run migrations first.")
    return resp.data[0]["id"]


def _latest_row() -> tuple[pd.Timestamp, pd.Series]:
    if not MERGED_PATH.exists():
        raise FileNotFoundError(f"{MERGED_PATH} missing -- run scripts/04_feature_engineering.py first.")
    df = pd.read_csv(MERGED_PATH, parse_dates=["date"])
    df = df.dropna(subset=STAGE1_FEATURES).sort_values("date")
    if df.empty:
        raise RuntimeError("merged_features.csv has no rows with all Stage 1 features populated.")
    last = df.iloc[-1]
    return pd.Timestamp(last["date"]), last


def _consecutive_rri_days(supabase, zone_id: str, target_date: pd.Timestamp, threshold: float) -> int:
    """Count consecutive prior days with rri_score > threshold ending at target_date.

    Streak terminates at the first day where the row is missing or below threshold.
    """
    start = (target_date - pd.Timedelta(days=30)).date().isoformat()
    end = target_date.date().isoformat()
    resp = (
        supabase.table("rri_scores")
        .select("date,rri_score")
        .eq("zone_id", zone_id)
        .gte("date", start)
        .lt("date", end)
        .order("date", desc=True)
        .execute()
    )
    streak = 0
    cursor = (target_date - pd.Timedelta(days=1)).date()
    rows_by_date = {pd.Timestamp(r["date"]).date(): r for r in resp.data or []}
    while True:
        row = rows_by_date.get(cursor)
        if row is None or row["rri_score"] is None or row["rri_score"] <= threshold:
            break
        streak += 1
        cursor = cursor - pd.Timedelta(days=1).to_pytimedelta()
    return streak


def _rri_lag7_for_hospital(target_date: pd.Timestamp) -> float:
    """Use the rri_mean_month from the previous month (in hospital CSV) as Stage 3 lag feature."""
    if not HOSPITAL_PATH.exists():
        return 0.0
    h = pd.read_csv(HOSPITAL_PATH)
    h["dt"] = pd.to_datetime(h["year_month"], format="%Y-%m")
    prev = (target_date - pd.offsets.MonthBegin(1)).to_period("M").to_timestamp()
    candidates = h[h["dt"] == prev]
    if candidates.empty or "rri_mean_month" not in candidates.columns:
        return 0.0
    return float(candidates["rri_mean_month"].mean())


def _bloom_duration_days(supabase, zone_id: str, target_date: pd.Timestamp) -> int:
    """Consecutive prior days with severity in (RED, CRITICAL)."""
    start = (target_date - pd.Timedelta(days=30)).date().isoformat()
    end = target_date.date().isoformat()
    resp = (
        supabase.table("rri_scores")
        .select("date,severity")
        .eq("zone_id", zone_id)
        .gte("date", start)
        .lt("date", end)
        .order("date", desc=True)
        .execute()
    )
    streak = 0
    cursor = (target_date - pd.Timedelta(days=1)).date()
    rows_by_date = {pd.Timestamp(r["date"]).date(): r for r in resp.data or []}
    while True:
        row = rows_by_date.get(cursor)
        if row is None or row["severity"] not in ("RED", "CRITICAL"):
            break
        streak += 1
        cursor = cursor - pd.Timedelta(days=1).to_pytimedelta()
    return streak


def _latest_iot_per_sensor(target_date: pd.Timestamp) -> list[dict[str, Any]]:
    if not IOT_PATH.exists():
        return []
    iot = pd.read_csv(IOT_PATH, parse_dates=["timestamp"])
    same_day = iot[iot["timestamp"].dt.date == target_date.date()]
    if same_day.empty:
        same_day = iot.sort_values("timestamp").groupby("sensor_id").tail(24)
    latest = same_day.sort_values("timestamp").groupby("sensor_id").tail(1)
    return latest.to_dict("records")


def main() -> int:
    print("=" * 64)
    print("Phase 10 -- Live RRI inference pipeline")
    print("=" * 64)

    target_date, row = _latest_row()
    print(f"Target date: {target_date.date()}")

    supabase = _supabase_client()
    zone_id = _resolve_zone_id(supabase)
    print(f"Zone: Genoa Ligurian Coast  ({zone_id})")

    # ── Stage 1 ────────────────────────────────────────────────────────
    s1_inputs = {k: float(row[k]) for k in STAGE1_FEATURES}
    bloom_probability = predict_bloom_probability(s1_inputs)
    print(f"Stage 1 bloom_probability = {bloom_probability:.4f}")

    # ── Stage 2 ────────────────────────────────────────────────────────
    rri_score = calculate_rri(
        bloom_probability=bloom_probability,
        wind_speed=float(row.get("wind_speed", 0.0)),
        wind_direction=float(row.get("wind_direction", 0.0)),
        shore_normal_degrees=LIGURIAN_SHORE_NORMAL,
        wave_height=float(row.get("wave_height", 0.0)),
        chl_a_rate_of_change=float(row.get("chl_a_7d_rate", 0.0)),
    )
    severity = rri_to_severity(rri_score)
    rri_consecutive_days = _consecutive_rri_days(supabase, zone_id, target_date, RRI_SCORE_THRESHOLD)
    bloom_duration_days = _bloom_duration_days(supabase, zone_id, target_date)
    print(f"Stage 2 rri_score = {rri_score:.1f}  severity = {severity}  "
          f"consecutive>{int(RRI_SCORE_THRESHOLD)} = {rri_consecutive_days}d  "
          f"bloom_duration = {bloom_duration_days}d")

    # ── Persist rri_scores ─────────────────────────────────────────────
    rri_payload = {
        "zone_id": zone_id,
        "date": target_date.date().isoformat(),
        "rri_score": rri_score,
        "severity": severity,
        "bloom_probability": bloom_probability,
        "wind_speed": float(row.get("wind_speed", 0.0)),
        "wave_height": float(row.get("wave_height", 0.0)),
        "chl_a_mean": float(row.get("chl_a_mean", 0.0)),
        "rri_consecutive_days": int(rri_consecutive_days),
    }
    supabase.table("rri_scores").insert(rri_payload).execute()

    # ── Persist latest IoT readings ────────────────────────────────────
    iot_rows = _latest_iot_per_sensor(target_date)
    if iot_rows:
        sensor_payload = [
            {
                "sensor_id": r["sensor_id"],
                "zone_id": zone_id,
                "timestamp": pd.Timestamp(r["timestamp"]).tz_localize("UTC").isoformat()
                              if pd.Timestamp(r["timestamp"]).tzinfo is None
                              else pd.Timestamp(r["timestamp"]).isoformat(),
                "temperature_c": float(r.get("temperature_c", 0.0)),
                "ph": float(r.get("ph", 0.0)),
                "humidity_pct": float(r.get("humidity_pct", 0.0)),
                "conductivity_ms_cm": float(r.get("conductivity_ms_cm", 0.0)),
                "dissolved_oxygen_mg_l": float(r.get("dissolved_oxygen_mg_l", 0.0)),
                "nitrate_umol_l": float(r.get("nitrate_umol_l", 0.0)),
                "phosphate_umol_l": float(r.get("phosphate_umol_l", 0.0)),
            }
            for r in iot_rows
        ]
        supabase.table("sensor_readings").insert(sensor_payload).execute()
        print(f"Persisted {len(sensor_payload)} sensor_readings rows")

    # Stage 3 / Stage 4 inputs that are shared across hospitals
    rri_lag7 = _rri_lag7_for_hospital(target_date)
    s3_features_common = {
        "rri_lag7": rri_lag7,
        "coastal_population": 180000.0,
        "asthma_prevalence_pct": 6.5,
        "bloom_duration_days": float(bloom_duration_days),
        "month_sin": float(row.get("month_sin", 0.0)),
        "month_cos": float(row.get("month_cos", 0.0)),
    }

    # ── Stage 3 + Stage 4 per hospital ─────────────────────────────────
    triggers_fired = 0
    for hospital_id, daily_cost in HOSPITAL_DAILY_COST_EUR.items():
        surge = surge_output(features_today=s3_features_common)
        supabase.table("hospital_surge_forecasts").insert({
            "hospital_id": hospital_id,
            "zone_id": zone_id,
            "forecast_date": target_date.date().isoformat(),
            "expected_admissions": surge["expected_total_admissions"],
            "additional_vs_baseline": surge["expected_additional_vs_baseline"],
            "severity_tier": surge["severity_tier"],
            "extra_nursing_shifts": surge["recommended_extra_nursing_shifts"],
            "medication_stock_eur": surge["recommended_medication_stock_eur"],
            "ci_low": surge["confidence_interval_low"],
            "ci_high": surge["confidence_interval_high"],
        }).execute()
        print(f"  {hospital_id}: surge tier={surge['severity_tier']}  "
              f"+{surge['expected_additional_vs_baseline']} admissions")

        trig = evaluate_parametric_trigger(
            rri_score=rri_score,
            rri_consecutive_days=rri_consecutive_days,
            iot_dissolved_oxygen=float(row.get("iot_dissolved_oxygen_mean", 8.0)),
            iot_ph=float(row.get("iot_ph_mean", 8.15)),
        )
        if not trig["trigger_fired"]:
            continue

        payout = calculate_payout(
            rri_score=rri_score,
            bloom_duration_days=bloom_duration_days,
            hospital_id=hospital_id,
            insured_daily_operational_cost_eur=daily_cost,
            surge_additional_admissions=surge["expected_additional_vs_baseline"],
        )
        supabase.table("trigger_events").insert({
            "event_certificate_id": payout["event_certificate_id"],
            "zone_id": zone_id,
            "hospital_id": hospital_id,
            "insurer_id": INSURER_ID,
            "trigger_fired": True,
            "rri_condition_met": trig["rri_condition_met"],
            "iot_condition_met": trig["iot_condition_met"],
            "rri_score": trig["rri_score"],
            "rri_days_above_threshold": trig["rri_days_above_threshold"],
            "iot_dissolved_oxygen": trig["iot_dissolved_oxygen"],
            "iot_ph": trig["iot_ph"],
            "payout_tier": payout["payout_tier"],
            "payout_pct": payout["payout_pct_of_coverage"],
            "calculated_payout_eur": payout["calculated_payout_eur"],
            "bloom_duration_days": payout["bloom_duration_days"],
        }).execute()
        triggers_fired += 1
        print(f"  TRIGGER FIRED for {hospital_id}: {payout['payout_tier']} "
              f"-> EUR {payout['calculated_payout_eur']:.2f}  cert={payout['event_certificate_id']}")

    print()
    print(f"DONE  date={target_date.date()}  rri={rri_score:.1f}  severity={severity}  "
          f"triggers_fired={triggers_fired}/3")
    return 0


if __name__ == "__main__":
    sys.exit(main())
