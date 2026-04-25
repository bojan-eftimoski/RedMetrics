# TideAlert — Developer PRD
### Claude Code Executable Specification
**Version:** 2.0 | **Date:** April 2026  
**Hackathon:** CASSINI 11th Edition — Space for Water  
**Pilot Region:** Ligurian Coast, Italy (Genoa — 44.4°N, 8.9°E)  
**MVP Clients:** Hospitals (B2B) · Insurance Companies (B2B2B — Flow A)

---

## 0. Credentials & Environment Setup

Create `/project/.env` before running anything. Claude Code reads this file for all API calls.

```env
# ── Copernicus Data Space (Sentinel-2, Sentinel-3) ──────────────────
CDSE_USERNAME=b.eftimoski@gmail.com
CDSE_PASSWORD=FilipbojaN!2408

# ── CMEMS / Copernicus Marine (SST, currents, biogeochemistry) ───────
# Same Copernicus account — may share CDSE credentials
CMEMS_USERNAME=b.eftimoski@gmail.com
CMEMS_PASSWORD=FilipbojaN!2408

# ── C3S Climate Data Store (ERA5 wind, wave forecasts) ───────────────
CDS_URL=https://cds.climate.copernicus.eu/api
CDS_KEY=YOUR_UID:6aeffc35-d88f-4270-bcac-adfb40f85d24

# ── Supabase ──────────────────────────────────────────────────────────
SUPABASE_URL=https://qpdujjmerofutwcexmmp.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZHVqam1lcm9mdXR3Y2V4bW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwNTQ1NzMsImV4cCI6MjA5MjYzMDU3M30.PM7SMyXDPJ-4jLgNfRd1fhBGi168LTUL7td4h0cMVVY
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZHVqam1lcm9mdXR3Y2V4bW1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA1NDU3MywiZXhwIjoyMDkyNjMwNTczfQ.N_FLYGslgk0cTfmAHPRoQFochgu98q1cTuSbPm61IcU
```

**Password note:** CDSE and CMEMS share the same Copernicus identity. C3S is a separate account — the key format is `UID:api-key-string` found under your CDS profile page.

---

## 1. Problem

Red Tide (Harmful Algal Bloom / HAB) events cause a measurable, predictable spike in respiratory and gastrointestinal emergency cases. This spike hits coastal hospitals with no financial or operational warning, and hits insurers as an unexpected surge in claims.

### Clinical Evidence (Model Calibration Priors)

| Study | Finding | Use in Model |
|-------|---------|-------------|
| Kirkpatrick et al. (2006), Sarasota Memorial Hospital | **54% increase** in respiratory ER admissions among coastal residents (<1.6 km from shore) during bloom vs. non-bloom periods | Stage 3 β coefficient prior |
| UF Center for Coastal Solutions (2026), n=137,930 | **1,320 additional respiratory cases/month** per 400,000 coastal residents during severe bloom | Stage 3 population scaling |
| Hoagland et al. (2014), 16-year Medicare/Medicaid | **9.88 additional respiratory visits** per zip code per bloom month | Stage 3 baseline rate |
| Kirkpatrick et al. (2006) | **1-week lag** between satellite-detectable bloom and ER admission peak | Stage 3 lag term = 7 days |
| Frontiers in Ecology (2021) | Annual illness costs per county: **$60K–$700K**; capitalized up to **$24M** | Stage 4 insurance loss model |

### The Prediction Window

The 1-week lag is the entire product. The satellite detects a bloom forming offshore. Seven days later, emergency departments fill up. TideAlert converts that 7-day window into financial preparation time for hospitals and automatic trigger management for insurers.

---

## 2. Solution

**TideAlert is not a forecast. It is a 3-point data system.**

```
DATA SOURCE 1: Satellite (historical CSVs + live API)
  └─ Sentinel-3 OLCI: chlorophyll-a concentration, daily, 300m
  └─ Sentinel-2 L2A:  NDCI coastal confirmation, 10m
  └─ CMEMS:           SST, salinity, ocean currents
  └─ ERA5:            wind speed/direction, wave height

DATA SOURCE 2: IoT Sensors (mock CSV, same schema as real)
  └─ Temperature, pH, humidity, conductivity,
     dissolved oxygen, nitrate, phosphate
  └─ Location: Ligurian coast sensor array (mocked)

DATA SOURCE 3: Historical Hospital Cases (synthetic CSV calibrated to Florida priors)
  └─ Monthly respiratory ER admissions per coastal zone
  └─ Bloom event labels (date, intensity, duration)
  └─ Asthma prevalence rate per zone

          ┌─────────────────────────────────────────────┐
          │           ML PIPELINE (Python)              │
          │  Stage 1: Bloom Probability (LightGBM)      │
          │  Stage 2: Aerosolisation RRI (Physics)      │
          │  Stage 3: Hospital Surge (Linear Regression)│
          │  Stage 4: Insurance Loss Model              │
          └──────────────────┬──────────────────────────┘
                             │
               ┌─────────────▼──────────────┐
               │     Supabase (Postgres)     │
               │  Storage · API · Realtime   │
               └──────┬──────────────┬───────┘
                      │              │
            ┌─────────▼──┐    ┌──────▼──────────┐
            │  Hospital   │    │  Insurance Co.  │
            │  Frontend   │    │  Frontend       │
            │  (React)    │    │  (React)        │
            └─────────────┘    └─────────────────┘
```

### Business Models

**B2B — Hospital Direct**
TideAlert → Hospital
- Hospital receives: 7-day surge forecast, expected ER admission count, severity tier, staffing/medication recommendations
- Trigger: RRI score updated daily, hospital dashboard refreshes automatically

**B2B2B — Flow A: Insurance as Distribution Layer**
TideAlert → Insurance Company → Hospital (insured client)
- Insurance company subscribes to TideAlert API
- When RRI + IoT confirmation both cross threshold → parametric trigger fires automatically
- Insurance company's system receives a machine-readable bloom event certificate
- Automatic payout issued to insured hospital, no claims adjuster needed
- Hospital receives financial compensation without initiating a claim

---

## 3. Data Sources, File Locations & Acquisition

### Directory Structure

```
/project
├── .env
├── data/
│   ├── raw/
│   │   ├── satellite/
│   │   │   ├── sentinel3_olci_ligurian_2015_2024.csv     ← downloaded by script
│   │   │   ├── sentinel2_ndci_ligurian_2015_2024.csv     ← downloaded by script
│   │   │   ├── cmems_sst_currents_ligurian_2015_2024.csv ← downloaded by script
│   │   │   └── era5_wind_waves_ligurian_2015_2024.csv    ← downloaded by script
│   │   ├── iot/
│   │   │   └── iot_sensor_mock_ligurian_2022_2024.csv    ← generated by script
│   │   └── hospital/
│   │       └── hospital_admissions_ligurian_synthetic.csv← generated by script
│   ├── processed/
│   │   └── merged_features.csv                           ← output of feature_engineering.py
│   └── models/
│       ├── stage1_lgbm.pkl
│       └── stage3_linear.pkl
├── scripts/
│   ├── 01_download_satellite.py
│   ├── 02_generate_iot_mock.py
│   ├── 03_generate_hospital_mock.py
│   ├── 04_feature_engineering.py
│   ├── 05_train_models.py
│   └── 06_run_live_rri.py
├── backend/
│   └── (Supabase edge functions + schema)
├── frontend/
│   ├── hospital/    (React app)
│   └── insurance/   (React app)
└── requirements.txt
```

---

### 3.1 Satellite Data — Download Script (`01_download_satellite.py`)

**Bounding box for all queries:**
```python
BBOX = {
    "lon_min": 7.5,
    "lat_min": 43.7,
    "lon_max": 9.8,
    "lat_max": 44.6
}
DATE_START = "2015-01-01"
DATE_END   = "2024-12-31"
```

#### Sentinel-3 OLCI — Chlorophyll-a
```python
# Library: sentinelhub-py
# pip install sentinelhub

from sentinelhub import SHConfig, SentinelHubRequest, DataCollection, MimeType, BBox, CRS
import os

config = SHConfig()
config.sh_client_id = os.getenv("CDSE_USERNAME")
config.sh_client_secret = os.getenv("CDSE_PASSWORD")
config.sh_base_url = "https://sh.dataspace.copernicus.eu"
config.sh_token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

# Request: monthly chlorophyll-a mean for the bounding box
# Output columns: date, mean_chl_a, max_chl_a, std_chl_a, pixel_count
# Save to: data/raw/satellite/sentinel3_olci_ligurian_2015_2024.csv
```

#### CMEMS — SST, Currents, Salinity, Biogeochemistry
```python
# Library: copernicusmarine
# pip install copernicusmarine

import copernicusmarine
import os

# Dataset IDs to pull:
DATASETS = {
    "sst":           "cmems_mod_med_phy-tem_anfc_4.2km_P1D-m",   # SST daily
    "currents":      "cmems_mod_med_phy-cur_anfc_4.2km_P1D-m",   # u,v surface currents
    "salinity":      "cmems_mod_med_phy-sal_anfc_4.2km_P1D-m",   # salinity
    "chlorophyll":   "cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m",   # chl-a from CMEMS model
    "reanalysis_bgc":"cmems_mod_med_bgc_my_4.2km_P1D-m"          # historical reanalysis
}

# Authentication
copernicusmarine.login(
    username=os.getenv("CMEMS_USERNAME"),
    password=os.getenv("CMEMS_PASSWORD")
)

# For each dataset, subset to BBOX and DATE range
# Output columns per dataset: date, lat, lon, variable_value
# Spatially average to daily scalar for the Ligurian zone
# Save merged to: data/raw/satellite/cmems_sst_currents_ligurian_2015_2024.csv
# Output columns: date, sst_mean, u_current, v_current, salinity_mean, chl_cmems
```

#### ERA5 — Wind Speed, Direction, Wave Height
```python
# Library: cdsapi
# pip install cdsapi

import cdsapi
import os

client = cdsapi.Client(
    url=os.getenv("CDS_URL"),
    key=os.getenv("CDS_KEY")
)

# Request variables:
VARIABLES = [
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "significant_height_of_combined_wind_waves_and_swell",
    "mean_wave_direction"
]

# Area: [lat_max, lon_min, lat_min, lon_max] = [44.6, 7.5, 43.7, 9.8]
# Format: netCDF → convert to CSV
# Output columns: date, wind_u, wind_v, wind_speed, wind_direction, wave_height
# Save to: data/raw/satellite/era5_wind_waves_ligurian_2015_2024.csv
```

**Fallback if API calls fail:** Claude Code generates synthetic CSVs using known statistical properties of the Ligurian coast (chl-a seasonal peaks in July–September, SST range 13–26°C, documented bloom events 2015–2024 from ISPRA records). These are clearly marked `_synthetic` in the filename and flagged in the UI.

---

### 3.2 IoT Sensor Mock Data (`02_generate_iot_mock.py`)

**Output file:** `data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv`

#### Schema

```python
columns = [
    "timestamp",          # datetime, hourly frequency
    "sensor_id",          # string: "LIG_001" to "LIG_005" (5 virtual sensors along coast)
    "lat",                # float: sensor latitude
    "lon",                # float: sensor longitude
    "temperature_c",      # float: water temperature in Celsius
    "ph",                 # float: water pH (typical seawater 7.9–8.3, drops during bloom)
    "humidity_pct",       # float: relative humidity % (air, at sensor housing)
    "conductivity_ms_cm", # float: electrical conductivity mS/cm (proxy for salinity)
    "dissolved_oxygen_mg_l", # float: DO mg/L (drops sharply during active bloom)
    "nitrate_umol_l",     # float: nitrate µmol/L (elevated pre-bloom, nutrient driver)
    "phosphate_umol_l",   # float: phosphate µmol/L (same — Redfield ratio nutrient)
    "bloom_label"         # int: 0 = no bloom, 1 = bloom active (for training validation)
]
```

#### Generation Rules (Statistically Grounded)

```python
import numpy as np
import pandas as pd

# Baseline ranges (Ligurian Sea reference values)
BASELINE = {
    "temperature_c":        {"mean": 18.5, "std": 4.2, "summer_peak": 26.0, "winter_min": 13.0},
    "ph":                   {"bloom": 7.85, "no_bloom": 8.15},   # acidification during bloom
    "humidity_pct":         {"mean": 72.0, "std": 8.0},
    "conductivity_ms_cm":   {"mean": 47.5, "std": 1.2},          # Mediterranean salinity proxy
    "dissolved_oxygen_mg_l":{"bloom": 4.2, "no_bloom": 7.8},     # hypoxia during bloom
    "nitrate_umol_l":       {"pre_bloom": 8.5, "bloom": 2.1, "baseline": 1.5},  # consumed during bloom
    "phosphate_umol_l":     {"pre_bloom": 0.45, "bloom": 0.12, "baseline": 0.08}
}

# Bloom events to embed (matching documented ISPRA events):
BLOOM_EVENTS = [
    {"start": "2022-07-15", "end": "2022-08-10", "sensor_ids": ["LIG_001", "LIG_002"]},
    {"start": "2023-08-03", "end": "2023-08-28", "sensor_ids": ["LIG_001", "LIG_002", "LIG_003"]},
    {"start": "2024-07-20", "end": "2024-08-15", "sensor_ids": ["LIG_002", "LIG_003", "LIG_004"]},
]

# Add Gaussian noise to all readings
# Add hourly autocorrelation (values don't jump randomly)
# Add diurnal cycle to temperature and DO (higher during day)
# Mark bloom_label = 1 for rows within BLOOM_EVENTS date ranges
```

---

### 3.3 Hospital Admissions Mock Data (`03_generate_hospital_mock.py`)

**Output file:** `data/raw/hospital/hospital_admissions_ligurian_synthetic.csv`

**Generation approach:** Synthetic data calibrated to Florida priors, scaled to Ligurian coastal population.

```python
# Ligurian coast population within 1.6 km of shore: ~180,000 (Genoa coastal districts)
# Asthma prevalence rate Italy: 6.5% (ISTAT national health survey)
# Baseline monthly respiratory ER admissions (non-bloom): ~420/month (scaled from Florida rates)
# Bloom-period increase: +54% for coastal population subgroup (Kirkpatrick prior)

columns = [
    "year_month",              # string: "2015-01", "2015-02", ...
    "hospital_id",             # string: "OSP_SAN_MARTINO", "OSP_GALLIERA", "OSP_VILLA_SCASSI"
    "respiratory_admissions",  # int: total respiratory ER admissions that month
    "gi_admissions",           # int: gastrointestinal admissions
    "coastal_respiratory",     # int: admissions from patients with coastal zip codes
    "bloom_active",            # int: 0/1 — was a bloom active this month?
    "bloom_intensity",         # float: 0–1 scale, 0 if no bloom
    "bloom_days_in_month",     # int: number of days bloom was active
    "rri_mean_month",          # float: mean RRI for that month (backfilled from satellite)
    "asthma_patients_pct",     # float: 6.5 (constant, can be varied per hospital catchment)
]

# Generation rules:
# Non-bloom months: respiratory_admissions ~ Normal(420, 45)
# Bloom months: respiratory_admissions ~ Normal(420 * 1.54, 60)  [54% increase prior]
# coastal_respiratory = respiratory_admissions * 0.35 during bloom, * 0.22 baseline
# Embed known bloom months from ISPRA records (2015–2024)
# gi_admissions = respiratory_admissions * 0.41  [Hoagland ratio: 4.06/9.88]
```

---

## 4. ML Pipeline

### Stage 1 — Bloom Probability Model

**Script:** `scripts/05_train_models.py` — Section A  
**Model:** LightGBM binary classifier  
**Output:** `data/models/stage1_lgbm.pkl`

```python
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
from sklearn.calibration import CalibratedClassifierCV

FEATURES = [
    "chl_a_mean",           # Sentinel-3 OLCI
    "chl_a_7d_rate",        # rate of change — bloom lifecycle indicator
    "chl_a_consecutive_days",# consecutive days above threshold — mat formation proxy
    "sst_mean",             # CMEMS
    "sst_anomaly",          # deviation from seasonal baseline
    "u_current",            # CMEMS surface current eastward
    "v_current",            # CMEMS surface current northward
    "salinity_mean",        # CMEMS
    "ndci",                 # Sentinel-2 L2A coastal confirmation
    "day_of_year_sin",      # seasonal encoding
    "day_of_year_cos",      # seasonal encoding
    # IoT features (daily aggregated from hourly)
    "iot_temperature_mean",
    "iot_ph_mean",          # pH drop signals active bloom
    "iot_dissolved_oxygen_mean",  # DO drop = bloom metabolic activity
    "iot_nitrate_mean",     # pre-bloom nutrient spike precedes bloom
    "iot_phosphate_mean",
]

TARGET = "bloom_label"      # 1 = bloom active, 0 = no bloom

# Train/validation split: TimeSeriesSplit (5 folds) — never use future data to predict past
# Calibrate output probabilities with CalibratedClassifierCV (isotonic)
# Save: stage1_lgbm.pkl

PARAMS = {
    "objective": "binary",
    "metric": "auc",
    "learning_rate": 0.05,
    "num_leaves": 31,
    "min_data_in_leaf": 20,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "verbose": -1
}
```

**Label construction:**
```python
# Bloom label = 1 if ANY of the following:
#   - chl_a_mean > 10 µg/L (Sentinel-3) AND sst_mean > 22°C (Ostreopsis growth threshold)
#   - iot_dissolved_oxygen_mean < 5 mg/L (hypoxia indicator)
#   - Date falls within a documented ISPRA bloom event window
# Apply 7-day forward-looking label: if bloom occurs within next 7 days, label today as 1
```

---

### Stage 2 — Aerosolisation Risk Index (Physics Layer)

**Script:** `scripts/06_run_live_rri.py` — called at inference time, not trained  
**No ML — pure deterministic formula**

```python
import numpy as np

def calculate_rri(bloom_probability, wind_speed, wind_direction,
                  shore_normal_degrees, wave_height, chl_a_rate_of_change):
    """
    Respiratory Risk Index: 0–100 scale
    Green: 0–30 | Amber: 31–60 | Red: 61–100 | Critical: >85
    """
    # Wind component toward shore
    angle_diff = np.radians(wind_direction - shore_normal_degrees)
    wind_onshore = np.cos(angle_diff) * wind_speed
    wind_onshore = max(0, wind_onshore)  # only onshore wind matters

    # Wave height multiplier (capped at 2×)
    wave_factor = min(wave_height / 0.5, 2.0)

    # Toxin stage: bloom decline = cell lysis = peak toxin release
    # chl_a_rate_of_change < 0 means bloom is declining
    toxin_multiplier = 1.5 if chl_a_rate_of_change < 0 else 1.0

    # Normalize wind to 0–1 (reference max: 15 m/s onshore)
    wind_normalized = min(wind_onshore / 15.0, 1.0)

    rri = bloom_probability * wind_normalized * wave_factor * toxin_multiplier * 100
    return min(round(rri, 1), 100)

# Shore normal for Ligurian coast: approximately 160° (coast faces roughly southeast)
LIGURIAN_SHORE_NORMAL = 160
```

---

### Stage 3 — Hospital Surge Prediction Model

**Script:** `scripts/05_train_models.py` — Section B  
**Model:** Linear Regression with 7-day lag term  
**Output:** `data/models/stage3_linear.pkl`

```python
from sklearn.linear_model import Ridge
import pandas as pd

# Features
FEATURES_SURGE = [
    "rri_lag7",              # RRI score from 7 days ago (the documented biological lag)
    "coastal_population",    # population within 1.6 km of shore (constant: 180000 for Genoa)
    "asthma_prevalence_pct", # 6.5 for Ligurian coast (ISTAT)
    "bloom_duration_days",   # how many consecutive days bloom has been active
    "month_sin",             # seasonal component
    "month_cos",
]

TARGET_SURGE = "respiratory_admissions"  # from hospital mock CSV

# Calibration priors to encode as soft constraints:
# Intercept should approximate 420 (baseline monthly admissions)
# Coefficient on rri_lag7 should produce ~54% increase at RRI=85

# Training: fit on 2015–2022, validate on 2022–2024
# Use Ridge regression (L2) to prevent overfitting on small dataset

# Output per inference:
def surge_output(model, features_today):
    predicted_admissions = model.predict(features_today)
    baseline = 420
    additional = predicted_admissions - baseline
    severity = (
        "LOW SURGE"      if additional < 50  else
        "MODERATE SURGE" if additional < 120 else
        "HIGH SURGE"
    )
    return {
        "expected_total_admissions": int(predicted_admissions),
        "expected_additional_vs_baseline": int(additional),
        "severity_tier": severity,
        "recommended_extra_nursing_shifts": max(0, int(additional / 25)),
        "recommended_medication_stock_eur": max(0, int(additional * 95)),
        "confidence_interval_low":  int(predicted_admissions * 0.85),
        "confidence_interval_high": int(predicted_admissions * 1.15),
    }
```

---

### Stage 4 — Insurance Economic Loss & Parametric Trigger Model

**Script:** `scripts/06_run_live_rri.py` — inference time  
**No training required — deterministic model**

#### Trigger Logic (Both Conditions Must Be Met)

```python
def evaluate_parametric_trigger(rri_score, rri_consecutive_days,
                                 iot_dissolved_oxygen, iot_ph):
    """
    B2B2B Flow A: TideAlert → Insurance → Hospital
    Both satellite (RRI) AND IoT confirmation required to fire trigger.
    Prevents false positives from either source alone.
    """
    # Condition 1: Satellite-derived RRI
    rri_trigger = (rri_score > 70) and (rri_consecutive_days >= 5)

    # Condition 2: IoT sensor confirmation
    # DO < 5 mg/L = active bloom metabolic activity
    # pH < 7.95 = acidification consistent with bloom
    iot_trigger = (iot_dissolved_oxygen < 5.0) and (iot_ph < 7.95)

    trigger_fired = rri_trigger and iot_trigger

    return {
        "trigger_fired": trigger_fired,
        "rri_condition_met": rri_trigger,
        "iot_condition_met": iot_trigger,
        "rri_score": rri_score,
        "rri_days_above_threshold": rri_consecutive_days,
        "iot_dissolved_oxygen": iot_dissolved_oxygen,
        "iot_ph": iot_ph,
    }
```

#### Payout Calculation

```python
def calculate_payout(rri_score, bloom_duration_days, hospital_id,
                     insured_daily_operational_cost_eur):
    """
    Parametric payout tiers — no claims adjustment needed.
    Hospital receives automatic compensation when trigger fires.
    """
    # Baseline: each bloom day beyond 17/month reduces hospital revenue ~1.5%
    # (adapted from Florida lodging data — conservative proxy for healthcare operational disruption)

    if rri_score > 85 and bloom_duration_days >= 7:
        payout_pct = 1.00   # Critical: 100% of agreed daily coverage
    elif rri_score > 70 and bloom_duration_days >= 5:
        payout_pct = 0.75   # Red: 75% coverage
    elif rri_score > 60 and bloom_duration_days >= 3:
        payout_pct = 0.25   # Amber: 25% coverage
    else:
        payout_pct = 0.0

    # Expected surge cost = additional admissions × avg ER cost per patient
    # Average European coastal ER respiratory visit: ~€850 (Eurostat health accounts)
    surge_additional = calculate_surge_additional_admissions()  # from Stage 3
    expected_surge_cost = surge_additional * 850

    payout_eur = min(
        payout_pct * insured_daily_operational_cost_eur * bloom_duration_days,
        expected_surge_cost * 1.2  # cap at 120% of modelled surge cost
    )

    return {
        "payout_tier": ("CRITICAL" if payout_pct == 1.0 else
                         "RED" if payout_pct == 0.75 else
                         "AMBER" if payout_pct == 0.25 else "NONE"),
        "payout_pct_of_coverage": payout_pct,
        "calculated_payout_eur": round(payout_eur, 2),
        "bloom_duration_days": bloom_duration_days,
        "trigger_basis": "RRI_AND_IOT_CONFIRMED",
        "event_certificate_id": f"TA-{hospital_id}-{pd.Timestamp.now().strftime('%Y%m%d%H%M')}",
    }
```

---

## 5. Database Schema (Supabase / Postgres)

Run these migrations before starting the backend.

```sql
-- Coastal zone definitions
CREATE TABLE coastal_zones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,           -- e.g. "Genoa Ligurian Coast"
    geom        GEOMETRY(POLYGON, 4326), -- PostGIS polygon
    shore_normal_degrees FLOAT,          -- for wind onshore calculation
    coastal_population   INT,
    asthma_prevalence_pct FLOAT
);

-- Daily RRI scores per zone
CREATE TABLE rri_scores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id     UUID REFERENCES coastal_zones(id),
    date        DATE NOT NULL,
    rri_score   FLOAT,
    severity    TEXT CHECK (severity IN ('GREEN','AMBER','RED','CRITICAL')),
    bloom_probability FLOAT,
    wind_speed  FLOAT,
    wave_height FLOAT,
    chl_a_mean  FLOAT,
    rri_consecutive_days INT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- IoT sensor readings (mock data ingested here)
CREATE TABLE sensor_readings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sensor_id       TEXT NOT NULL,
    zone_id         UUID REFERENCES coastal_zones(id),
    timestamp       TIMESTAMPTZ NOT NULL,
    temperature_c   FLOAT,
    ph              FLOAT,
    humidity_pct    FLOAT,
    conductivity_ms_cm FLOAT,
    dissolved_oxygen_mg_l FLOAT,
    nitrate_umol_l  FLOAT,
    phosphate_umol_l FLOAT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Hospital surge forecasts
CREATE TABLE hospital_surge_forecasts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id             TEXT NOT NULL,
    zone_id                 UUID REFERENCES coastal_zones(id),
    forecast_date           DATE NOT NULL,      -- the date this forecast is FOR
    generated_at            TIMESTAMPTZ DEFAULT NOW(),
    expected_admissions     INT,
    additional_vs_baseline  INT,
    severity_tier           TEXT CHECK (severity_tier IN ('LOW SURGE','MODERATE SURGE','HIGH SURGE')),
    extra_nursing_shifts    INT,
    medication_stock_eur    INT,
    ci_low                  INT,
    ci_high                 INT
);

-- Insurance parametric trigger events
CREATE TABLE trigger_events (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_certificate_id    TEXT UNIQUE NOT NULL,
    zone_id                 UUID REFERENCES coastal_zones(id),
    hospital_id             TEXT NOT NULL,
    insurer_id              TEXT NOT NULL,
    triggered_at            TIMESTAMPTZ DEFAULT NOW(),
    trigger_fired           BOOLEAN,
    rri_condition_met       BOOLEAN,
    iot_condition_met       BOOLEAN,
    rri_score               FLOAT,
    rri_days_above_threshold INT,
    iot_dissolved_oxygen    FLOAT,
    iot_ph                  FLOAT,
    payout_tier             TEXT,
    payout_pct              FLOAT,
    calculated_payout_eur   FLOAT,
    bloom_duration_days     INT,
    status                  TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','DISPUTED'))
);

-- Enable RLS on all tables
ALTER TABLE rri_scores              ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_surge_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE trigger_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings         ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX ON rri_scores (zone_id, date DESC);
CREATE INDEX ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX ON hospital_surge_forecasts (hospital_id, forecast_date DESC);
CREATE INDEX ON trigger_events (hospital_id, triggered_at DESC);
```

---

## 6. Full Tech Stack

| Layer | Technology | Version | Install |
|-------|-----------|---------|---------|
| **ML / Data** | Python | 3.11+ | — |
| | LightGBM | latest | `pip install lightgbm` |
| | scikit-learn | latest | `pip install scikit-learn` |
| | pandas | latest | `pip install pandas` |
| | xarray | latest | `pip install xarray netCDF4` |
| | numpy | latest | `pip install numpy` |
| | sentinelhub | latest | `pip install sentinelhub` |
| | copernicusmarine | latest | `pip install copernicusmarine` |
| | cdsapi | latest | `pip install cdsapi` |
| | python-dotenv | latest | `pip install python-dotenv` |
| | joblib | latest | `pip install joblib` |
| **Backend** | Supabase | latest | dashboard.supabase.com |
| | Postgres + PostGIS | via Supabase | enabled in Supabase dashboard |
| | Supabase Edge Functions | Deno | `supabase functions new` |
| | Supabase Realtime | via Supabase | enabled per table |
| **Frontend — Hospital** | React + Vite | 18+ | `npm create vite@latest` |
| | Mapbox GL JS | latest | `npm install mapbox-gl` |
| | Recharts | latest | `npm install recharts` |
| | Supabase JS client | latest | `npm install @supabase/supabase-js` |
| | Tailwind CSS | latest | `npm install tailwindcss` |
| **Frontend — Insurance** | React + Vite | 18+ | same as above |
| | Same dependencies | — | same as above |
| **Notifications** | Supabase Realtime | — | WebSocket subscription |
| | Webhook delivery | Supabase Edge Function | POST to simulated insurer endpoint |
| | DB log | trigger_events table | on every evaluation |

**`requirements.txt`:**
```
lightgbm
scikit-learn
pandas
xarray
netCDF4
numpy
sentinelhub
copernicusmarine
cdsapi
python-dotenv
joblib
requests
scipy
```

---

## 7. Frontend Specifications

### 7.1 Hospital Dashboard (`/frontend/hospital/`)

**Pages:**
1. **Overview** — Current RRI score for Genoa Ligurian zone, large colour-coded indicator (Green/Amber/Red/Critical), last updated timestamp
2. **7-Day Surge Forecast** — Bar chart (Recharts) showing expected daily admissions for next 7 days with confidence interval shading. Severity tier shown prominently. Recommended extra nursing shifts and medication stock in €.
3. **Sensor Data** — Line charts for the 7 IoT variables over the last 30 days. Highlights sensor readings that contributed to trigger conditions.
4. **Historical** — Monthly admissions chart (actual vs. model prediction for past months). Allows replay of documented bloom events.

**Realtime:** Subscribe to `rri_scores` table via Supabase Realtime. Update Overview page automatically when a new score is inserted.

---

### 7.2 Insurance Dashboard (`/frontend/insurance/`)

**Pages:**
1. **Portfolio Overview** — Map (Mapbox GL JS) showing all insured hospitals in the Ligurian zone, colour-coded by current RRI exposure. Aggregate portfolio RRI exposure score.
2. **Trigger Monitor** — Live feed of trigger evaluations. Shows both RRI condition and IoT condition status (green/red checkmarks). Fires visual alert + sound when trigger fires.
3. **Trigger Events Log** — Table of all historical trigger_events with certificate IDs, payout amounts, status (PENDING/PAID/DISPUTED).
4. **Payout Simulation** — Input fields for insured daily operational cost → real-time payout calculation as RRI and bloom duration sliders are adjusted.

**Three outputs when trigger fires (all happen simultaneously):**
- Row inserted into `trigger_events` table (DB log)
- Supabase Edge Function POSTs to `/api/simulated-insurer-webhook` with the event certificate JSON
- Realtime notification pushed to the Insurance dashboard UI (red banner with payout amount)

---

## 8. Script Execution Order (Claude Code Run Sequence)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Download real satellite data (reads .env for credentials)
python scripts/01_download_satellite.py
# → writes: data/raw/satellite/*.csv
# → if any API fails, writes: data/raw/satellite/*_synthetic_fallback.csv

# 3. Generate IoT mock data
python scripts/02_generate_iot_mock.py
# → writes: data/raw/iot/iot_sensor_mock_ligurian_2022_2024.csv

# 4. Generate hospital admissions mock data
python scripts/03_generate_hospital_mock.py
# → writes: data/raw/hospital/hospital_admissions_ligurian_synthetic.csv

# 5. Feature engineering — merge all three sources into one training CSV
python scripts/04_feature_engineering.py
# → writes: data/processed/merged_features.csv

# 6. Train models
python scripts/05_train_models.py
# → writes: data/models/stage1_lgbm.pkl
# → writes: data/models/stage3_linear.pkl
# → prints: AUC score (Stage 1), RMSE (Stage 3), feature importance

# 7. Run live RRI calculation (uses today's satellite + IoT data)
python scripts/06_run_live_rri.py
# → calculates RRI for today
# → evaluates parametric trigger
# → inserts results into Supabase tables

# 8. Start frontends
cd frontend/hospital  && npm install && npm run dev   # port 5173
cd frontend/insurance && npm install && npm run dev   # port 5174
```

---

## 9. Hackathon MVP Scope — What Is In and What Is Out

### IN (build this)
- All 4 ML stages
- 3-point data pipeline (satellite + IoT mock + hospital mock)
- Supabase schema + edge functions
- Hospital dashboard (2 pages minimum: Overview + 7-day forecast)
- Insurance dashboard (2 pages minimum: Trigger Monitor + Events Log)
- Parametric trigger with all 3 outputs (DB log + webhook + UI notification)

### OUT (do not build for MVP)
- Hotels, beaches, aquaculture, municipalities — no other client types
- B2C features of any kind
- MDR/medical device compliance flows
- Multi-region support (Ligurian coast only)
- User authentication/login (use hardcoded demo tokens for the hackathon)
- Mobile responsiveness (desktop only for demo)

---

## 10. Demo Replay — 2005 Genoa Outbreak

Load pre-computed RRI scores for July–August 2005 (generated from historical CMEMS data) and replay them at 1 day per second in the Hospital dashboard. The model should show RRI climbing to RED/CRITICAL approximately 7 days before the documented peak of 200+ ER admissions. This is the centrepiece demo moment for judges.

```python
# Replay mode toggle in UI:
# Button: "Replay 2005 Genoa Outbreak"
# Reads from: data/raw/replay/genoa_2005_rri_sequence.csv
# Animates RRI chart day-by-day with a 800ms interval
# Shows hospital surge forecast updating in real time
# Shows parametric trigger firing on day 8 of the replay
```

---

*TideAlert PRD v2.0 | Claude Code Execution Spec | April 2026*  
*Edit [BRACKETED] fields with real values before build start.*
