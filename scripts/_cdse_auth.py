"""CDSE OAuth helper — exchanges username/password for a bearer token
via the public 'cdse-public' client. Used by Sentinel Hub Statistical API calls.
"""
from __future__ import annotations

import os
import time
from dataclasses import dataclass

import requests

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE"
    "/protocol/openid-connect/token"
)


@dataclass
class CdseToken:
    access_token: str
    expires_at: float

    @property
    def expired(self) -> bool:
        return time.time() >= self.expires_at - 30  # 30s safety margin


_token: CdseToken | None = None


def get_cdse_token() -> str:
    """Return a valid CDSE OAuth bearer token, refreshing if expired."""
    global _token
    if _token is not None and not _token.expired:
        return _token.access_token

    username = os.getenv("CDSE_USERNAME")
    password = os.getenv("CDSE_PASSWORD")
    if not username or not password:
        raise RuntimeError("CDSE_USERNAME or CDSE_PASSWORD missing in .env")

    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "password",
            "username": username,
            "password": password,
            "client_id": "cdse-public",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"CDSE token exchange failed: HTTP {resp.status_code} — {resp.text[:300]}"
        )
    payload = resp.json()
    _token = CdseToken(
        access_token=payload["access_token"],
        expires_at=time.time() + payload.get("expires_in", 600),
    )
    return _token.access_token
