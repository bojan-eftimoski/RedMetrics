# TideAlert — Developer Task List

> Executable build checklist derived from `TideAlert_PRD_v2.md`.
> Inline references: `→ PRD §X.Y` points to the spec section for that task.
> Project structure: `hospital/` (React), `insurance/` (React), `models/` (one folder per ML stage), `scripts/`, `pipeline/`, `backend/`, `data/`.
> Fallback rule: if any satellite CSV download fails, **STOP** and report — do not proceed with synthetic substitutes.

---

## Phase 0 — Project Initialization

- [ ] **0.1** Initialize the repository
  - [ ] Run `git init` in project root
  - [ ] Create `.gitignore` covering: `.env`, `data/raw/`, `data/processed/`, `data/models/*.pkl`, `__pycache__/`, `*.pyc`, `node_modules/`, `dist/`, `.DS_Store`, `*.netcdf`, `*.nc`
  - [ ] Create initial `README.md` with one-line project description
  - [ ] First commit: empty scaffold

- [ ] **0.2** Create the directory tree
  - [ ] `data/raw/satellite/`
  - [ ] `data/raw/iot/`
  - [ ] `data/raw/hospital/`
  - [ ] `data/raw/replay/`
  - [ ] `data/processed/`
  - [ ] `data/models/`
  - [ ] `scripts/`
  - [ ] `pipeline/`
  - [ ] `models/stage1_bloom_probability/`
  - [ ] `models/stage2_aerosolisation_rri/`
  - [ ] `models/stage3_hospital_surge/`
  - [ ] `models/stage4_insurance_loss/`
  - [ ] `backend/migrations/`
  - [ ] `backend/edge_functions/`
  - [ ] `hospital/`
  - [ ] `insurance/`

- [ ] **0.3** Configure environment (`→ PRD §0`)
  - [ ] Create `.env` in project root with all keys: `CDSE_USERNAME`, `CDSE_PASSWORD`, `CMEMS_USERNAME`, `CMEMS_PASSWORD`, `CDS_URL`, `CDS_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
  - [ ] Confirm `.env` is git-ignored
  - [ ] Create `.env.example` with empty values (committed)

- [ ] **0.4** Python dependencies (`→ PRD §6`)
  - [ ] Create `requirements.txt` with: `lightgbm`, `scikit-learn`, `pandas`, `xarray`, `netCDF4`, `numpy`, `sentinelhub`, `copernicusmarine`, `cdsapi`, `python-dotenv`, `joblib`, `requests`, `scipy`, `supabase`
  - [ ] Create Python virtual environment (`python -m venv .venv`)
  - [ ] Activate venv and run `pip install -r requirements.txt`
  - [ ] Verify imports succeed: `python -c "import lightgbm, sklearn, copernicusmarine, sentinelhub, cdsapi"`

- [ ] **0.5** Credential smoke tests
  - [ ] Test CDSE auth: `sentinelhub` config loads without error
  - [ ] Test CMEMS auth: `copernicusmarine.login(...)` returns success
  - [ ] Test C3S auth: `cdsapi.Client(...)` initializes without 401

---

## Phase 1 — Satellite & Climate Data Acquisition (`→ PRD §3.1`)

- [ ] **1.1** Build `scripts/01_download_satellite.py`
  - [ ] Define `BBOX = {lon_min:7.5, lat_min:43.7, lon_max:9.8, lat_max:44.6}` and `DATE_START="2015-01-01"`, `DATE_END="2024-12-31"` constants
  - [ ] Load `.env` via `python-dotenv`

- [ ] **1.2** Sentinel-3 OLCI chlorophyll-a download
  - [ ] Configure `SHConfig` with CDSE credentials, base URL, token URL (`→ PRD §3.1`)
  - [ ] Pull monthly chl-a mean / max / std / pixel_count for BBOX
  - [ ] Write `data/raw/satellite/sentinel3_olci_ligurian_2015_2024.csv`
  - [ ] Columns: `date, mean_chl_a, max_chl_a, std_chl_a, pixel_count`

- [ ] **1.3** Sentinel-2 L2A NDCI download
  - [ ] Configure same CDSE credentials
  - [ ] Compute NDCI from B5/B4 over coastal pixels only
  - [ ] Write `data/raw/satellite/sentinel2_ndci_ligurian_2015_2024.csv`
  - [ ] Columns: `date, ndci_mean, ndci_coastal_max`

- [ ] **1.4** CMEMS oceanographic download (`→ PRD §3.1`)
  - [ ] Authenticate via `copernicusmarine.login(...)`
  - [ ] Pull each dataset ID: `cmems_mod_med_phy-tem_anfc_4.2km_P1D-m`, `cmems_mod_med_phy-cur_anfc_4.2km_P1D-m`, `cmems_mod_med_phy-sal_anfc_4.2km_P1D-m`, `cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m`, `cmems_mod_med_bgc_my_4.2km_P1D-m`
  - [ ] Subset each to BBOX and date range
  - [ ] Spatially average to a single daily scalar per variable for the Ligurian zone
  - [ ] Merge into `data/raw/satellite/cmems_sst_currents_ligurian_2015_2024.csv`
  - [ ] Columns: `date, sst_mean, u_current, v_current, salinity_mean, chl_cmems`

- [ ] **1.5** ERA5 wind & wave download
  - [ ] Configure `cdsapi.Client` with CDS_URL and CDS_KEY
  - [ ] Variables: `10m_u_component_of_wind`, `10m_v_component_of_wind`, `significant_height_of_combined_wind_waves_and_swell`, `mean_wave_direction`
  - [ ] Area `[44.6, 7.5, 43.7, 9.8]`
  - [ ] Output netCDF → convert to CSV
  - [ ] Compute derived `wind_speed = sqrt(u² + v²)` and `wind_direction`
  - [ ] Write `data/raw/satellite/era5_wind_waves_ligurian_2015_2024.csv`
  - [ ] Columns: `date, wind_u, wind_v, wind_speed, wind_direction, wave_height`

- [ ] **1.6** Failure handling (single fallback path)
  - [ ] If **any** of 1.2–1.5 fails (auth, network, quota), the script must `sys.exit(1)` with a clear message naming the failed source and underlying error
  - [ ] Do NOT generate synthetic CSVs automatically — surface the failure for human triage

---

## Phase 2 — IoT Sensor Mock Data (`→ PRD §3.2`)

- [ ] **2.1** Build `scripts/02_generate_iot_mock.py`
  - [ ] Define 5 virtual sensors `LIG_001`..`LIG_005` with lat/lon along Ligurian coast
  - [ ] Generate hourly timestamps from 2022-01-01 to 2024-12-31

- [ ] **2.2** Implement baseline statistical generation (`→ PRD §3.2 BASELINE`)
  - [ ] Temperature: seasonal sine (winter 13°C, summer 26°C) + diurnal cycle + Gaussian noise
  - [ ] pH: 8.15 ± noise (drops to 7.85 during bloom)
  - [ ] Humidity: 72% mean, std 8.0
  - [ ] Conductivity: 47.5 mean, std 1.2 mS/cm
  - [ ] Dissolved oxygen: 7.8 baseline (drops to 4.2 during bloom) + diurnal cycle
  - [ ] Nitrate: 1.5 baseline → 8.5 pre-bloom → 2.1 during bloom
  - [ ] Phosphate: 0.08 → 0.45 pre-bloom → 0.12 during bloom

- [ ] **2.3** Embed bloom events
  - [ ] `BLOOM_EVENTS` list per `→ PRD §3.2`
  - [ ] For dates within event windows: shift readings to bloom-state distributions
  - [ ] For 7 days preceding bloom: shift nitrate/phosphate to `pre_bloom` values
  - [ ] Set `bloom_label = 1` within event windows

- [ ] **2.4** Add realism
  - [ ] Apply 1-hour autocorrelation (AR(1) component) to all numeric columns
  - [ ] Add Gaussian noise scaled per variable

- [ ] **2.5** Write `data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv`
  - [ ] Columns exactly per `→ PRD §3.2 schema`

---

## Phase 3 — Hospital Mock Data (`→ PRD §3.3`)

- [ ] **3.1** Build `scripts/03_generate_hospital_mock.py`
  - [ ] Define hospitals: `OSP_SAN_MARTINO`, `OSP_GALLIERA`, `OSP_VILLA_SCASSI`
  - [ ] Define `year_month` range: 2015-01 → 2024-12

- [ ] **3.2** Generate monthly admissions
  - [ ] Non-bloom months: `respiratory_admissions ~ Normal(420, 45)`
  - [ ] Bloom months: `respiratory_admissions ~ Normal(420 * 1.54, 60)`
  - [ ] `coastal_respiratory = 0.35 × total` during bloom, `0.22 × total` baseline
  - [ ] `gi_admissions = 0.41 × respiratory_admissions` (Hoagland ratio)

- [ ] **3.3** Embed documented bloom months from ISPRA records (2015–2024)
  - [ ] Set `bloom_active`, `bloom_intensity`, `bloom_days_in_month` accordingly
  - [ ] Compute `rri_mean_month` placeholder (filled later in Phase 4)

- [ ] **3.4** Static fields
  - [ ] `asthma_patients_pct = 6.5` (constant)
  - [ ] Allow ±0.5 variation per hospital catchment

- [ ] **3.5** Write `data/raw/hospital/hospital_admissions_ligurian_synthetic.csv`
  - [ ] Columns exactly per `→ PRD §3.3 schema`

---

## Phase 4 — Feature Engineering

- [ ] **4.1** Build `scripts/04_feature_engineering.py`
  - [ ] Load all 6 raw CSVs (4 satellite + 1 IoT + 1 hospital)
  - [ ] Aggregate IoT hourly → daily mean/min/max per sensor, then zone-averaged

- [ ] **4.2** Time-aligned merge
  - [ ] Daily timeline as primary key
  - [ ] Left-join all daily satellite features
  - [ ] Forward-fill gaps ≤ 3 days, leave NaN beyond

- [ ] **4.3** Compute derived features
  - [ ] `chl_a_7d_rate = chl_a_mean.diff(7)`
  - [ ] `chl_a_consecutive_days` above 5 µg/L threshold
  - [ ] `sst_anomaly = sst_mean − seasonal_climatology`
  - [ ] `day_of_year_sin`, `day_of_year_cos`
  - [ ] `month_sin`, `month_cos`

- [ ] **4.4** Construct training labels (`→ PRD §4 Stage 1 label construction`)
  - [ ] `bloom_label = 1` if (`chl_a_mean > 10` AND `sst_mean > 22`) OR (`iot_dissolved_oxygen_mean < 5`) OR within ISPRA-documented event
  - [ ] Apply 7-day forward-looking shift: today's label = bloom occurs within next 7 days

- [ ] **4.5** Backfill RRI history into hospital CSV
  - [ ] Pre-compute placeholder RRI per day from satellite/IoT
  - [ ] Aggregate to monthly mean → write `rri_mean_month` column

- [ ] **4.6** Write `data/processed/merged_features.csv`

---

## Phase 5 — ML Stage 1: Bloom Probability (`→ PRD §4 Stage 1`)

Folder: `models/stage1_bloom_probability/`

- [ ] **5.1** `models/stage1_bloom_probability/features.py`
  - [ ] Export `FEATURES` list exactly per `→ PRD §4 Stage 1` (16 features)
  - [ ] Function `load_training_data()` reading `data/processed/merged_features.csv`

- [ ] **5.2** `models/stage1_bloom_probability/train.py`
  - [ ] Implement TimeSeriesSplit(5)
  - [ ] LightGBM `objective=binary`, `metric=auc`, params per `→ PRD §4 Stage 1 PARAMS`
  - [ ] Wrap final estimator with `CalibratedClassifierCV(method="isotonic", cv=3)`
  - [ ] Print fold AUC, mean AUC, feature importance
  - [ ] Save calibrated model to `data/models/stage1_lgbm.pkl` via `joblib`

- [ ] **5.3** `models/stage1_bloom_probability/predict.py`
  - [ ] Load `stage1_lgbm.pkl`
  - [ ] Function `predict_bloom_probability(features_today: dict) -> float` returning calibrated probability ∈ [0,1]

- [ ] **5.4** `models/stage1_bloom_probability/README.md`
  - [ ] One paragraph: purpose, inputs, output, where the saved model lives

---

## Phase 6 — ML Stage 2: Aerosolisation RRI (`→ PRD §4 Stage 2`)

Folder: `models/stage2_aerosolisation_rri/`
*(Pure deterministic physics — no training step.)*

- [ ] **6.1** `models/stage2_aerosolisation_rri/calculate.py`
  - [ ] Implement `calculate_rri(bloom_probability, wind_speed, wind_direction, shore_normal_degrees, wave_height, chl_a_rate_of_change)` exactly per `→ PRD §4 Stage 2`
  - [ ] Constant `LIGURIAN_SHORE_NORMAL = 160`
  - [ ] Wind onshore component, wave factor (cap 2×), toxin multiplier (1.5 if declining), wind normalization (max 15 m/s)
  - [ ] Output rounded to 1 decimal, capped at 100

- [ ] **6.2** `models/stage2_aerosolisation_rri/severity.py`
  - [ ] Function `rri_to_severity(rri: float) -> str` returning `"GREEN"` (0–30), `"AMBER"` (31–60), `"RED"` (61–85), `"CRITICAL"` (>85)

- [ ] **6.3** `models/stage2_aerosolisation_rri/README.md`

---

## Phase 7 — ML Stage 3: Hospital Surge (`→ PRD §4 Stage 3`)

Folder: `models/stage3_hospital_surge/`

- [ ] **7.1** `models/stage3_hospital_surge/features.py`
  - [ ] Export `FEATURES_SURGE` list (6 features)
  - [ ] Compute `rri_lag7` (RRI from 7 days ago)
  - [ ] Compute `bloom_duration_days` (consecutive days above bloom threshold)

- [ ] **7.2** `models/stage3_hospital_surge/train.py`
  - [ ] Use `Ridge(alpha=tuned)` regression
  - [ ] Train on 2015–2022 hospital data, validate on 2022–2024
  - [ ] Verify intercept ≈ 420 baseline; coefficient on `rri_lag7` produces ~54% increase at RRI=85
  - [ ] Print RMSE, MAE, R²
  - [ ] Save to `data/models/stage3_linear.pkl`

- [ ] **7.3** `models/stage3_hospital_surge/predict.py`
  - [ ] Implement `surge_output(model, features_today)` returning the dict from `→ PRD §4 Stage 3`: `expected_total_admissions`, `expected_additional_vs_baseline`, `severity_tier`, `recommended_extra_nursing_shifts`, `recommended_medication_stock_eur`, `confidence_interval_low`, `confidence_interval_high`
  - [ ] Severity tier thresholds: `<50 LOW`, `<120 MODERATE`, `≥120 HIGH SURGE`

- [ ] **7.4** `models/stage3_hospital_surge/README.md`

---

## Phase 8 — ML Stage 4: Insurance Loss & Trigger (`→ PRD §4 Stage 4`)

Folder: `models/stage4_insurance_loss/`
*(No training — deterministic.)*

- [ ] **8.1** `models/stage4_insurance_loss/trigger.py`
  - [ ] Implement `evaluate_parametric_trigger(rri_score, rri_consecutive_days, iot_dissolved_oxygen, iot_ph)`
  - [ ] Both conditions required: RRI (`>70` AND `≥5 days`) AND IoT (`DO<5.0` AND `pH<7.95`)
  - [ ] Return dict per `→ PRD §4 Stage 4`

- [ ] **8.2** `models/stage4_insurance_loss/payout.py`
  - [ ] Implement `calculate_payout(rri_score, bloom_duration_days, hospital_id, insured_daily_operational_cost_eur)`
  - [ ] Tier ladder: CRITICAL/RED/AMBER/NONE per `→ PRD §4 Stage 4`
  - [ ] Compute `expected_surge_cost = surge_additional × 850 EUR`
  - [ ] Cap payout at `expected_surge_cost × 1.2`
  - [ ] Generate `event_certificate_id = f"TA-{hospital_id}-{YYYYMMDDHHMM}"`

- [ ] **8.3** `models/stage4_insurance_loss/README.md`

---

## Phase 9 — Database (Supabase) (`→ PRD §5`)

- [ ] **9.1** Provision project
  - [ ] Confirm Supabase project `qpdujjmerofutwcexmmp` is active
  - [ ] Enable PostGIS extension via Supabase dashboard

- [ ] **9.2** Schema migrations — write `backend/migrations/0001_initial_schema.sql`
  - [ ] `coastal_zones` table (PostGIS POLYGON 4326)
  - [ ] `rri_scores` table
  - [ ] `sensor_readings` table
  - [ ] `hospital_surge_forecasts` table
  - [ ] `trigger_events` table
  - [ ] All CHECK constraints exactly per `→ PRD §5`

- [ ] **9.3** Indexes
  - [ ] `rri_scores (zone_id, date DESC)`
  - [ ] `sensor_readings (sensor_id, timestamp DESC)`
  - [ ] `hospital_surge_forecasts (hospital_id, forecast_date DESC)`
  - [ ] `trigger_events (hospital_id, triggered_at DESC)`

- [ ] **9.4** RLS policies
  - [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all 4 fact tables
  - [ ] Permissive read policy for anon role (demo): `USING (true)` on `rri_scores`, `sensor_readings`, `hospital_surge_forecasts`, `trigger_events`
  - [ ] Service-role-only write policies

- [ ] **9.5** Realtime
  - [ ] Enable realtime publication on `rri_scores`, `trigger_events`, `hospital_surge_forecasts`

- [ ] **9.6** Seed `coastal_zones`
  - [ ] Insert one row: `name="Genoa Ligurian Coast"`, polygon covering BBOX, `shore_normal_degrees=160`, `coastal_population=180000`, `asthma_prevalence_pct=6.5`

- [ ] **9.7** Apply migrations
  - [ ] Run via Supabase MCP `apply_migration` tool or Supabase CLI

---

## Phase 10 — Live Inference Pipeline

- [ ] **10.1** Build `pipeline/run_live_rri.py` (replaces PRD `06_run_live_rri.py`)
  - [ ] Load `.env`, instantiate Supabase service-role client
  - [ ] Load latest day's features (satellite + IoT)

- [ ] **10.2** Stage orchestration
  - [ ] Call `models.stage1_bloom_probability.predict.predict_bloom_probability()`
  - [ ] Call `models.stage2_aerosolisation_rri.calculate.calculate_rri()`
  - [ ] Call `models.stage2_aerosolisation_rri.severity.rri_to_severity()`
  - [ ] Compute `rri_consecutive_days` from prior `rri_scores` rows
  - [ ] Call `models.stage3_hospital_surge.predict.surge_output()`
  - [ ] Call `models.stage4_insurance_loss.trigger.evaluate_parametric_trigger()`
  - [ ] If trigger fires: call `models.stage4_insurance_loss.payout.calculate_payout()`

- [ ] **10.3** Persist results
  - [ ] Insert row into `rri_scores`
  - [ ] Insert latest IoT readings into `sensor_readings`
  - [ ] Insert per-hospital row into `hospital_surge_forecasts`
  - [ ] If trigger fired: insert row into `trigger_events`

- [ ] **10.4** Logging
  - [ ] Print summary: zone, date, rri_score, severity, trigger_fired, payout_eur

---

## Phase 11 — Edge Function for Insurer Webhook (`→ PRD §7.2`)

- [ ] **11.1** Scaffold `backend/edge_functions/insurer_webhook/index.ts`
  - [ ] Deno-based Supabase Edge Function
  - [ ] Triggered by Postgres trigger on `INSERT INTO trigger_events WHERE trigger_fired = true`

- [ ] **11.2** Webhook delivery
  - [ ] POST event certificate JSON to `${SIMULATED_INSURER_URL}/api/simulated-insurer-webhook`
  - [ ] Body: full `trigger_events` row + `event_certificate_id`
  - [ ] Retry on 5xx with exponential backoff (max 3 retries)

- [ ] **11.3** Deploy
  - [ ] `supabase functions deploy insurer_webhook` (or via MCP `deploy_edge_function`)
  - [ ] Configure DB trigger to invoke the function

---

## Phase 12 — Hospital Frontend (`hospital/`) (`→ PRD §7.1`)

### 12.A — Setup

- [ ] **12.1** Scaffold the app
  - [ ] `npm create vite@latest hospital -- --template react-ts`
  - [ ] `cd hospital && npm install`
  - [ ] Install: `@supabase/supabase-js`, `mapbox-gl`, `recharts`, `tailwindcss`, `postcss`, `autoprefixer`, `clsx`, `date-fns`
  - [ ] `npx tailwindcss init -p`

- [ ] **12.2** Wire env + Supabase client
  - [ ] `hospital/.env.local` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAPBOX_TOKEN`
  - [ ] `src/lib/supabase.ts` exporting a singleton client

### 12.B — Design System

- [ ] **12.3** Define design tokens (`tailwind.config.js` + `src/styles/tokens.css`)
  - [ ] Severity color tokens (semantic, not raw hex usage in components):
    - `--severity-green` (e.g. `#16a34a`)
    - `--severity-amber` (e.g. `#d97706`)
    - `--severity-red` (e.g. `#dc2626`)
    - `--severity-critical` (e.g. `#7f1d1d`)
  - [ ] Pair every severity color with an icon + text label (never color-only signaling)
  - [ ] Verify all severity color/text pairs meet ≥4.5:1 contrast on white and dark surfaces
  - [ ] Spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48
  - [ ] Type scale: 12 / 14 / 16 / 18 / 24 / 32; body 16px / line-height 1.5
  - [ ] Tabular figures (`font-variant-numeric: tabular-nums`) on all numeric KPI displays
  - [ ] Z-index scale: 0 / 10 / 20 / 40 / 100 / 1000

- [ ] **12.4** Build shared UI primitives in `src/components/ui/`
  - [ ] `<SeverityBadge severity="GREEN|AMBER|RED|CRITICAL">` (icon + label + color)
  - [ ] `<KpiCard label, value, unit, deltaVsBaseline>`
  - [ ] `<ChartContainer>` with `prefers-reduced-motion` aware entrance animation
  - [ ] `<Skeleton>` for loading states (>300 ms loads)
  - [ ] `<EmptyState>` and `<ErrorState>` with retry CTA

### 12.C — Pages

- [ ] **12.5** Page: **Overview** (`/`)
  - [ ] Large color-coded RRI indicator (severity tier + numeric score + last-updated timestamp)
  - [ ] Sub-cards: bloom probability, wind onshore component, wave height, chl-a mean
  - [ ] Realtime subscription on `rri_scores` (Supabase channel) — auto-refresh on INSERT
  - [ ] Skeleton state while initial query loads

- [ ] **12.6** Page: **7-Day Surge Forecast** (`/forecast`)
  - [ ] Recharts bar chart: expected daily admissions × 7 days
  - [ ] Confidence interval shading (CI low / CI high band)
  - [ ] Severity tier displayed prominently above chart
  - [ ] Recommended panel: extra nursing shifts (int), medication stock (€ formatted)
  - [ ] Tooltip on each bar with exact values + accessible aria-label
  - [ ] Direct value labels on bars (avoid color-alone communication)

- [ ] **12.7** Page: **Sensor Data** (`/sensors`)
  - [ ] Line charts (Recharts) for 7 IoT variables, last 30 days
  - [ ] Highlight readings that contributed to last trigger condition (annotation markers)
  - [ ] Sensor selector (LIG_001..LIG_005)
  - [ ] Y-axis units labeled; legend interactive (toggle series)

- [ ] **12.8** Page: **Historical** (`/historical`)
  - [ ] Monthly admissions chart: actual vs model prediction
  - [ ] Time-range selector (year / all)
  - [ ] Replay button (handoff to Phase 14)

### 12.D — Routing & Layout

- [ ] **12.9** Routing
  - [ ] React Router routes for `/`, `/forecast`, `/sensors`, `/historical`
  - [ ] Persistent left sidebar nav with active-state highlight (no icon-only items — icon + label)
  - [ ] Page transitions ≤300 ms with reduced-motion respect

---

## Phase 13 — Insurance Frontend (`insurance/`) (`→ PRD §7.2`)

### 13.A — Setup

- [ ] **13.1** Scaffold (mirror Phase 12.1–12.2 in `insurance/`)
  - [ ] Same dependency list
  - [ ] Same Tailwind + design tokens (import from a shared `packages/design-tokens/` if convenient, or duplicate exactly)

### 13.B — Pages

- [ ] **13.2** Page: **Portfolio Overview** (`/`)
  - [ ] Mapbox GL JS map centered on Ligurian coast
  - [ ] Insured hospital pins, color-coded by current RRI exposure
  - [ ] Aggregate portfolio RRI exposure score in header
  - [ ] Click pin → drawer with hospital detail

- [ ] **13.3** Page: **Trigger Monitor** (`/monitor`)
  - [ ] Live feed of trigger evaluations (last N rows from `trigger_events`)
  - [ ] Each row shows two condition lights: RRI ✓/✗, IoT ✓/✗ (icon + text, not color-alone)
  - [ ] Realtime subscription on `trigger_events` INSERT
  - [ ] When `trigger_fired = true`: show full-width red banner with payout amount + event_certificate_id
  - [ ] Optional alert sound (respect user mute preference; toggle in header)

- [ ] **13.4** Page: **Trigger Events Log** (`/events`)
  - [ ] Sortable table: certificate ID, hospital, triggered_at, payout tier, payout EUR, status
  - [ ] Aria-sort indicators on column headers
  - [ ] Filter by status: PENDING / PAID / DISPUTED
  - [ ] Click row → modal with full event JSON

- [ ] **13.5** Page: **Payout Simulation** (`/simulate`)
  - [ ] Inputs: insured daily operational cost (€), RRI score slider (0–100), bloom duration slider (0–14 days)
  - [ ] Calls the same `calculate_payout` logic (mirrored client-side OR via a Supabase RPC wrapping the Python model)
  - [ ] Live updates on slider change with debounce ≥150 ms
  - [ ] Display payout tier badge + EUR amount + tier-explanation tooltip

### 13.C — Routing

- [ ] **13.6** Routing
  - [ ] Routes for `/`, `/monitor`, `/events`, `/simulate`
  - [ ] Same sidebar nav pattern as Hospital app

---

## Phase 14 — Demo Replay: 2005 Genoa Outbreak (`→ PRD §10`)

- [ ] **14.1** Generate replay data
  - [ ] Pull historical CMEMS reanalysis for July–August 2005, BBOX
  - [ ] Run Stages 1+2 backwards over the 2005 sequence
  - [ ] Write `data/raw/replay/genoa_2005_rri_sequence.csv` with daily RRI scores

- [ ] **14.2** Replay button in Hospital UI
  - [ ] Button label: "Replay 2005 Genoa Outbreak"
  - [ ] On click: load `genoa_2005_rri_sequence.csv` (bundle as static asset or fetch from Supabase Storage)

- [ ] **14.3** Animation
  - [ ] Step day-by-day at 800 ms interval
  - [ ] Animate RRI chart and Overview indicator in sync
  - [ ] Update Surge Forecast page values as the replay advances
  - [ ] Show parametric trigger fire visual on day 8 of the replay
  - [ ] Pause / resume / reset controls

- [ ] **14.4** End-to-end demo dry run
  - [ ] Start both frontends (`hospital` on 5173, `insurance` on 5174)
  - [ ] Run replay; confirm Insurance dashboard receives live trigger banner mid-replay
  - [ ] Confirm `trigger_events` row inserted, edge function POSTed, UI banner fired

---

## Phase 15 — Final Integration Pass

- [ ] **15.1** Run full pipeline cold
  - [ ] Fresh clone, `pip install -r requirements.txt`
  - [ ] Run scripts 01 → 04 in order; confirm all CSVs land
  - [ ] Train Stage 1 + Stage 3 models; confirm `.pkl` files exist
  - [ ] Run `pipeline/run_live_rri.py`; confirm Supabase rows inserted

- [ ] **15.2** Front-end cold start
  - [ ] `cd hospital && npm install && npm run dev` — open in browser, exercise all 4 pages
  - [ ] `cd insurance && npm install && npm run dev` — open in browser, exercise all 4 pages
  - [ ] Verify realtime: insert a fake `trigger_events` row → Insurance banner fires within 2 s

- [ ] **15.3** Demo readiness
  - [ ] Confirm Replay button works end-to-end
  - [ ] Confirm both dashboards render correctly at 1920×1080 (judging resolution)
  - [ ] Final commit + tag `v1.0-demo`

---

*End of task list. Reference: `TideAlert_PRD_v2.md` for all specifications.*
