# TideAlert

**Team RedMetrics** — CASSINI 11th Edition, Space for Water Hackathon

Harmful Algal Bloom (HAB) early-warning system for the Ligurian coast (Genoa, Italy). TideAlert converts a documented 7-day lag between satellite-detectable bloom formation and the resulting spike in respiratory ER admissions into actionable financial preparation time for hospitals and automatic parametric insurance payouts.

## The Problem

Red Tide events cause a measurable, predictable spike in respiratory and gastrointestinal emergency cases that hits coastal hospitals with no financial or operational warning. Published clinical evidence (Kirkpatrick et al. 2006) documents a **54% increase** in respiratory ER admissions during HAB events and a **1-week lag** between satellite-detectable bloom and ER peak. TideAlert exploits that prediction window.

## How It Works

TideAlert is a **3-point data fusion system** — satellite Earth observation, coastal IoT sensors, and hospital admissions — feeding a 4-stage ML/physics pipeline that produces daily risk scores, hospital surge forecasts, and parametric insurance triggers.

```
┌─ Data Sources ─────────────────────────────────────────────────────┐
│ Sentinel-2 NDCI (CDSE)  ·  CMEMS reanalysis (SST/currents/sal/chl)│
│ ERA5 wind & wave (CDS)  ·  IoT coastal sensors  ·  Hospital       │
│ admissions (synthetic, ISPRA-anchored)                             │
└────────────────────────────────────────────────────────────────────┘
                                ▼
        scripts/01..05  →  data/processed/merged_features.csv
                                ▼
┌─ ML / Physics Pipeline ───────────────────────────────────────────┐
│ Stage 1  Bloom Probability        LightGBM + isotonic calibration │
│ Stage 2  Aerosolisation RRI       Deterministic physics formula   │
│ Stage 3  Hospital Surge           Ridge regression                │
│ Stage 4  Parametric Trigger       Deterministic payout tiers      │
└───────────────────────────────────────────────────────────────────┘
                                ▼
            pipeline/run_live_rri.py  →  Supabase (PostGIS, RLS,
                                          Realtime, pg_net webhook)
                                ▼
┌─ Frontends ───────────────────────────────────────────────────────┐
│ Unified dashboard (Vite + React 19 + Tailwind v4 + TypeScript)   │
│   Hospital view:   Dashboard / 7-Day Forecast / Sensors / History│
│   Insurance view:  Dashboard / Trigger Monitor / Events / Simulate│
└───────────────────────────────────────────────────────────────────┘
```

## Business Models

**B2B — Hospital Direct:** Hospitals receive 7-day surge forecasts with expected ER admission counts, severity tiers, staffing and medication stock recommendations. The dashboard updates in real time via Supabase Realtime.

**B2B2B — Insurance as Distribution Layer:** Insurance companies subscribe to the TideAlert API. When both the satellite-derived RRI score and IoT sensor confirmation cross their thresholds, a parametric trigger fires automatically, issuing a machine-readable bloom event certificate and automatic payout to the insured hospital — no claims adjuster needed.

## Pipeline Stages

### Stage 1 — Bloom Probability (ML)
LightGBM binary classifier on 16 daily features (chlorophyll-a, SST, currents, NDCI, IoT chemistry, seasonal encodings) predicting 7-day-forward bloom probability. Calibrated with isotonic regression. Validated with `TimeSeriesSplit(5)`, AUC ≈ 0.95.

### Stage 2 — Aerosolisation Risk Index (Physics)
Deterministic formula combining bloom probability, onshore wind projection (shore normal = 160° for Ligurian coast), wave height amplification, and toxin-release multiplier (peaks during bloom decline). Produces an RRI score from 0–100 with severity tiers: GREEN (0–30), AMBER (31–60), RED (61–85), CRITICAL (>85).

### Stage 3 — Hospital Surge Forecast (ML)
Ridge regression on monthly hospital admissions using RRI lag-7, coastal population, asthma prevalence, bloom duration, and seasonal features. Calibrated to reproduce the +54% Kirkpatrick prior at RRI=85. Outputs per-hospital expected admissions, severity tier, recommended extra nursing shifts, and medication stock in EUR.

### Stage 4 — Parametric Insurance Trigger (Deterministic)
Dual-confirmation trigger requiring both RRI (>70 for 5+ consecutive days) and IoT (DO <5 mg/L and pH <7.95). Tiered payouts: CRITICAL 100%, RED 75%, AMBER 25%, capped at 120% of modelled surge cost.

## Data Sources

| Source | Type | Resolution | API |
|--------|------|------------|-----|
| Sentinel-2 L2A (NDCI) | Real | Monthly, 10m | CDSE Sentinel Hub |
| CMEMS Reanalysis (SST, currents, salinity, chl-a) | Real | Daily, 4.2km | Copernicus Marine |
| ERA5 (wind, wave height) | Real | Daily | C3S Climate Data Store |
| Coastal IoT sensors | Synthetic | Hourly, 5 sensors | Generated (`scripts/02`) |
| Hospital admissions | Synthetic | Monthly, 3 hospitals | Generated (`scripts/03`) |

Bounding box: `lon 7.5–9.8, lat 43.7–44.6` (entire Ligurian coast).

## Tech Stack

| Layer | Technology |
|-------|------------|
| ML / Data Pipeline | Python 3.11+, LightGBM, scikit-learn, pandas, xarray, NumPy |
| Satellite Data | sentinelhub, copernicusmarine, cdsapi |
| Backend | Supabase (Postgres + PostGIS + RLS + Realtime + pg_net), Deno Edge Functions |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, Recharts, Mapbox GL JS, Supabase JS |
| Map Animation | Custom WebGL layers (wind particles + bloom shader), Mapbox 3D terrain |
| Hardware Prototype | ESP32-S3, underwater sensor array, surface buoy gateway |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Supabase project (or use the demo seeder)

### Setup

```bash
# 1. Clone and install
git clone https://github.com/bojan-eftimoski/RedMetrics.git
cd RedMetrics

# 2. Python environment
python -m venv .venv && source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt

# 3. Environment variables
cp .env.example .env
# Fill in: CDSE, CMEMS, CDS, and Supabase credentials

# 4. Run the full pipeline (download data → train models → live score)
python pipeline/run_full_check.py

# 5. Seed demo data (optional — populates dashboards without live data)
python pipeline/seed_demo_data.py

# 6. Start the unified frontend
cd frontend && npm install && npm run dev
# → http://localhost:5173
```

### Alternative: standalone Hospital / Insurance dashboards

```bash
cd hospital  && npm install && npm run dev   # http://localhost:5173
cd insurance && npm install && npm run dev   # http://localhost:5174
```

### Map Animation (standalone)

```bash
cd map-animation
echo "VITE_MAPBOX_TOKEN=pk.your_token" > .env
npm install && npm run dev                   # http://localhost:5175
```

## Project Structure

```
RedMetrics/
├── backend/                  Supabase SQL migrations + Edge Functions
│   ├── migrations/           0001–0004 schema, RLS, webhook trigger
│   └── edge_functions/       insurer_webhook (Deno)
├── frontend/                 Unified React dashboard (hospital + insurance views)
│   └── src/pages/
│       ├── hospital/         Dashboard, Forecast, Sensors, Historical
│       └── insurance/        Dashboard, Monitor, Events, Simulate
├── hospital/                 Standalone hospital React frontend
├── insurance/                Standalone insurance React frontend
├── map-animation/            3D animated bloom map (WebGL + Mapbox)
├── hardware/                 ESP32-S3 IoT prototype + 3D models
│   ├── RedMetricsPrototype.ino
│   └── docs/                 Hardware system, BOM, deployment planning
├── models/
│   ├── stage1_bloom_probability/   LightGBM bloom classifier
│   ├── stage2_aerosolisation_rri/  RRI physics formula
│   ├── stage3_hospital_surge/      Ridge regression surge model
│   └── stage4_insurance_loss/      Parametric trigger + payout
├── pipeline/
│   ├── run_full_check.py     End-to-end pipeline (data → train → score)
│   ├── run_live_rri.py       Daily live scorer
│   └── seed_demo_data.py     Demo data seeder for frontends
├── scripts/
│   ├── 01_download_satellite.py    Sentinel-2, CMEMS, ERA5
│   ├── 02_generate_iot_mock.py     Synthetic IoT sensors
│   ├── 03_generate_hospital_mock.py Synthetic hospital admissions
│   ├── 04_feature_engineering.py   Merge → merged_features.csv
│   └── 05_generate_2005_replay.py  2005 Genoa outbreak replay
├── data/                     Raw, processed, models (gitignored)
├── ARCHITECTURE.md           Detailed system architecture
├── TideAlert_PRD_v2.md       Full product specification
└── requirements.txt          Python dependencies
```

## Demo: 2005 Genoa Outbreak Replay

The frontends include an animated replay of the documented July–August 2005 *Ostreopsis ovata* outbreak in Genoa. A 14-day hand-crafted feature sequence is walked through Stages 1+2, showing the RRI climbing from GREEN to CRITICAL approximately 7 days before the documented peak of 200+ ER admissions — demonstrating the core value proposition of the prediction window.

## Hardware Prototype

The `hardware/` directory contains an ESP32-S3-based coastal water monitoring device designed for real-world deployment:

- **Underwater unit:** pH, conductivity, nitrate, phosphate, turbidity, temperature, dissolved oxygen sensors
- **Surface buoy:** Communication gateway with cellular/LoRa connectivity
- **Local backup storage** with cloud-ready Supabase integration

See [Hardware Documentation](hardware/README.md) for system design, [Bill of Materials](hardware/docs/README_BILL_OF_MATERIALS.md), and [Deployment Planning](hardware/docs/README_DEPLOYMENT_PLANNING.md).

## Database Schema

Four tables plus a zone reference in Supabase (Postgres + PostGIS):

- **`coastal_zones`** — Zone geometry, shore normal, population, asthma prevalence
- **`rri_scores`** — Daily RRI scores with bloom probability, wind, wave data
- **`sensor_readings`** — IoT sensor time series (7 parameters per reading)
- **`hospital_surge_forecasts`** — Per-hospital daily surge predictions with staffing recs
- **`trigger_events`** — Insurance trigger evaluations with payout certificates

RLS enabled on all tables. Realtime publication on `rri_scores`, `trigger_events`, and `hospital_surge_forecasts`. Webhook trigger (`pg_net`) fires the `insurer_webhook` Edge Function on parametric trigger events.

## Clinical Evidence

| Study | Finding | Model Use |
|-------|---------|-----------|
| Kirkpatrick et al. (2006) | +54% respiratory ER admissions during bloom | Stage 3 calibration prior |
| UF Center for Coastal Solutions (2026) | 1,320 additional respiratory cases/month per 400k coastal residents | Stage 3 population scaling |
| Hoagland et al. (2014) | 9.88 additional respiratory visits per zip code per bloom month | Stage 3 baseline rate |
| Kirkpatrick et al. (2006) | 1-week lag between bloom and ER peak | 7-day prediction window |
| Frontiers in Ecology (2021) | $60K–$700K annual illness costs per county | Stage 4 loss model |

## Team RedMetrics

Built for **CASSINI 11th Edition — Space for Water** hackathon.

**Pilot region:** Ligurian Coast, Italy (Genoa — 44.4°N, 8.9°E)
