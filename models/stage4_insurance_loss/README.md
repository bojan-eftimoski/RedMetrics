# Stage 4 — Insurance Parametric Trigger & Payout

Deterministic. **No model training.** Both files implement the B2B2B Flow A from PRD §4 Stage 4: the trigger fires only when satellite-derived RRI _and_ IoT chemistry _both_ confirm an active bloom, and the payout follows a fixed tier ladder capped at the modelled surge cost.

## Trigger logic

```python
rri_trigger = (rri_score > 70) and (rri_consecutive_days >= 5)
iot_trigger = (iot_dissolved_oxygen < 5.0) and (iot_ph < 7.95)
trigger_fired = rri_trigger and iot_trigger
```

Both conditions guard against single-source false positives.

## Payout ladder

| Tier | RRI | Duration (days) | % of insured daily cost |
|---|---|---|---|
| CRITICAL | > 85 | ≥ 7 | 100 % |
| RED      | > 70 | ≥ 5 |  75 % |
| AMBER    | > 60 | ≥ 3 |  25 % |
| NONE     | else |  —  |   0 % |

Payout is capped at `1.2 × expected_surge_cost`, where
`expected_surge_cost = surge_additional_admissions × €850` (Eurostat avg coastal-ER respiratory visit cost).

## Event certificate

`event_certificate_id = "TA-{hospital_id}-{YYYYMMDDHHMM}"` — emitted on every fired trigger and persisted in `trigger_events` for the insurer-webhook edge function.

## Usage

```python
from models.stage4_insurance_loss.trigger import evaluate_parametric_trigger
from models.stage4_insurance_loss.payout import calculate_payout

t = evaluate_parametric_trigger(rri_score=78, rri_consecutive_days=6,
                                 iot_dissolved_oxygen=4.1, iot_ph=7.82)
if t["trigger_fired"]:
    p = calculate_payout(rri_score=78, bloom_duration_days=9,
                         hospital_id="OSP_SAN_MARTINO",
                         insured_daily_operational_cost_eur=18000,
                         surge_additional_admissions=64)
```
