"""
Phase 0.5 — Credential smoke tests.
Verifies that .env credentials initialize each client without performing real downloads.
Reports per-source PASS/FAIL with the underlying error for any failure.

Run:
    python scripts/00_credential_smoke_test.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(REPO_ROOT / ".env")


def check_cdse_sentinelhub() -> tuple[bool, str]:
    """Sentinel Hub on CDSE uses OAuth client_id / client_secret.
    PRD stores CDSE_USERNAME / CDSE_PASSWORD — these are portal credentials,
    not Sentinel Hub OAuth credentials. We attempt a token exchange anyway and
    report the actual server response so the user can decide how to proceed.
    """
    try:
        import requests

        token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
        username = os.getenv("CDSE_USERNAME")
        password = os.getenv("CDSE_PASSWORD")
        if not username or not password:
            return False, "CDSE_USERNAME or CDSE_PASSWORD missing in .env"

        resp = requests.post(
            token_url,
            data={
                "grant_type": "password",
                "username": username,
                "password": password,
                "client_id": "cdse-public",
            },
            timeout=20,
        )
        if resp.status_code == 200 and "access_token" in resp.json():
            return True, "OAuth token obtained via cdse-public client"
        return False, f"HTTP {resp.status_code}: {resp.text[:300]}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def check_cmems() -> tuple[bool, str]:
    """copernicusmarine.login() validates and caches a credential file."""
    try:
        import copernicusmarine  # type: ignore

        username = os.getenv("CMEMS_USERNAME")
        password = os.getenv("CMEMS_PASSWORD")
        if not username or not password:
            return False, "CMEMS_USERNAME or CMEMS_PASSWORD missing in .env"

        # check_credentials_valid does not write a config file; perfect for a smoke test.
        ok = copernicusmarine.login(
            username=username,
            password=password,
            check_credentials_valid=True,
        )
        if ok:
            return True, "Credentials accepted by Copernicus Marine"
        return False, "copernicusmarine reported credentials INVALID"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def check_cds() -> tuple[bool, str]:
    """C3S CDS API key format is 'UID:API-KEY'. PRD has 'YOUR_UID:...' placeholder."""
    try:
        import cdsapi  # type: ignore

        key = os.getenv("CDS_KEY", "")
        url = os.getenv("CDS_URL", "")
        if not key or ":" not in key:
            return False, f"CDS_KEY malformed (expected 'UID:apikey'), got '{key[:20]}...'"
        if key.startswith("YOUR_UID"):
            return False, "CDS_KEY still contains 'YOUR_UID' placeholder — fill in numeric UID"

        # Initialize client; this validates credentials format only (no real call).
        client = cdsapi.Client(url=url, key=key, quiet=True)
        # Try a tiny status check — list datasets endpoint
        import requests

        resp = requests.get(
            f"{url.rstrip('/')}/catalogue/v1/collections",
            headers={"PRIVATE-TOKEN": key.split(":", 1)[1]},
            timeout=15,
        )
        if resp.status_code == 200:
            return True, "CDS API reachable, key format valid"
        return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def check_supabase() -> tuple[bool, str]:
    """Init the Supabase client with anon key. No real call yet."""
    try:
        from supabase import create_client  # type: ignore

        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_ANON_KEY")
        if not url or not key:
            return False, "SUPABASE_URL or SUPABASE_ANON_KEY missing"
        client = create_client(url, key)
        # Touch the auth endpoint to confirm the URL responds
        _ = client.auth.get_session()
        return True, "Supabase client initialized"
    except Exception as e:
        return False, f"{type(e).__name__}: {e}"


def main() -> int:
    checks = [
        ("CDSE / Sentinel Hub", check_cdse_sentinelhub),
        ("CMEMS / Copernicus Marine", check_cmems),
        ("C3S / CDS API (ERA5)", check_cds),
        ("Supabase", check_supabase),
    ]
    print("=" * 60)
    print("Credential smoke tests")
    print("=" * 60)
    failures: list[str] = []
    for name, fn in checks:
        ok, msg = fn()
        status = "PASS" if ok else "FAIL"
        print(f"[{status}] {name}: {msg}")
        if not ok:
            failures.append(name)
    print("=" * 60)
    if failures:
        print(f"\n{len(failures)} credential check(s) failed: {', '.join(failures)}")
        print("Fix the .env values before running scripts/01_download_satellite.py.\n")
        return 1
    print("\nAll credential checks passed.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
