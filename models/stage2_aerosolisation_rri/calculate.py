"""
Stage 2 -- Respiratory Risk Index (RRI), 0-100 scale.

Pure deterministic physics per PRD §4 Stage 2. No training step.

  rri = bloom_probability * wind_onshore_norm * wave_factor * toxin_multiplier * 100

Inputs:
  bloom_probability      : float in [0, 1]   from Stage 1
  wind_speed             : m/s                from ERA5
  wind_direction         : deg from north     from ERA5
  shore_normal_degrees   : deg from north     from coastal_zones (Ligurian = 160)
  wave_height            : m                  from ERA5 significant wave height
  chl_a_rate_of_change   : float              from features.chl_a_7d_rate
"""
from __future__ import annotations

import sys

import numpy as np

for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

LIGURIAN_SHORE_NORMAL: float = 160.0
WIND_REFERENCE_MAX_MS: float = 15.0
WAVE_FACTOR_CAP: float = 2.0
WAVE_REFERENCE_M: float = 0.5
TOXIN_MULTIPLIER_DECLINING: float = 1.5
TOXIN_MULTIPLIER_DEFAULT: float = 1.0
RRI_MAX: float = 100.0


def calculate_rri(
    bloom_probability: float,
    wind_speed: float,
    wind_direction: float,
    shore_normal_degrees: float,
    wave_height: float,
    chl_a_rate_of_change: float,
) -> float:
    """Return the RRI score in [0, 100], rounded to 1 decimal place."""
    angle_diff_rad = np.radians(wind_direction - shore_normal_degrees)
    wind_onshore = float(np.cos(angle_diff_rad)) * float(wind_speed)
    wind_onshore = max(0.0, wind_onshore)

    wave_factor = min(float(wave_height) / WAVE_REFERENCE_M, WAVE_FACTOR_CAP)

    toxin_multiplier = (
        TOXIN_MULTIPLIER_DECLINING
        if float(chl_a_rate_of_change) < 0
        else TOXIN_MULTIPLIER_DEFAULT
    )

    wind_normalized = min(wind_onshore / WIND_REFERENCE_MAX_MS, 1.0)

    rri = float(bloom_probability) * wind_normalized * wave_factor * toxin_multiplier * 100.0
    return min(round(rri, 1), RRI_MAX)
