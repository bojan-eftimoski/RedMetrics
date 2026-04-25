"""
Phase 2 — IoT sensor mock data generator.

Produces hourly readings for 5 virtual sensors along the Ligurian coast
(2022-01-01 → 2024-12-31) with seasonality, diurnal cycles, AR(1)
autocorrelation, Gaussian noise, and three embedded ISPRA-aligned bloom events.

Output: data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv
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
OUT_DIR = REPO_ROOT / "data" / "raw" / "iot"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "iot_sensor_mock_ligurian_2022_2024.csv"

START = "2022-01-01"
END = "2024-12-31"
SEED = 20260425

# 5 virtual sensors along the Genoa coast (lon 8.6→9.0, lat ~44.40)
SENSORS = [
    {"sensor_id": "LIG_001", "lat": 44.405, "lon": 8.700},
    {"sensor_id": "LIG_002", "lat": 44.410, "lon": 8.800},
    {"sensor_id": "LIG_003", "lat": 44.415, "lon": 8.900},
    {"sensor_id": "LIG_004", "lat": 44.418, "lon": 9.000},
    {"sensor_id": "LIG_005", "lat": 44.420, "lon": 9.100},
]

BLOOM_EVENTS = [
    {"start": "2022-07-15", "end": "2022-08-10", "sensor_ids": ["LIG_001", "LIG_002"]},
    {"start": "2023-08-03", "end": "2023-08-28", "sensor_ids": ["LIG_001", "LIG_002", "LIG_003"]},
    {"start": "2024-07-20", "end": "2024-08-15", "sensor_ids": ["LIG_002", "LIG_003", "LIG_004"]},
]

# Pre-bloom nutrient spike window (days before bloom_start)
PRE_BLOOM_DAYS = 7

BASELINE = {
    "temperature_c":          {"summer": 26.0, "winter": 13.0, "noise": 0.4, "diurnal": 1.8},
    "ph":                     {"bloom": 7.85,  "no_bloom": 8.15, "noise": 0.04},
    "humidity_pct":           {"mean": 72.0,   "noise": 8.0,    "diurnal": 6.0},
    "conductivity_ms_cm":     {"mean": 47.5,   "noise": 1.2},
    "dissolved_oxygen_mg_l":  {"bloom": 4.2,   "no_bloom": 7.8, "noise": 0.35, "diurnal": 0.6},
    "nitrate_umol_l":         {"baseline": 1.5, "pre_bloom": 8.5, "bloom": 2.1, "noise": 0.5},
    "phosphate_umol_l":       {"baseline": 0.08, "pre_bloom": 0.45, "bloom": 0.12, "noise": 0.04},
}


def _state_array(timestamps: pd.DatetimeIndex, sensor_id: str) -> dict[str, np.ndarray]:
    """For each timestamp, return arrays describing sensor state per row.

    state['phase']  ∈ {0=baseline, 1=pre_bloom, 2=bloom}
    state['bloom_label']  = 1 during phase 2, else 0
    """
    n = len(timestamps)
    phase = np.zeros(n, dtype=np.int8)
    bloom_label = np.zeros(n, dtype=np.int8)

    ts_date = timestamps.normalize()
    for ev in BLOOM_EVENTS:
        if sensor_id not in ev["sensor_ids"]:
            continue
        bloom_start = pd.Timestamp(ev["start"])
        bloom_end = pd.Timestamp(ev["end"])
        pre_start = bloom_start - pd.Timedelta(days=PRE_BLOOM_DAYS)

        in_bloom = np.asarray((ts_date >= bloom_start) & (ts_date <= bloom_end))
        in_pre = np.asarray((ts_date >= pre_start) & (ts_date < bloom_start))
        phase[in_pre] = np.maximum(phase[in_pre], 1)
        phase[in_bloom] = 2
        bloom_label[in_bloom] = 1

    return {"phase": phase, "bloom_label": bloom_label}


def _seasonal_temperature(timestamps: pd.DatetimeIndex) -> np.ndarray:
    """Seasonal temperature curve (peak July ~26 °C, trough January ~13 °C)."""
    summer, winter = BASELINE["temperature_c"]["summer"], BASELINE["temperature_c"]["winter"]
    mid = (summer + winter) / 2
    amp = (summer - winter) / 2
    doy = timestamps.dayofyear.to_numpy()
    return mid + amp * np.sin(2 * np.pi * (doy - 110) / 365.25)


def _diurnal(timestamps: pd.DatetimeIndex, amplitude: float) -> np.ndarray:
    """Diurnal cycle peaking at 14:00 local."""
    h = timestamps.hour.to_numpy()
    return amplitude * np.sin(2 * np.pi * (h - 8) / 24)


def _ar1(noise_std: float, n: int, rng: np.random.Generator, phi: float = 0.85) -> np.ndarray:
    """Generate AR(1) noise for hourly autocorrelation."""
    eps = rng.normal(0.0, noise_std * np.sqrt(1 - phi**2), n)
    out = np.empty(n)
    out[0] = rng.normal(0.0, noise_std)
    for i in range(1, n):
        out[i] = phi * out[i - 1] + eps[i]
    return out


def _generate_sensor(sensor: dict, timestamps: pd.DatetimeIndex, rng: np.random.Generator) -> pd.DataFrame:
    state = _state_array(timestamps, sensor["sensor_id"])
    phase = state["phase"]
    is_bloom = phase == 2
    is_pre = phase == 1

    n = len(timestamps)
    seas_temp = _seasonal_temperature(timestamps)

    # Temperature
    temp = (
        seas_temp
        + _diurnal(timestamps, BASELINE["temperature_c"]["diurnal"])
        + _ar1(BASELINE["temperature_c"]["noise"], n, rng)
    )

    # pH — bloom drops it
    ph_base = np.where(is_bloom, BASELINE["ph"]["bloom"], BASELINE["ph"]["no_bloom"])
    ph = ph_base + _ar1(BASELINE["ph"]["noise"], n, rng)

    # Humidity (air around sensor housing)
    humidity = (
        BASELINE["humidity_pct"]["mean"]
        + _diurnal(timestamps, -BASELINE["humidity_pct"]["diurnal"])  # inverse to temp
        + _ar1(BASELINE["humidity_pct"]["noise"], n, rng)
    ).clip(20, 100)

    # Conductivity
    conductivity = (
        BASELINE["conductivity_ms_cm"]["mean"]
        + _ar1(BASELINE["conductivity_ms_cm"]["noise"], n, rng)
    )

    # Dissolved oxygen — bloom causes hypoxia, has diurnal cycle (photosynthesis daytime)
    do_base = np.where(is_bloom, BASELINE["dissolved_oxygen_mg_l"]["bloom"],
                                  BASELINE["dissolved_oxygen_mg_l"]["no_bloom"])
    do = (
        do_base
        + _diurnal(timestamps, BASELINE["dissolved_oxygen_mg_l"]["diurnal"])
        + _ar1(BASELINE["dissolved_oxygen_mg_l"]["noise"], n, rng)
    ).clip(0.5, 14.0)

    # Nutrients — pre_bloom spike, drop during bloom
    nitrate_state = np.full(n, BASELINE["nitrate_umol_l"]["baseline"])
    nitrate_state = np.where(is_pre, BASELINE["nitrate_umol_l"]["pre_bloom"], nitrate_state)
    nitrate_state = np.where(is_bloom, BASELINE["nitrate_umol_l"]["bloom"], nitrate_state)
    nitrate = (nitrate_state + _ar1(BASELINE["nitrate_umol_l"]["noise"], n, rng)).clip(0.0, None)

    phos_state = np.full(n, BASELINE["phosphate_umol_l"]["baseline"])
    phos_state = np.where(is_pre, BASELINE["phosphate_umol_l"]["pre_bloom"], phos_state)
    phos_state = np.where(is_bloom, BASELINE["phosphate_umol_l"]["bloom"], phos_state)
    phosphate = (phos_state + _ar1(BASELINE["phosphate_umol_l"]["noise"], n, rng)).clip(0.0, None)

    return pd.DataFrame(
        {
            "timestamp": timestamps,
            "sensor_id": sensor["sensor_id"],
            "lat": sensor["lat"],
            "lon": sensor["lon"],
            "temperature_c": np.round(temp, 3),
            "ph": np.round(ph, 3),
            "humidity_pct": np.round(humidity, 2),
            "conductivity_ms_cm": np.round(conductivity, 3),
            "dissolved_oxygen_mg_l": np.round(do, 3),
            "nitrate_umol_l": np.round(nitrate, 3),
            "phosphate_umol_l": np.round(phosphate, 4),
            "bloom_label": state["bloom_label"],
        }
    )


def main() -> int:
    print(f"Generating IoT mock {START} -> {END}")
    timestamps = pd.date_range(start=START, end=END, freq="h")
    print(f"  hours per sensor: {len(timestamps)}")
    rng = np.random.default_rng(SEED)

    frames = []
    for sensor in SENSORS:
        df = _generate_sensor(sensor, timestamps, rng)
        frames.append(df)
        print(f"  {sensor['sensor_id']}: {len(df)} rows, "
              f"bloom hours = {int(df['bloom_label'].sum())}")
    out = pd.concat(frames, ignore_index=True)
    out = out.sort_values(["sensor_id", "timestamp"]).reset_index(drop=True)
    out.to_csv(OUT_PATH, index=False)
    print(f"\nWrote {OUT_PATH} — {len(out):,} rows total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
