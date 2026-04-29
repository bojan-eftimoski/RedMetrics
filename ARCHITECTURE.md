# TideAlert — System Architecture

TideAlert is a four-stage harmful-algal-bloom (HAB) early-warning system for the
Ligurian coast of Genoa. It ingests free public Earth-observation data,
synthetic IoT and hospital streams, fuses them through a daily ML pipeline, and
publishes RRI scores, hospital-surge forecasts, and parametric insurance
triggers to a Supabase Postgres + Realtime backend that two React frontends
(`hospital/`, `insurance/`) consume live.

## 1. System overview

The pipeline is a one-way data flow with four stages, each producing artefacts
that the next stage consumes. Raw EO and synthetic CSVs are merged into a
single daily feature table, four ML/physics stages turn that into operational
outputs, and a thin Supabase layer exposes those outputs to the dashboards.

```
data/raw/satellite/*.csv          (Sentinel-2 NDCI, CMEMS phys+bgc, ERA5)
data/raw/iot/*.csv                (5 synthetic sensors, hourly 2022-2024)
data/raw/hospital/*.csv           (3 hospitals, monthly admissions 2015-2024)
        │
        ▼   scripts/04_feature_engineering.py
data/processed/merged_features.csv  (3,653 daily rows × 28 cols, 2015-2024)
        │
        ▼   pipeline/run_live_rri.py  (executes Stages 1-4 for one day)
        │
        ├── Stage 1  models/stage1_bloom_probability/  → bloom_probability ∈ [0,1]
        ├── Stage 2  models/stage2_aerosolisation_rri/ → rri_score ∈ [0,100], severity
        ├── Stage 3  models/stage3_hospital_surge/     → per-hospital surge dict
        └── Stage 4  models/stage4_insurance_loss/     → trigger eval + payout
        │
        ▼
Supabase (Postgres + PostGIS + RLS + pg_net + Realtime)
        │
        ▼
backend/edge_functions/insurer_webhook  (Deno, AFTER INSERT trigger fires it)
        │                                                │
        ▼                                                ▼
hospital/   (Vite + React 19 + Tailwind v4)   insurance/   (same stack)
```

The bounding box is fixed throughout the system at `lon 7.5–9.8, lat 43.7–44.6`
(the entire Ligurian coast). The single `coastal_zones` row, `Genoa Ligurian
Coast`, carries `shore_normal_degrees=160`, `coastal_population=180000`, and
`asthma_prevalence_pct=6.5`, all of which are read by the pipeline at runtime.

## 2. Data sources

Five raw streams feed the pipeline. Three are downloaded from real public APIs
(`scripts/01_download_satellite.py`); two are synthetic but calibrated against
published priors.

### Sentinel-2 NDCI (real, monthly)

Fetched via the CDSE Sentinel Hub Statistical API using OAuth tokens from
`scripts/_cdse_auth.py` (password grant against `cdse-public` client). The
evalscript computes NDCI on water-only pixels (`SCL==6`):

```
ndci = (B05 − B04) / (B05 + B04)
```

Output `data/raw/satellite/sentinel2_ndci_ligurian_2015_2024.csv`:
`date, ndci_mean, ndci_coastal_max, ndci_pixel_count` — one row per month
2015–2024.

### CMEMS physical + biogeochemical (real, daily)

Pulled with the `copernicusmarine` CLI from the `_my_` reanalysis datasets:

| Dataset | Variables |
|---|---|
| `cmems_mod_med_phy-temp_my_4.2km_P1D-m` | `thetao` → `sst_mean` |
| `cmems_mod_med_phy-cur_my_4.2km_P1D-m`  | `uo, vo` → `u_current, v_current` |
| `cmems_mod_med_phy-sal_my_4.2km_P1D-m`  | `so` → `salinity_mean` |
| `cmems_mod_med_bgc-plankton_my_4.2km_P1D-m` | `chl` → `chl_cmems` |

Output `data/raw/satellite/cmems_sst_currents_ligurian_2015_2024.csv`:
`date, sst_mean, u_current, v_current, salinity_mean, chl_cmems` — one row per
day. CMEMS chl-a is the canonical `chl_a_mean` source after Sentinel-3 OLCI was
dropped (CDSE does not expose L2 WFR with `CHL_NN`).

### ERA5 wind & waves (real, daily)

Retrieved from C3S Climate Data Store via `cdsapi` (Beta CDS 2024+, single-UUID
key format). Variables `10m_u_component_of_wind, 10m_v_component_of_wind,
significant_height_of_combined_wind_waves_and_swell, mean_wave_direction`. Two
constraints forced the implementation shape:

- **Per-year chunking** — annual cost cap on Beta CDS forces 10 separate
  retrievals (one per year 2015–2024) instead of one bulk pull.
- **ZIP unwrap** — Beta CDS returns a ZIP containing two streams (one for the
  oper wind reanalysis, one for the wave model). `_extracted_netcdfs()` opens
  each, concatenates, and writes a single CSV.

Output `data/raw/satellite/era5_wind_waves_ligurian_2015_2024.csv`:
`date, wind_u, wind_v, wind_speed, wind_direction, wave_height`.

### IoT mock (synthetic, hourly)

`scripts/02_generate_iot_mock.py` produces five sensors `LIG_001..LIG_005`
along the Genoa coast at hourly resolution for 2022–2024 (`data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv`):
`timestamp, sensor_id, lat, lon, temperature_c, ph, humidity_pct,
conductivity_ms_cm, dissolved_oxygen_mg_l, nitrate_umol_l, phosphate_umol_l,
bloom_label`.

Three documented bloom windows (2022-07-15→08-10, 2023-08-03→08-28,
2024-07-20→08-15) drive a state machine `baseline / pre_bloom (7d before) /
bloom`. Within each state, hourly values are AR(1) noise (φ=0.85) over a
seasonal mean (peak ~26 °C in July, trough ~13 °C in January) with a diurnal
peak at 14:00 local. Bloom periods drop pH from 8.15 → 7.85 and DO from 7.8 →
4.2; pre-bloom periods spike nitrate (1.5 → 8.5) and phosphate (0.08 → 0.45)
five days before the visible bloom.

### Hospital admissions mock (synthetic, monthly)

`scripts/03_generate_hospital_mock.py` produces 120 months × 3 hospitals
(`OSP_SAN_MARTINO`, `OSP_GALLIERA`, `OSP_VILLA_SCASSI` weighted 1.10/0.95/0.95)
calibrated to two published priors:

- **Kirkpatrick 2006**: +54 % respiratory admissions during HAB events
  (`BLOOM_MEAN_MULTIPLIER = 1.54`, `BASELINE_TOTAL_RESP = 420`).
- **Hoagland 2014**: GI admissions = 0.41 × respiratory (`GI_RATIO = 0.41`).

Generation runs in two passes. Pass 1 builds the zone-monthly RRI sequence
(45 + 50·intensity + N(0,6) on bloom months, baseline 12 ± 5 otherwise). Pass 2
computes admissions as a same-month bloom uplift plus a **carryover term**
driven by previous-month RRI:

```
lag_uplift = max(0, prev_rri − 30) × 3.4   # zone-monthly admissions
```

The carryover models the documented 4–12 week respiratory-inflammation tail
after a bloom and is what makes Stage 3's `rri_lag7` coefficient positive (see
§9). Output `data/raw/hospital/hospital_admissions_ligurian_synthetic.csv`:
`year_month, hospital_id, respiratory_admissions, gi_admissions,
coastal_respiratory, bloom_active, bloom_intensity, bloom_days_in_month,
rri_mean_month, asthma_patients_pct`.

### Phase 4 merge

`scripts/04_feature_engineering.py` produces a single daily table at
`data/processed/merged_features.csv` (3,653 rows × 28 cols, 2015-01-01 →
2024-12-31). Monthly streams are forward-filled within each month
(`_expand_monthly_to_daily()`); IoT is averaged hourly→daily-per-sensor→zone
(`_aggregate_iot_to_daily()`); short daily gaps (≤3 days) are forward-filled
on each daily stream. Derived features added:

- `chl_a_7d_rate` = `chl_a_mean.diff(7)`
- `chl_a_consecutive_days` = days in a row with `chl_a_mean > 5`
- `sst_anomaly` = `sst_mean − climatology(day_of_year)`
- `day_of_year_sin/cos`, `month_sin/cos` cyclical encodings

Final columns:
`date, ndci, ndci_coastal_max, sst_mean, u_current, v_current, salinity_mean,
chl_cmems, wind_u, wind_v, wind_speed, wind_direction, wave_height, chl_a_mean,
iot_temperature_mean, iot_ph_mean, iot_dissolved_oxygen_mean, iot_nitrate_mean,
iot_phosphate_mean, chl_a_7d_rate, chl_a_consecutive_days, sst_anomaly,
day_of_year_sin, day_of_year_cos, month_sin, month_cos, raw_bloom, bloom_label`.

The bloom label is rule-based and **forward-looking**:

```
raw_bloom   = (chl_a_mean > 10 AND sst_mean > 22)
              OR (iot_dissolved_oxygen_mean < 5.0)
              OR (date ∈ ISPRA_EVENT_WINDOW)
bloom_label = 1 if raw_bloom occurs within the next 7 days, else 0
```

The 7-day forward shift is implemented by reversing the series, taking a
7-row rolling max, and reversing back. This makes Stage 1 a true 7-day
short-term forecast rather than nowcasting.

The same script also writes `rri_mean_month` back into the hospital CSV in
place via `_backfill_rri_to_hospital()`, mapping `bloom_label`-active days to
RRI 70 and background days to RRI 12, then taking the monthly mean. This
replaces an earlier chl-based proxy that collapsed to ~0 in oligotrophic
Mediterranean water (real CMEMS chl-a here is 0.04–0.47 µg/L, far below the
5–30 µg/L bloom threshold).

## 3. Stage 1 Bloom Probability Model

Code: `models/stage1_bloom_probability/{features.py, train.py, predict.py}`.
Saved bundle: `data/models/stage1_lgbm.pkl`.

A LightGBM binary classifier on 16 features predicting the 7-day-forward
`bloom_label`:


```python
FEATURES = [
    "chl_a_mean", "chl_a_7d_rate", "chl_a_consecutive_days",
    "sst_mean", "sst_anomaly",
    "u_current", "v_current", "salinity_mean",
    "ndci",
    "day_of_year_sin", "day_of_year_cos",
    "iot_temperature_mean", "iot_ph_mean", "iot_dissolved_oxygen_mean",
    "iot_nitrate_mean", "iot_phosphate_mean",
]
```

Hyper-parameters (`PARAMS`):
`objective=binary, metric=auc, learning_rate=0.05, num_leaves=31,
min_data_in_leaf=20, feature_fraction=0.8, bagging_fraction=0.8, bagging_freq=5`,
`n_estimators=500`, early stopping after 30 rounds.

Validation: `TimeSeriesSplit(n_splits=5)` for fold AUCs. The final model is
wrapped in `CalibratedClassifierCV(method="isotonic", cv=3)` and refit on the
full data so `predict_bloom_probability(features_today)` returns a calibrated
probability in `[0, 1]`. Calibration uses StratifiedKFold internally — a small
leakage risk vs strict time-ordering, accepted to stay faithful to the PRD
specification. Achieved AUC ≈ 0.95 on held-out folds.

`predict.py` exposes `predict_bloom_probability(features_today: dict) -> float`
which lazily loads the bundle, validates that all 16 keys are present, builds
a one-row DataFrame in the right column order, and clamps the result to
`[0, 1]`.

## 4. Stage 2 RRI Physics Formula

Code: `models/stage2_aerosolisation_rri/{calculate.py, severity.py}`. **No
training step** — pure deterministic physics.

```
rri = bloom_probability × wind_normalized × wave_factor × toxin_multiplier × 100
```

Decomposed:

```python
angle_diff_rad   = radians(wind_direction − shore_normal_degrees)  # 160° for Ligurian
wind_onshore     = max(0, cos(angle_diff_rad) × wind_speed)        # m/s, onshore only
wind_normalized  = min(wind_onshore / 15.0, 1.0)                   # WIND_REFERENCE_MAX_MS=15
wave_factor      = min(wave_height / 0.5, 2.0)                     # WAVE_REFERENCE=0.5, cap=2.0
toxin_multiplier = 1.5 if chl_a_rate_of_change < 0 else 1.0
rri              = min(bloom_p × wind_norm × wave_factor × toxin × 100, 100)
```

The shore-normal projection rejects offshore winds (cos < 0 → wind_onshore=0,
RRI=0). The toxin multiplier captures the empirical observation that toxin
release peaks when the bloom is **declining**, not at peak biomass — this is
why the Stage 4 trigger generally fires a day or two after the Stage 1 peak.

Severity tiers (`severity.py`):

| Severity | RRI range |
|---|---|
| GREEN    | 0 – 30  |
| AMBER    | 31 – 60 |
| RED      | 61 – 85 |
| CRITICAL | > 85    |

## 5. Stage 3 Hospital Surge Model

Code: `models/stage3_hospital_surge/{features.py, train.py, predict.py}`.
Saved bundle: `data/models/stage3_linear.pkl`.

A `RidgeCV` regression on monthly hospital admissions, built per-hospital from
the rri-backfilled hospital CSV. Six features:

```python
FEATURES_SURGE = [
    "rri_lag7",              # previous month's mean RRI (the carryover signal)
    "coastal_population",    # constant 180_000 for Genoa
    "asthma_prevalence_pct", # 6.3-6.8% per hospital
    "bloom_duration_days",   # bloom_days_in_month
    "month_sin", "month_cos",# seasonal cycle
]
TARGET_SURGE = "respiratory_admissions"
```

`rri_lag7` is conceptually a daily lag-7 RRI; at monthly resolution it reduces
to "last month's mean RRI" (`groupby('hospital_id')['rri_mean_month'].shift(1)`).

Training: `RidgeCV` over `α ∈ [0.1, 0.5, 1, 5, 10, 50, 100]`, time-based split
(train < 2022, validate ≥ 2022). The diagnostic in `train.py` predicts at the
typical-feature mean with `rri_lag7=0` vs `rri_lag7=85`, expecting +54 % to
match the Kirkpatrick prior — current model lands at +52.1 %, R² 0.74,
`rri_lag7` coefficient ≈ +0.80.

`predict.py` computes the surge dictionary for one hospital-day's features:

```python
predicted_admissions = model.predict(features_today)
additional           = predicted_admissions − BASELINE          # BASELINE = 130
severity_tier        = LOW (<25) / MODERATE (<60) / HIGH        # per-hospital
nursing_shifts       = max(0, additional / 25)                  # 1 shift per 25 extra patients
medication_eur       = max(0, additional × 95)                  # €95/patient
ci_low/high          = predicted × 0.85 / × 1.15
```

Returned dict shape (also the `hospital_surge_forecasts` row contract):
`expected_total_admissions, expected_additional_vs_baseline, severity_tier,
recommended_extra_nursing_shifts, recommended_medication_stock_eur,
confidence_interval_low, confidence_interval_high`.

The per-hospital `BASELINE = 130` (≈ mean of non-bloom monthly admissions)
replaces an earlier `BASELINE = 420`, which was the **zone** baseline before
the per-hospital split — see §9.

## 6. Stage 4 Parametric Insurance Trigger

Code: `models/stage4_insurance_loss/{trigger.py, payout.py}`.

The trigger requires **both** the satellite-derived RRI signal and the IoT
sensor signal to fire — either alone is treated as a possible false positive
(B2B2B Flow A in the PRD).

```python
rri_trigger   = rri_score > 70 AND rri_consecutive_days >= 5
iot_trigger   = iot_dissolved_oxygen < 5.0 AND iot_ph < 7.95
trigger_fired = rri_trigger AND iot_trigger
```

When `trigger_fired`, the payout is calculated by tier:

| Tier     | RRI    | Days ≥ | Payout %                          |
|----------|--------|--------|-----------------------------------|
| CRITICAL | > 85   | 7      | 100 % of insured daily op cost    |
| RED      | > 70   | 5      | 75 %                              |
| AMBER    | > 60   | 3      | 25 %                              |
| NONE     | else   | -      | 0 %                               |

```python
expected_surge_cost = max(0, surge_additional_admissions) × 850 EUR
raw_payout          = payout_pct × insured_daily_cost × bloom_duration_days
payout_eur          = min(raw_payout, expected_surge_cost × 1.2)  # 120% cap
event_certificate_id = f"TA-{hospital_id}-{YYYYMMDDHHMM}"
```

The 120 % expected-surge cap prevents over-payment when a long but mild bloom
would otherwise produce a payout that dwarfs the actual hospital cost. Hospital
daily op cost is hardcoded in the live runner: San Martino €22 000, Galliera
€16 000, Villa Scassi €12 000.

## 7. Pipeline execution

Two orchestrators, both at `pipeline/`.

### `pipeline/run_live_rri.py`

The single-day live runner. Idempotent enough to be re-run without manual
cleanup; everything keys off `merged_features.csv`'s latest row with all
Stage 1 features populated.

1. `_latest_row()` — reads `merged_features.csv`, drops rows with NaN Stage 1
   features, picks the last row.
2. `_resolve_zone_id()` — looks up the `coastal_zones.id` for
   `Genoa Ligurian Coast` (the migration-seeded zone).
3. **Stage 1**: `predict_bloom_probability(s1_inputs)`.
4. **Stage 2**: `calculate_rri(...)` with `shore_normal_degrees=160` (constant
   `LIGURIAN_SHORE_NORMAL`); `rri_to_severity(rri)` for the tier.
5. `_consecutive_rri_days(supabase, ...)` — walks back day-by-day from
   yesterday in `rri_scores`, breaks on first miss or `rri_score ≤ 70`.
6. `_bloom_duration_days(...)` — same shape but breaks on severity outside
   {RED, CRITICAL}.
7. Insert one row into `rri_scores`.
8. Insert latest IoT readings (one per sensor) into `sensor_readings`. If no
   reading exists for `target_date`, falls back to the last 24h per sensor.
9. **Stage 3 + Stage 4 per hospital**: build common Stage 3 features (with
   `rri_lag7` from previous month's `rri_mean_month` in the hospital CSV),
   call `surge_output()`, insert a `hospital_surge_forecasts` row.
   Then `evaluate_parametric_trigger(...)`; if `trigger_fired`,
   `calculate_payout(...)` and insert into `trigger_events`.

### `pipeline/run_full_check.py`

Phase 15 cold-start integration check. Subprocess-runs four steps in order
(Phase 4 → train Stage 1 → train Stage 3 → live run), aborts at first failure,
and prints an artefact summary verifying that `merged_features.csv`,
`stage1_lgbm.pkl`, `stage3_linear.pkl` all exist.

### `pipeline/seed_demo_data.py`

Idempotent demo seeder for the frontends — populates 30 days of `rri_scores`,
7 days × 3 hospitals of forecasts, 30 days × 5 sensors (4 readings/day) of
sensor readings, and one fired `trigger_events` row, all tagged
`TA-DEMO-*` so a re-seed doesn't pile up duplicates.

### `scripts/05_generate_2005_replay.py`

Phase 14 deterministic replay of the documented 2005 Genoa _Ostreopsis ovata_
outbreak. A 14-day hand-crafted feature sequence (2005-07-19 → 2005-08-01) is
walked through Stages 1+2 and written as both CSV
(`data/raw/replay/genoa_2005_rri_sequence.csv`) and JSON to both frontends'
`public/` directories, where the React apps fetch and animate it on the
Overview/Forecast pages.

## 8. Supabase schema

Four tables plus a zone reference, all in the `public` schema, all with RLS
enabled (anon SELECT, service_role ALL). Realtime publication is enabled on
`rri_scores`, `trigger_events`, `hospital_surge_forecasts` so the React apps
get live push updates.

```sql
-- Migration 0001_initial_schema.sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

coastal_zones (
    id UUID PK, name TEXT, geom GEOMETRY(POLYGON,4326),
    shore_normal_degrees FLOAT, coastal_population INT, asthma_prevalence_pct FLOAT
)

rri_scores (
    id UUID PK, zone_id UUID FK, date DATE,
    rri_score FLOAT, severity TEXT CHECK ('GREEN','AMBER','RED','CRITICAL'),
    bloom_probability FLOAT, wind_speed FLOAT, wave_height FLOAT,
    chl_a_mean FLOAT, rri_consecutive_days INT, created_at TIMESTAMPTZ
)

sensor_readings (
    id UUID PK, sensor_id TEXT, zone_id UUID FK, timestamp TIMESTAMPTZ,
    temperature_c FLOAT, ph FLOAT, humidity_pct FLOAT,
    conductivity_ms_cm FLOAT, dissolved_oxygen_mg_l FLOAT,
    nitrate_umol_l FLOAT, phosphate_umol_l FLOAT, created_at TIMESTAMPTZ
)

hospital_surge_forecasts (
    id UUID PK, hospital_id TEXT, zone_id UUID FK, forecast_date DATE,
    generated_at TIMESTAMPTZ, expected_admissions INT, additional_vs_baseline INT,
    severity_tier TEXT CHECK ('LOW SURGE','MODERATE SURGE','HIGH SURGE'),
    extra_nursing_shifts INT, medication_stock_eur INT, ci_low INT, ci_high INT
)

trigger_events (
    id UUID PK, event_certificate_id TEXT UNIQUE, zone_id UUID FK,
    hospital_id TEXT, insurer_id TEXT, triggered_at TIMESTAMPTZ,
    trigger_fired BOOLEAN, rri_condition_met BOOLEAN, iot_condition_met BOOLEAN,
    rri_score FLOAT, rri_days_above_threshold INT,
    iot_dissolved_oxygen FLOAT, iot_ph FLOAT,
    payout_tier TEXT, payout_pct FLOAT, calculated_payout_eur FLOAT,
    bloom_duration_days INT,
    status TEXT DEFAULT 'PENDING' CHECK ('PENDING','PAID','DISPUTED')
)
```

Indexes: `(zone_id, date DESC)` on `rri_scores`, `(sensor_id, timestamp DESC)`
on `sensor_readings`, `(hospital_id, forecast_date DESC)` on
`hospital_surge_forecasts`, `(hospital_id, triggered_at DESC)` on
`trigger_events`.

The seed at the end of migration 0001 (idempotent on `name`) inserts the
`Genoa Ligurian Coast` zone with the BBOX polygon, `shore_normal_degrees=160`,
`coastal_population=180000`, `asthma_prevalence_pct=6.5`.

Migration `0002_coastal_zones_read_policy.sql` adds anon SELECT on
`coastal_zones` (Supabase auto-enables RLS on new tables; without this, the
frontends can't fetch the zone geometry to draw the map).

Migration `0003_trigger_events_webhook.sql` enables the `pg_net` extension and
defines an `AFTER INSERT ON trigger_events FOR EACH ROW` trigger that, when
`NEW.trigger_fired IS TRUE`, posts a `to_jsonb(NEW)` envelope to the
`insurer_webhook` Edge Function via `net.http_post`. Migration
`0004_hardcode_edge_url_in_trigger.sql` patches the function to embed the
edge URL as a `CONSTANT TEXT` (Supabase doesn't grant non-superuser roles
permission to `ALTER DATABASE SET` custom GUCs); the edge function is deployed
with `verify_jwt=false` so the trigger doesn't need to attach a service-role
token.

Edge function `backend/edge_functions/insurer_webhook/index.ts` (Deno) accepts
either a Postgres webhook envelope `{type, table, record, schema}` or a bare
`trigger_events` row, validates `event_certificate_id`, skips
`trigger_fired=false` defensively, and forwards the row to
`SIMULATED_INSURER_URL/api/simulated-insurer-webhook` with retry (max 3,
exponential backoff base 500 ms, 10 s timeout per attempt). 5xx and
network errors retry; 4xx is returned as-is.

## 9. Known issues and calibration notes

### Sentinel-3 OLCI was dropped

The PRD originally specified Sentinel-3 OLCI L2 WFR with the `CHL_NN`
neural-network chlorophyll product as the canonical chl source. CDSE Sentinel
Hub does not expose this product in a way the Statistical API can consume, so
`chl_a_mean` now comes from the CMEMS `cmems_mod_med_bgc-plankton_my_4.2km_P1D-m`
biogeochemistry reanalysis (`chl_cmems`). The Phase 4 merge still falls back
to a Sentinel-3 CSV at `data/raw/satellite/sentinel3_olci_ligurian_2015_2024.csv`
if one is present, so a future Sentinel-3 path can be slotted in without
disturbing the rest of the pipeline.

### CMEMS chl-a is too low to drive a chl-only proxy

Real CMEMS chl-a in the Ligurian BBOX runs 0.04–0.47 µg/L, far below the
5–30 µg/L thresholds typically used to flag a bloom. An earlier
`_backfill_rri_to_hospital()` proxy of `chl/30 × 60` collapsed to ≈0 and
killed Stage 3's RRI lag signal. The current implementation maps the
rule-based `bloom_label` (which incorporates IoT DO and ISPRA event windows)
to RRI 70 active / RRI 12 background and takes the monthly mean, keeping
`rri_mean_month` on the same [12, 70] scale Phase 3 originally writes.

### Stage 3 baseline scale

Stage 3's `BASELINE = 130` in `predict.py` is the **per-hospital** non-bloom
monthly mean (zone total ≈ 420 split across three hospitals at weights 1.10,
0.95, 0.95). An earlier `BASELINE = 420` produced spurious huge negative
"additional vs baseline" numbers because the Ridge model trains on the
per-hospital target. The severity thresholds (`LOW < 25`, `MODERATE < 60`)
and the per-extra-25 nursing-shift / €95-per-patient coefficients are
calibrated to that per-hospital scale.

### Stage 3 carryover prior

Without the carryover term in `scripts/03_generate_hospital_mock.py`
(`LAG_RRI_THRESHOLD=30, LAG_ADMISSIONS_PER_RRI_POINT=3.4`), the Ridge
model fit a **negative** `rri_lag7` coefficient — scientifically wrong, since
respiratory inflammation has a documented 4–12 week tail after a bloom. The
carryover constant 3.4 was hand-calibrated so that `prev_rri ≈ 85` produces
the +54 % surge that matches Kirkpatrick 2006. The `train.py` diagnostic
verifies this each fit and currently lands at +52.1 % (within ±5 % of target).

### ERA5 ZIP packaging and cost cap

The Beta CDS API (2024+) imposes an annual cost cap that prevents bulk 2015–
2024 downloads in a single request, and wraps multi-stream responses in a ZIP
with separate netCDF files per data stream. Both are handled in
`scripts/01_download_satellite.py`: per-year chunking (10 retrievals) plus
`_extracted_netcdfs()` which opens the zip, reads each contained netCDF, and
concatenates. `quiet=False` and `PYTHONUNBUFFERED=1` are required to see live
progress; without them the script appears to hang.

### Calibration class-leakage in Stage 1

`CalibratedClassifierCV(method="isotonic", cv=3)` uses StratifiedKFold
internally, which is not strictly time-ordered. This is a small leakage risk
on a 7-day-forward target but was accepted to stay faithful to the PRD's
calibration spec. With more time, an explicit time-aware cross-fitted
calibration would be preferable.

### Hospital surge forecast is built from "today's" features

The pipeline writes one `hospital_surge_forecasts` row per hospital per
`target_date` using **today's** Stage 3 features (the surge signal is rooted
in the previous month's RRI via `rri_lag7`). This is a daily nowcast of the
expected monthly admissions level, not a true 7-day forecast. The frontend
treats it as the latest authoritative number and overlays the 7-day Stage 1
bloom-probability curve separately.

### Edge function must be deployed before applying migration 0003

`pg_net.http_post` is fire-and-forget; if `insurer_webhook` is not yet
deployed when the first trigger fires, the trigger function logs a notice and
the row is still inserted normally — the insurer just doesn't receive
notification. The trigger function is also explicitly defensive: if
`tidealert.edge_url` is unset (in the pre-0004 GUC version) or
`NEW.trigger_fired IS NOT TRUE`, it returns `NEW` without calling
`net.http_post`.

### Demo seeder vs live pipeline

`pipeline/seed_demo_data.py` and `pipeline/run_live_rri.py` both write to the
same tables. The seeder tags its `trigger_events` rows with
`TA-DEMO-*` certificate IDs and deletes only those on re-seed; it does **not**
delete rows the live pipeline produced. RRI/sensor/surge tables are wiped
fully by the seeder (delete by zone_id / hospital_id / sensor_id), so do not
seed against a Supabase project you also intend to use for live data without
adapting the cleanup.
