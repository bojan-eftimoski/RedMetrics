"""
Phase 1 — Satellite & climate data acquisition.

Downloads four data sources for the Ligurian coast bounding box (2015-01-01 → 2024-12-31):
  1. Sentinel-3 OLCI chlorophyll-a   (CDSE / Sentinel Hub Statistical API)
  2. Sentinel-2 L2A NDCI              (CDSE / Sentinel Hub Statistical API)
  3. CMEMS Mediterranean fields       (copernicusmarine library)
  4. ERA5 wind & wave                 (cdsapi)

Fallback rule (per TASK_LIST.md §1.6):
  If ANY source fails, the script exits 1 with a named error. No synthetic
  fallback is generated automatically — the failure is surfaced for triage.

Run:
    python scripts/01_download_satellite.py
"""
from __future__ import annotations

import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))
load_dotenv(REPO_ROOT / ".env")

from _cdse_auth import get_cdse_token  # noqa: E402

# ─── Configuration ────────────────────────────────────────────────────────
BBOX = {"lon_min": 7.5, "lat_min": 43.7, "lon_max": 9.8, "lat_max": 44.6}
DATE_START = "2015-01-01"
DATE_END = "2024-12-31"

SATELLITE_DIR = REPO_ROOT / "data" / "raw" / "satellite"
SATELLITE_DIR.mkdir(parents=True, exist_ok=True)

SH_STATISTICAL_API = "https://sh.dataspace.copernicus.eu/api/v1/statistics"


# ─── Sentinel-3 OLCI chlorophyll-a ────────────────────────────────────────
S3_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["CHL_NN", "dataMask"] }],
    output: [
      { id: "chl",  bands: 1, sampleType: "FLOAT32" },
      { id: "mask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(s) {
  return { chl: [s.CHL_NN], mask: [s.dataMask] };
}
"""


def _statistical_api_request(
    payload: dict, source: str, max_retries: int = 3
) -> dict:
    """Generic Sentinel Hub Statistical API call with retry on 429/5xx."""
    last_err = ""
    for attempt in range(max_retries):
        token = get_cdse_token()
        resp = requests.post(
            SH_STATISTICAL_API,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=120,
        )
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code in (429, 500, 502, 503, 504):
            backoff = 5 * (attempt + 1)
            last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
            time.sleep(backoff)
            continue
        raise RuntimeError(
            f"{source} request failed: HTTP {resp.status_code} — {resp.text[:300]}"
        )
    raise RuntimeError(f"{source} failed after {max_retries} retries: {last_err}")


def download_sentinel3_chla() -> Path:
    """Monthly chl-a stats over BBOX 2015–2024 from Sentinel-3 OLCI L2 (CHL_NN)."""
    out = SATELLITE_DIR / "sentinel3_olci_ligurian_2015_2024.csv"
    print(f"[S3-OLCI] Downloading monthly chl-a → {out.name}")

    payload = {
        "input": {
            "bounds": {
                "bbox": [
                    BBOX["lon_min"],
                    BBOX["lat_min"],
                    BBOX["lon_max"],
                    BBOX["lat_max"],
                ],
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-3-olci-l2-wfr",
                    "dataFilter": {
                        "timeRange": {
                            "from": f"{DATE_START}T00:00:00Z",
                            "to": f"{DATE_END}T23:59:59Z",
                        }
                    },
                }
            ],
        },
        "aggregation": {
            "timeRange": {
                "from": f"{DATE_START}T00:00:00Z",
                "to": f"{DATE_END}T23:59:59Z",
            },
            "aggregationInterval": {"of": "P1M"},
            "evalscript": S3_EVALSCRIPT,
            "resx": 300,
            "resy": 300,
        },
        "calculations": {
            "chl": {
                "statistics": {
                    "default": {
                        "percentiles": {"k": [50.0]},
                    }
                }
            }
        },
    }

    result = _statistical_api_request(payload, source="Sentinel-3 OLCI")

    rows = []
    for entry in result.get("data", []):
        interval = entry.get("interval", {})
        outputs = entry.get("outputs", {})
        chl_stats = outputs.get("chl", {}).get("bands", {}).get("B0", {}).get("stats", {})
        if not chl_stats or chl_stats.get("sampleCount", 0) == 0:
            continue
        rows.append(
            {
                "date": interval.get("from", "")[:10],
                "mean_chl_a": chl_stats.get("mean"),
                "max_chl_a": chl_stats.get("max"),
                "std_chl_a": chl_stats.get("stDev"),
                "pixel_count": chl_stats.get("sampleCount"),
            }
        )

    if not rows:
        raise RuntimeError("Sentinel-3 OLCI returned 0 valid intervals")

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    df.to_csv(out, index=False)
    print(f"[S3-OLCI] OK — {len(df)} monthly rows")
    return out


# ─── Sentinel-2 L2A NDCI ──────────────────────────────────────────────────
S2_EVALSCRIPT = """//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B05", "SCL", "dataMask"] }],
    output: [
      { id: "ndci", bands: 1, sampleType: "FLOAT32" },
      { id: "mask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(s) {
  // Restrict to water pixels (SCL == 6) within valid mask
  var isWater = (s.SCL == 6) && (s.dataMask == 1);
  if (!isWater) return { ndci: [NaN], mask: [0] };
  var denom = (s.B05 + s.B04);
  if (denom <= 0) return { ndci: [NaN], mask: [0] };
  return { ndci: [(s.B05 - s.B04) / denom], mask: [1] };
}
"""


def download_sentinel2_ndci() -> Path:
    """Monthly NDCI mean over coastal water pixels (SCL=6) from Sentinel-2 L2A."""
    out = SATELLITE_DIR / "sentinel2_ndci_ligurian_2015_2024.csv"
    print(f"[S2-NDCI] Downloading monthly NDCI → {out.name}")

    payload = {
        "input": {
            "bounds": {
                "bbox": [
                    BBOX["lon_min"],
                    BBOX["lat_min"],
                    BBOX["lon_max"],
                    BBOX["lat_max"],
                ],
                "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"},
            },
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": f"{DATE_START}T00:00:00Z",
                            "to": f"{DATE_END}T23:59:59Z",
                        },
                        "maxCloudCoverage": 30,
                    },
                }
            ],
        },
        "aggregation": {
            "timeRange": {
                "from": f"{DATE_START}T00:00:00Z",
                "to": f"{DATE_END}T23:59:59Z",
            },
            "aggregationInterval": {"of": "P1M"},
            "evalscript": S2_EVALSCRIPT,
            "resx": 60,
            "resy": 60,
        },
        "calculations": {"ndci": {"statistics": {"default": {}}}},
    }

    result = _statistical_api_request(payload, source="Sentinel-2 NDCI")

    rows = []
    for entry in result.get("data", []):
        interval = entry.get("interval", {})
        outputs = entry.get("outputs", {})
        ndci_stats = outputs.get("ndci", {}).get("bands", {}).get("B0", {}).get("stats", {})
        if not ndci_stats or ndci_stats.get("sampleCount", 0) == 0:
            continue
        rows.append(
            {
                "date": interval.get("from", "")[:10],
                "ndci_mean": ndci_stats.get("mean"),
                "ndci_coastal_max": ndci_stats.get("max"),
                "ndci_pixel_count": ndci_stats.get("sampleCount"),
            }
        )

    if not rows:
        raise RuntimeError("Sentinel-2 NDCI returned 0 valid intervals")

    df = pd.DataFrame(rows).sort_values("date").reset_index(drop=True)
    df.to_csv(out, index=False)
    print(f"[S2-NDCI] OK — {len(df)} monthly rows")
    return out


# ─── CMEMS Mediterranean fields ───────────────────────────────────────────
CMEMS_DATASETS = {
    "sst": {
        "id": "cmems_mod_med_phy-tem_anfc_4.2km_P1D-m",
        "vars": ["thetao"],
        "depth_max": 1.5,
    },
    "currents": {
        "id": "cmems_mod_med_phy-cur_anfc_4.2km_P1D-m",
        "vars": ["uo", "vo"],
        "depth_max": 1.5,
    },
    "salinity": {
        "id": "cmems_mod_med_phy-sal_anfc_4.2km_P1D-m",
        "vars": ["so"],
        "depth_max": 1.5,
    },
    "chlorophyll": {
        "id": "cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m",
        "vars": ["chl"],
        "depth_max": 1.5,
    },
}

CMEMS_REANALYSIS = {
    "id": "cmems_mod_med_bgc_my_4.2km_P1D-m",
    "vars": ["chl"],
    "depth_max": 1.5,
}


def _cmems_subset_to_daily_scalar(dataset_id: str, vars_: list[str], depth_max: float) -> pd.DataFrame:
    """Use copernicusmarine to subset to BBOX, then spatial-average to one scalar per day."""
    import copernicusmarine  # local import keeps top-level fast

    print(f"   subset {dataset_id} (vars={vars_})")
    ds = copernicusmarine.open_dataset(
        dataset_id=dataset_id,
        variables=vars_,
        minimum_longitude=BBOX["lon_min"],
        maximum_longitude=BBOX["lon_max"],
        minimum_latitude=BBOX["lat_min"],
        maximum_latitude=BBOX["lat_max"],
        start_datetime=f"{DATE_START}T00:00:00",
        end_datetime=f"{DATE_END}T23:59:59",
        minimum_depth=0.0,
        maximum_depth=depth_max,
    )

    # Spatial mean across lat/lon, surface depth
    if "depth" in ds.dims:
        ds = ds.isel(depth=0)
    df = ds.mean(dim=["latitude", "longitude"], skipna=True).to_dataframe().reset_index()
    df["date"] = pd.to_datetime(df["time"]).dt.date.astype(str)
    keep = ["date"] + vars_
    return df[keep]


def download_cmems() -> Path:
    """Daily Ligurian-zone-mean SST, currents, salinity, chlorophyll."""
    out = SATELLITE_DIR / "cmems_sst_currents_ligurian_2015_2024.csv"
    print(f"[CMEMS] Downloading daily fields → {out.name}")

    daily = None
    for label, cfg in CMEMS_DATASETS.items():
        df_ = _cmems_subset_to_daily_scalar(cfg["id"], cfg["vars"], cfg["depth_max"])
        # Rename to canonical PRD column names
        rename_map = {
            "thetao": "sst_mean",
            "uo": "u_current",
            "vo": "v_current",
            "so": "salinity_mean",
            "chl": "chl_cmems",
        }
        df_ = df_.rename(columns=rename_map)
        daily = df_ if daily is None else daily.merge(df_, on="date", how="outer")

    # Reanalysis BGC for pre-2022 chl_cmems gap-fill if needed
    try:
        df_re = _cmems_subset_to_daily_scalar(
            CMEMS_REANALYSIS["id"], CMEMS_REANALYSIS["vars"], CMEMS_REANALYSIS["depth_max"]
        )
        df_re = df_re.rename(columns={"chl": "chl_cmems_reanalysis"})
        daily = daily.merge(df_re, on="date", how="left")
        # Use reanalysis where the analysis-and-forecast chl is missing
        if "chl_cmems" in daily.columns and "chl_cmems_reanalysis" in daily.columns:
            daily["chl_cmems"] = daily["chl_cmems"].fillna(daily["chl_cmems_reanalysis"])
            daily = daily.drop(columns=["chl_cmems_reanalysis"])
    except Exception as e:
        # Non-fatal — analysis-and-forecast chl already provides coverage from 2022+.
        print(f"[CMEMS] reanalysis BGC skipped: {e}")

    if daily is None or daily.empty:
        raise RuntimeError("CMEMS returned no data after merge")

    daily = daily.sort_values("date").reset_index(drop=True)
    daily.to_csv(out, index=False)
    print(f"[CMEMS] OK — {len(daily)} daily rows")
    return out


# ─── ERA5 wind & wave ─────────────────────────────────────────────────────
def download_era5() -> Path:
    """Hourly ERA5 wind/wave for BBOX, aggregated to daily."""
    import cdsapi  # type: ignore

    out = SATELLITE_DIR / "era5_wind_waves_ligurian_2015_2024.csv"
    nc_path = SATELLITE_DIR / "_era5_tmp.nc"
    print(f"[ERA5] Downloading wind/wave → {out.name}")

    cds_key = os.getenv("CDS_KEY", "")
    if not cds_key or cds_key.startswith("YOUR_UID") or "PLACEHOLDER" in cds_key.upper():
        raise RuntimeError(
            "CDS_KEY missing or placeholder. "
            "Get the UUID key at https://cds.climate.copernicus.eu/profile"
        )

    client = cdsapi.Client(url=os.getenv("CDS_URL"), key=cds_key, quiet=True)

    years = [str(y) for y in range(2015, 2025)]
    months = [f"{m:02d}" for m in range(1, 13)]
    days = [f"{d:02d}" for d in range(1, 32)]

    client.retrieve(
        "reanalysis-era5-single-levels",
        {
            "product_type": ["reanalysis"],
            "format": "netcdf",
            "variable": [
                "10m_u_component_of_wind",
                "10m_v_component_of_wind",
                "significant_height_of_combined_wind_waves_and_swell",
                "mean_wave_direction",
            ],
            "year": years,
            "month": months,
            "day": days,
            "time": ["00:00", "06:00", "12:00", "18:00"],
            "area": [BBOX["lat_max"], BBOX["lon_min"], BBOX["lat_min"], BBOX["lon_max"]],
        },
        str(nc_path),
    )

    import xarray as xr  # type: ignore

    ds = xr.open_dataset(nc_path)
    # Spatial mean
    spatial_dims = [d for d in ("latitude", "longitude", "lat", "lon") if d in ds.dims]
    ds_mean = ds.mean(dim=spatial_dims, skipna=True)
    df = ds_mean.to_dataframe().reset_index()
    time_col = "time" if "time" in df.columns else "valid_time"
    df["date"] = pd.to_datetime(df[time_col]).dt.date.astype(str)

    daily = df.groupby("date", as_index=False).mean(numeric_only=True)
    rename = {
        "u10": "wind_u",
        "v10": "wind_v",
        "swh": "wave_height",
        "mwd": "wave_direction",
    }
    daily = daily.rename(columns=rename)
    daily["wind_speed"] = np.sqrt(daily["wind_u"] ** 2 + daily["wind_v"] ** 2)
    daily["wind_direction"] = (np.degrees(np.arctan2(-daily["wind_u"], -daily["wind_v"])) + 360) % 360
    keep = ["date", "wind_u", "wind_v", "wind_speed", "wind_direction", "wave_height"]
    daily = daily[[c for c in keep if c in daily.columns]]
    daily.to_csv(out, index=False)
    nc_path.unlink(missing_ok=True)
    print(f"[ERA5] OK — {len(daily)} daily rows")
    return out


# ─── Orchestration ────────────────────────────────────────────────────────
def main() -> int:
    sources = [
        ("Sentinel-3 OLCI", download_sentinel3_chla),
        ("Sentinel-2 NDCI", download_sentinel2_ndci),
        ("CMEMS",           download_cmems),
        ("ERA5",            download_era5),
    ]
    print("=" * 64)
    print("Phase 1 — Satellite & climate data acquisition")
    print(f"BBOX: {BBOX}    DATE: {DATE_START} -> {DATE_END}")
    print("=" * 64)
    for name, fn in sources:
        try:
            fn()
        except Exception as e:
            print(f"\n[FAIL] {name} download error: {e}", file=sys.stderr)
            print(
                "\nFallback rule: stopping the script. No synthetic CSVs generated.\n"
                "Fix the credential / quota / API issue and re-run.",
                file=sys.stderr,
            )
            return 1
    print("\nAll 4 satellite sources downloaded successfully.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
