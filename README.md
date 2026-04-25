# TideAlert

Harmful Algal Bloom (HAB) early-warning system for the Ligurian coast (Genoa, Italy). Converts a 7-day satellite-to-ER lag into financial preparation time for hospitals (B2B) and parametric trigger payouts for insurers (B2B2B).

CASSINI 11th Edition — Space for Water hackathon project.

See `TideAlert_PRD_v2.md` for the full spec and `TASK_LIST.md` for the build checklist.

## Architecture

```
┌─ Data sources ─────────────────────────────────────────────────────┐
│ Sentinel-2 NDCI (CDSE)  ·  CMEMS reanalysis (SST/currents/sal/chl) │
│ ERA5 wind & wave (CDS Beta)  ·  Synthetic IoT sondes  ·  Hospital │
│ admissions (synthetic, ISPRA-anchored)                             │
└────────────────────────────────────────────────────────────────────┘
                                ▼
        scripts/01..05  →  data/processed/merged_features.csv
                                ▼
┌─ Models ───────────────────────────────────────────────────────────┐
│ Stage 1  bloom probability        LightGBM + isotonic calibration  │
│ Stage 2  aerosolisation RRI       deterministic physics            │
│ Stage 3  hospital surge           Ridge regression                 │
│ Stage 4  parametric trigger/payout deterministic                   │
└────────────────────────────────────────────────────────────────────┘
                                ▼
            pipeline/run_live_rri.py  →  Supabase (PostGIS, RLS,
                                          realtime, pg_net trigger)
                                ▼
┌─ Frontends ────────────────────────────────────────────────────────┐
│ hospital/   Vite+React+TS   port 5173    Overview / Forecast /     │
│             realtime on rri_scores       Sensors / Historical      │
│ insurance/  Vite+React+TS   port 5174    Portfolio / Trigger       │
│             realtime on trigger_events   Monitor / Events / Sim    │
└────────────────────────────────────────────────────────────────────┘
                                ▲
                  insurer_webhook (Supabase Edge Function)
                  forwards fired triggers to insurer endpoint
```

## Quick start

```bash
# 1. Python env + creds (one-time)
python -m venv .venv && .venv/Scripts/activate     # Windows
pip install -r requirements.txt
cp .env.example .env  # fill in CDSE/CMEMS/CDS/Supabase credentials

# 2. Pull all raw data + train + push live snapshot
python pipeline/run_full_check.py

# 3. Run frontends (in two terminals)
cd hospital  && npm install && npm run dev   # http://localhost:5173
cd insurance && npm install && npm run dev   # http://localhost:5174
```

## Layout

```
backend/              SQL migrations + insurer_webhook edge function
data/                 raw/, processed/, models/, replay/   (gitignored)
hospital/, insurance/ React frontends
models/               Stage 1-4 ML packages
pipeline/             run_live_rri.py, run_full_check.py
scripts/              01_download_satellite, 02-05 data prep
```
