"""Phase 14: deterministic 2005 Genoa Ostreopsis ovata replay sequence.

Walks Stages 1+2 forward over a 14-day window centred on the historically
documented late-July 2005 outbreak. Produces a daily CSV that the hospital
UI streams to animate the Overview/Forecast pages."""

from __future__ import annotations

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from models.stage2_aerosolisation_rri.calculate import calculate_rri  # noqa: E402
from models.stage2_aerosolisation_rri.severity import rri_to_severity  # noqa: E402

# ISPRA-documented 2005 Ligurian outbreak: late July, peak 25-27 Jul. Build a
# plausible 14-day window starting 19 Jul, ending 1 Aug.
DAYS = [
    # date,         bloom_p, wind_speed, wind_dir, wave_h, chl_a_rate
    ("2005-07-19", 0.18,    3.5,        140,      0.4,    +0.05),
    ("2005-07-20", 0.27,    4.0,        150,      0.5,    +0.10),
    ("2005-07-21", 0.41,    5.5,        155,      0.7,    +0.20),
    ("2005-07-22", 0.55,    6.5,        158,      0.9,    +0.30),
    ("2005-07-23", 0.68,    7.5,        160,      1.1,    +0.45),
    ("2005-07-24", 0.78,    8.5,        162,      1.3,    +0.55),
    ("2005-07-25", 0.86,    9.5,        160,      1.4,    +0.60),
    ("2005-07-26", 0.92,   10.5,        160,      1.6,    +0.65),  # peak
    ("2005-07-27", 0.90,   10.0,        158,      1.5,    +0.30),  # trigger fires
    ("2005-07-28", 0.85,    9.0,        155,      1.4,    -0.10),  # toxin multiplier active
    ("2005-07-29", 0.74,    8.0,        152,      1.2,    -0.20),
    ("2005-07-30", 0.58,    6.5,        148,      1.0,    -0.35),
    ("2005-07-31", 0.42,    5.0,        145,      0.8,    -0.45),
    ("2005-08-01", 0.28,    4.0,        142,      0.6,    -0.50),
]

LIGURIAN_SHORE_NORMAL = 160

OUT_CSV = ROOT / "data" / "raw" / "replay" / "genoa_2005_rri_sequence.csv"
OUT_JSON = ROOT / "hospital" / "public" / "genoa_2005_rri_sequence.json"
OUT_JSON_INSURANCE = ROOT / "insurance" / "public" / "genoa_2005_rri_sequence.json"


def main() -> None:
    rows = []
    consecutive_bloom_days = 0
    for date, bloom_p, ws, wd, wh, dchl in DAYS:
        if bloom_p > 0.5:
            consecutive_bloom_days += 1
        else:
            consecutive_bloom_days = 0
        rri = calculate_rri(
            bloom_probability=bloom_p,
            wind_speed=ws,
            wind_direction=wd,
            shore_normal_degrees=LIGURIAN_SHORE_NORMAL,
            wave_height=wh,
            chl_a_rate_of_change=dchl,
        )
        severity = rri_to_severity(rri)
        rows.append({
            "date": date,
            "bloom_probability": round(bloom_p, 3),
            "wind_speed": ws,
            "wind_direction": wd,
            "wave_height": wh,
            "chl_a_rate": dchl,
            "rri_score": rri,
            "severity_tier": severity,
            "bloom_duration_days": consecutive_bloom_days,
        })

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON_INSURANCE.parent.mkdir(parents=True, exist_ok=True)

    # CSV
    with OUT_CSV.open("w", encoding="utf-8") as fh:
        fh.write(",".join(rows[0].keys()) + "\n")
        for r in rows:
            fh.write(",".join(str(v) for v in r.values()) + "\n")

    # JSON for the React apps to fetch
    payload = {"event": "Genoa 2005 Ostreopsis ovata outbreak", "rows": rows}
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    OUT_JSON_INSURANCE.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    print(f"[replay] wrote {OUT_CSV} ({len(rows)} days)")
    print(f"[replay] wrote {OUT_JSON}")
    print(f"[replay] wrote {OUT_JSON_INSURANCE}")
    peak = max(rows, key=lambda r: r["rri_score"])
    print(f"[replay] peak RRI {peak['rri_score']:.1f} on {peak['date']} ({peak['severity_tier']})")


if __name__ == "__main__":
    main()
