# Stage 2 — Aerosolisation Risk Index (RRI)

Deterministic physics layer. Combines Stage 1 bloom probability with wind/wave/toxin-stage modifiers to produce a 0–100 respiratory risk score. **No training step.**

## Formula (PRD §4 Stage 2)

```
wind_onshore     = max(0, cos(wind_direction - shore_normal) * wind_speed)
wind_norm        = min(wind_onshore / 15 m/s, 1)
wave_factor      = min(wave_height / 0.5 m, 2)
toxin_multiplier = 1.5 if chl_a_7d_rate < 0 else 1.0      # decline = cell lysis = peak toxin
rri              = bloom_probability * wind_norm * wave_factor * toxin_multiplier * 100
```

`LIGURIAN_SHORE_NORMAL = 160°` (coast faces roughly southeast).

## Severity tiers (task list §6.2)

| Tier | Range |
|---|---|
| `GREEN`    | 0 – 30 |
| `AMBER`    | 31 – 60 |
| `RED`      | 61 – 85 |
| `CRITICAL` | > 85 |

## Usage

```python
from models.stage2_aerosolisation_rri.calculate import calculate_rri, LIGURIAN_SHORE_NORMAL
from models.stage2_aerosolisation_rri.severity import rri_to_severity

rri = calculate_rri(
    bloom_probability=0.82, wind_speed=9.0, wind_direction=170.0,
    shore_normal_degrees=LIGURIAN_SHORE_NORMAL, wave_height=1.2,
    chl_a_rate_of_change=-0.4,
)
tier = rri_to_severity(rri)
```
