"""Seed Supabase with demo rows so the frontends have something to render
without waiting for the full ML pipeline.

Inserts:
  rri_scores                 — last 30 days, plausible Mediterranean values
  hospital_surge_forecasts   — next 7 days × 3 hospitals
  trigger_events             — one fired event today
  sensor_readings            — last 30 days × 5 sensors at 6h cadence

Idempotent: deletes anything in the demo-tagged window before inserting."""

from __future__ import annotations

import math
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")

from supabase import create_client  # noqa: E402

URL = os.getenv("SUPABASE_URL")
KEY = os.getenv("SUPABASE_SERVICE_KEY")
if not URL or not KEY:
    raise SystemExit("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")

sb = create_client(URL, KEY)

ZONE_NAME = "Genoa Ligurian Coast"
HOSPITALS = [
    {"id": "OSP_SAN_MARTINO",  "daily_cost": 22000},
    {"id": "OSP_GALLIERA",     "daily_cost": 16000},
    {"id": "OSP_VILLA_SCASSI", "daily_cost": 12000},
]
SENSORS = ["LIG_001", "LIG_002", "LIG_003", "LIG_004", "LIG_005"]
INSURER_ID = "DEMO_INSURER"

random.seed(42)


def severity_for(rri: float) -> str:
    if rri > 85: return "CRITICAL"
    if rri > 60: return "RED"
    if rri > 30: return "AMBER"
    return "GREEN"


def fetch_zone_id() -> str:
    resp = sb.table("coastal_zones").select("id, name").eq("name", ZONE_NAME).limit(1).execute()
    if not resp.data:
        raise SystemExit(f"coastal_zones row '{ZONE_NAME}' missing — apply migration 0001 first.")
    return resp.data[0]["id"]


def seed_rri(zone_id: str) -> list[dict]:
    today = datetime.now(timezone.utc).date()
    rows = []
    consecutive = 0
    for i in range(30):
        date = today - timedelta(days=29 - i)
        phase = (i - 12) / 8
        bloom_p = max(0.05, min(0.92, 0.4 * math.tanh(phase) + 0.45))
        wind = 4 + 5 * max(0, math.sin(phase * 1.2))
        wave = 0.5 + 0.9 * max(0, math.sin(phase * 1.2))
        chl_rate = 0.3 * math.cos(phase * 0.8)
        rri = round(min(100, max(0, 60 * bloom_p + 25 * (wave / 2) + 10 * (1 if chl_rate < 0 else 0))), 1)
        if bloom_p > 0.5:
            consecutive += 1
        else:
            consecutive = 0
        rows.append({
            "zone_id": zone_id,
            "date": date.isoformat(),
            "rri_score": rri,
            "severity": severity_for(rri),
            "bloom_probability": round(bloom_p, 3),
            "wind_speed": round(wind, 2),
            "wave_height": round(wave, 2),
            "chl_a_mean": round(2 + 8 * bloom_p, 2),
            "rri_consecutive_days": consecutive,
        })
    sb.table("rri_scores").delete().eq("zone_id", zone_id).execute()
    sb.table("rri_scores").insert(rows).execute()
    print(f"  rri_scores: inserted {len(rows)} rows  (latest RRI={rows[-1]['rri_score']}, severity={rows[-1]['severity']})")
    return rows


def seed_surge_forecasts(zone_id: str) -> None:
    today = datetime.now(timezone.utc).date()
    rows = []
    for h in HOSPITALS:
        baseline = 14
        for i in range(7):
            date = today + timedelta(days=i)
            additional = max(0, 30 - 4 * i)
            total = baseline + additional
            tier = "HIGH SURGE" if additional >= 120 else "MODERATE SURGE" if additional >= 50 else "LOW SURGE"
            rows.append({
                "hospital_id": h["id"],
                "zone_id": zone_id,
                "forecast_date": date.isoformat(),
                "expected_admissions": int(total),
                "additional_vs_baseline": int(additional),
                "severity_tier": tier,
                "extra_nursing_shifts": int(additional / 8),
                "medication_stock_eur": int(additional * 850),
                "ci_low": int(total - 6),
                "ci_high": int(total + 8),
            })
    for h in HOSPITALS:
        sb.table("hospital_surge_forecasts").delete().eq("hospital_id", h["id"]).execute()
    sb.table("hospital_surge_forecasts").insert(rows).execute()
    print(f"  hospital_surge_forecasts: inserted {len(rows)} rows ({len(HOSPITALS)} hospitals × 7 days)")


def seed_trigger_events(zone_id: str) -> None:
    now = datetime.now(timezone.utc)
    cert_id = f"TA-DEMO-OSP_SAN_MARTINO-{now:%Y%m%d%H%M}"
    sb.table("trigger_events").delete().like("event_certificate_id", "TA-DEMO-%").execute()
    row = {
        "event_certificate_id": cert_id,
        "zone_id": zone_id,
        "hospital_id": "OSP_SAN_MARTINO",
        "insurer_id": INSURER_ID,
        "triggered_at": now.isoformat(),
        "trigger_fired": True,
        "rri_condition_met": True,
        "iot_condition_met": True,
        "rri_score": 87.4,
        "rri_days_above_threshold": 7,
        "iot_dissolved_oxygen": 4.6,
        "iot_ph": 7.91,
        "payout_tier": "CRITICAL",
        "payout_pct": 1.0,
        "calculated_payout_eur": 154000.0,
        "bloom_duration_days": 8,
        "status": "PENDING",
    }
    sb.table("trigger_events").insert(row).execute()
    print(f"  trigger_events: inserted demo {row['event_certificate_id']}")


def seed_sensor_readings(zone_id: str) -> None:
    now = datetime.now(timezone.utc)
    rows = []
    for sensor in SENSORS:
        for i in range(120):  # 30 days × 4 readings/day
            ts = now - timedelta(hours=6 * (119 - i))
            phase = i / 60
            blooming = phase > 1.5
            rows.append({
                "sensor_id": sensor,
                "zone_id": zone_id,
                "timestamp": ts.isoformat(),
                "temperature_c": round(22 + 3 * math.sin(phase / 4) + random.uniform(-0.5, 0.5), 2),
                "ph": round((7.85 if blooming else 8.15) + random.uniform(-0.05, 0.05), 3),
                "humidity_pct": round(72 + random.uniform(-4, 4), 1),
                "conductivity_ms_cm": round(47.5 + random.uniform(-1, 1), 2),
                "dissolved_oxygen_mg_l": round((4.6 if blooming else 7.5) + random.uniform(-0.4, 0.4), 2),
                "nitrate_umol_l": round((2.1 if blooming else 1.5) + random.uniform(-0.3, 0.3), 2),
                "phosphate_umol_l": round((0.12 if blooming else 0.08) + random.uniform(-0.02, 0.02), 3),
            })
    for sensor in SENSORS:
        sb.table("sensor_readings").delete().eq("sensor_id", sensor).execute()
    sb.table("sensor_readings").insert(rows).execute()
    print(f"  sensor_readings: inserted {len(rows)} rows ({len(SENSORS)} sensors × 120 timestamps)")


def main() -> int:
    print("=" * 64)
    print("Seeding Supabase demo data")
    print("=" * 64)
    zone_id = fetch_zone_id()
    print(f"zone_id = {zone_id}")
    seed_rri(zone_id)
    seed_surge_forecasts(zone_id)
    seed_sensor_readings(zone_id)
    seed_trigger_events(zone_id)
    print("\nDone. Refresh the frontends to see the data.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
