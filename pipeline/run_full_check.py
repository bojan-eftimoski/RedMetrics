"""Phase 15 cold-start integration check.

Runs Phase 4 -> train Stage 1 -> train Stage 3 -> live RRI sequentially.
Aborts at first failure with a clear message. Reports exactly what's on
disk and what hit Supabase at the end."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]

ROOT = Path(__file__).resolve().parents[1]
PYTHON = sys.executable

STEPS: list[tuple[str, list[str]]] = [
    ("Phase 4: feature engineering",        [PYTHON, "scripts/04_feature_engineering.py"]),
    ("Stage 1: train bloom-probability LGB", [PYTHON, "-m", "models.stage1_bloom_probability.train"]),
    ("Stage 3: train hospital-surge Ridge",  [PYTHON, "-m", "models.stage3_hospital_surge.train"]),
    ("Live RRI pipeline",                    [PYTHON, "pipeline/run_live_rri.py"]),
]

ARTEFACTS = [
    ("merged features", ROOT / "data" / "processed" / "merged_features.csv"),
    ("Stage 1 model",    ROOT / "data" / "models" / "stage1_lgbm.pkl"),
    ("Stage 3 model",    ROOT / "data" / "models" / "stage3_linear.pkl"),
]


def run(label: str, cmd: list[str]) -> None:
    print(f"\n{'='*64}\n>> {label}\n{'='*64}")
    print(f"   {' '.join(cmd)}")
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    proc = subprocess.run(cmd, cwd=ROOT, env=env)
    if proc.returncode != 0:
        print(f"\n[FAIL] {label} exited with {proc.returncode}", file=sys.stderr)
        sys.exit(proc.returncode)


def main() -> int:
    for label, cmd in STEPS:
        run(label, cmd)

    print("\n" + "=" * 64)
    print("Artefact summary")
    print("=" * 64)
    all_ok = True
    for name, p in ARTEFACTS:
        if p.exists():
            print(f"  [OK]      {name:20s} {p.relative_to(ROOT)}  ({p.stat().st_size:,} bytes)")
        else:
            print(f"  [MISSING] {name:20s} {p.relative_to(ROOT)}")
            all_ok = False
    return 0 if all_ok else 2


if __name__ == "__main__":
    sys.exit(main())
