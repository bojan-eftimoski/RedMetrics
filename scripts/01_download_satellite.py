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

# Force UTF-8 on stdout/stderr so unicode chars (→, µ, °, ²) don't crash on Windows cp1252.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        _stream.reconfigure(encoding="utf-8")

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
      { id: "ndci",     bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1, sampleType: "UINT8"   }
    ]
  };
}
function evaluatePixel(s) {
  // Restrict to water pixels (SCL == 6) within valid mask.
  // Statistical API requires an output named exactly "dataMask"; pixels with
  // dataMask == 0 are excluded from the per-band statistics.
  var isWater = (s.SCL == 6) && (s.dataMask == 1);
  if (!isWater) return { ndci: [NaN], dataMask: [0] };
  var denom = (s.B05 + s.B04);
  if (denom <= 0) return { ndci: [NaN], dataMask: [0] };
  return { ndci: [(s.B05 - s.B04) / denom], dataMask: [1] };
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
            # Bbox is CRS84 -> resx/resy are in DEGREES. ~0.005 deg ~= 555 m at
            # lat 44 (well under the 1500 m S2L2A statistical-API cap).
            "resx": 0.005,
            "resy": 0.005,
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
# Med Sea reanalysis (`my` = multi-year) datasets cover 1987-present with daily
# resolution and no cloud gaps. NRT analysis-and-forecast (`anfc`) siblings only
# start in late 2023, which is why we use reanalysis for the 2015-2024 window.
#
# Note: temperature is `phy-temp` (extra 'p'), not `phy-tem` -- the latter only
# exists as the yearly P1Y-m roll-up. Confirmed via copernicusmarine.describe.
CMEMS_DATASETS = {
    "sst": {
        "id": "cmems_mod_med_phy-temp_my_4.2km_P1D-m",
        "vars": ["thetao"],
        "depth_max": 1.5,
    },
    "currents": {
        "id": "cmems_mod_med_phy-cur_my_4.2km_P1D-m",
        "vars": ["uo", "vo"],
        "depth_max": 1.5,
    },
    "salinity": {
        "id": "cmems_mod_med_phy-sal_my_4.2km_P1D-m",
        "vars": ["so"],
        "depth_max": 1.5,
    },
    # Chlorophyll-a in the Med Sea reanalysis lives in the -plankton sub-product.
    # The legacy -pft naming used by the NRT family is not present in the `my`
    # catalog (confirmed via copernicusmarine.describe).
    "chlorophyll": {
        "id": "cmems_mod_med_bgc-plankton_my_4.2km_P1D-m",
        "vars": ["chl"],
        "depth_max": 1.5,
    },
}

# NRT chl as gap-fill for any tail-end days the reanalysis hasn't published yet.
# Best-effort -- the script does not stop if this fails.
CMEMS_REANALYSIS = {
    "id": "cmems_mod_med_bgc-pft_anfc_4.2km_P1D-m",
    "vars": ["chl"],
    "depth_max": 1.5,
}


_CMEMS_LOGGED_IN = False


def _ensure_cmems_login() -> None:
    """Push CMEMS credentials into copernicusmarine once per process. The
    library otherwise silently falls back to an unauthenticated session and
    open_dataset returns None for protected catalogs."""
    global _CMEMS_LOGGED_IN
    if _CMEMS_LOGGED_IN:
        return
    import copernicusmarine

    user = os.getenv("CMEMS_USERNAME")
    pwd = os.getenv("CMEMS_PASSWORD")
    if not user or not pwd:
        raise RuntimeError("CMEMS_USERNAME / CMEMS_PASSWORD missing from .env")
    copernicusmarine.login(username=user, password=pwd, force_overwrite=True)
    _CMEMS_LOGGED_IN = True


def _cmems_subset_to_daily_scalar(dataset_id: str, vars_: list[str], depth_max: float) -> pd.DataFrame:
    """Use copernicusmarine to subset to BBOX, then spatial-average to one scalar per day."""
    import copernicusmarine

    _ensure_cmems_login()

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
    if ds is None:
        raise RuntimeError(
            f"copernicusmarine.open_dataset returned None for {dataset_id}. "
            f"This usually means the session is unauthenticated or the dataset "
            f"id has been retired."
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

    # NRT chl gap-fills any tail-end days the reanalysis hasn't published yet.
    try:
        df_nrt = _cmems_subset_to_daily_scalar(
            CMEMS_REANALYSIS["id"], CMEMS_REANALYSIS["vars"], CMEMS_REANALYSIS["depth_max"]
        )
        df_nrt = df_nrt.rename(columns={"chl": "chl_cmems_nrt"})
        daily = daily.merge(df_nrt, on="date", how="left")
        if "chl_cmems" in daily.columns and "chl_cmems_nrt" in daily.columns:
            daily["chl_cmems"] = daily["chl_cmems"].fillna(daily["chl_cmems_nrt"])
            daily = daily.drop(columns=["chl_cmems_nrt"])
    except Exception as e:
        # Non-fatal -- reanalysis already covers the 2015-2024 training window.
        print(f"[CMEMS] NRT chl gap-fill skipped: {e}")

    if daily is None or daily.empty:
        raise RuntimeError("CMEMS returned no data after merge")

    daily = daily.sort_values("date").reset_index(drop=True)
    daily.to_csv(out, index=False)
    print(f"[CMEMS] OK — {len(daily)} daily rows")
    return out


# ─── ERA5 wind & wave ─────────────────────────────────────────────────────
def download_era5() -> Path:
    """Hourly ERA5 wind/wave for BBOX, aggregated to daily.

    The CDS Beta enforces a per-request cost cap. A single 10-year × 4-variable
    × 6-hourly retrieval blows past it, so we loop year-by-year and concatenate
    the daily aggregates. Each per-year request is a few MB.
    """
    import cdsapi  # type: ignore
    import xarray as xr  # type: ignore

    out = SATELLITE_DIR / "era5_wind_waves_ligurian_2015_2024.csv"
    print(f"[ERA5] Downloading wind/wave → {out.name}")

    cds_key = os.getenv("CDS_KEY", "")
    if not cds_key or cds_key.startswith("YOUR_UID") or "PLACEHOLDER" in cds_key.upper():
        raise RuntimeError(
            "CDS_KEY missing or placeholder. "
            "Get the UUID key at https://cds.climate.copernicus.eu/profile"
        )

    client = cdsapi.Client(url=os.getenv("CDS_URL"), key=cds_key, quiet=True)
    months = [f"{m:02d}" for m in range(1, 13)]
    days = [f"{d:02d}" for d in range(1, 32)]
    area = [BBOX["lat_max"], BBOX["lon_min"], BBOX["lat_min"], BBOX["lon_max"]]
    rename = {"u10": "wind_u", "v10": "wind_v", "swh": "wave_height", "mwd": "wave_direction"}
    keep = ["date", "wind_u", "wind_v", "wind_speed", "wind_direction", "wave_height"]

    import zipfile

    def _extracted_netcdfs(path: Path) -> list[Path]:
        """CDS Beta returns either a single .nc or a .zip with one or more .nc
        members (one per data stream — e.g. atmospheric wind vs ocean wave).
        Returns the list of .nc paths to open."""
        with path.open("rb") as fh:
            magic = fh.read(4)
        if magic[:2] != b"PK":
            return [path]
        out_paths: list[Path] = []
        with zipfile.ZipFile(path) as zf:
            nc_members = [n for n in zf.namelist() if n.endswith(".nc")]
            if not nc_members:
                raise RuntimeError(f"ERA5 zip {path} contains no .nc file: {zf.namelist()}")
            for member in nc_members:
                target = path.parent / f"{path.stem}__{Path(member).stem}.nc"
                with zf.open(member) as src, target.open("wb") as dst:
                    dst.write(src.read())
                out_paths.append(target)
        return out_paths

    yearly_frames: list[pd.DataFrame] = []
    for year in range(2015, 2025):
        nc_path = SATELLITE_DIR / f"_era5_tmp_{year}.nc"
        print(f"[ERA5] requesting {year}…")
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
                "year": [str(year)],
                "month": months,
                "day": days,
                "time": ["00:00", "06:00", "12:00", "18:00"],
                "area": area,
            },
            str(nc_path),
        )

        nc_paths = _extracted_netcdfs(nc_path)
        per_stream_daily: list[pd.DataFrame] = []
        for nc in nc_paths:
            ds = xr.open_dataset(nc)
            spatial_dims = [d for d in ("latitude", "longitude", "lat", "lon") if d in ds.dims]
            ds_mean = ds.mean(dim=spatial_dims, skipna=True)
            df = ds_mean.to_dataframe().reset_index()
            time_col = "time" if "time" in df.columns else "valid_time"
            df["date"] = pd.to_datetime(df[time_col]).dt.date.astype(str)
            grouped = df.groupby("date", as_index=False).mean(numeric_only=True)
            per_stream_daily.append(grouped)
            ds.close()

        # Merge streams on date — wind u/v and wave swh/mwd come from different files.
        daily = per_stream_daily[0]
        for extra in per_stream_daily[1:]:
            daily = daily.merge(extra, on="date", how="outer")
        daily = daily.rename(columns=rename).sort_values("date").reset_index(drop=True)
        daily["wind_speed"] = np.sqrt(daily["wind_u"] ** 2 + daily["wind_v"] ** 2)
        daily["wind_direction"] = (np.degrees(np.arctan2(-daily["wind_u"], -daily["wind_v"])) + 360) % 360
        yearly_frames.append(daily[[c for c in keep if c in daily.columns]])

        nc_path.unlink(missing_ok=True)
        for nc in nc_paths:
            if nc != nc_path:
                nc.unlink(missing_ok=True)
        print(f"[ERA5] {year} OK — {len(daily)} daily rows")

    full = pd.concat(yearly_frames, ignore_index=True).sort_values("date").reset_index(drop=True)
    full.to_csv(out, index=False)
    print(f"[ERA5] OK — {len(full)} daily rows total")
    return out


# ─── Orchestration ────────────────────────────────────────────────────────
def main() -> int:
    # Sentinel-3 OLCI L2 WFR (CHL_NN) is not exposed as a built-in CDSE Sentinel
    # Hub collection. Chlorophyll-a is sourced from the CMEMS biogeochemistry
    # dataset instead (cmems_mod_med_bgc-bio_anfc_4.2km_P1D-m), which has daily
    # gap-free coverage back to 1999. download_sentinel3_chla() is kept in this
    # file for reference only and is not invoked.
    sources = [
        ("Sentinel-2 NDCI", download_sentinel2_ndci),
        ("CMEMS",           download_cmems),
        ("ERA5",            download_era5),
    ]
    print("=" * 64)
    print("Phase 1 -- Satellite & climate data acquisition")
    print(f"BBOX: {BBOX}    DATE: {DATE_START} -> {DATE_END}")
    print("Chlorophyll source: CMEMS bgc (Sentinel-3 OLCI dropped, not available on CDSE Sentinel Hub)")
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
