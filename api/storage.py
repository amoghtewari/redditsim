"""Storage abstraction: Vercel Blob in production, local JSON files in dev.

Uses the Vercel Blob REST API directly (not the vercel_blob Python SDK) because
the SDK hardcodes `access: public` which is rejected by private-mode stores.

REST API:
- PUT  https://blob.vercel-storage.com/?pathname=<path>
       Headers: authorization, x-api-version, x-content-type,
                x-allow-overwrite, x-cache-control-max-age,
                x-vercel-blob-access: private (matches store's private mode),
                x-vercel-blob-store-id: <store_id>
       Returns: { url, pathname, contentType, ... }
       Blob URLs are *.private.blob.vercel-storage.com — require auth to read.
- GET  Fetch blob URL with Authorization header (private store requires it).
- Sessions carry an `expires_at` field — Blob has no TTL.
"""
import os
import time

import requests as _requests

_BLOB_API = "https://blob.vercel-storage.com"
_BLOB_API_VERSION = "10"

# Directory creation is deferred to first local write — module import must
# never touch the filesystem (Vercel's /var/task is read-only).
LOCAL_STORE = os.path.join(os.path.dirname(__file__), "local_store")


def _resolve_token(token=None):
    return token or os.getenv("BLOB_READ_WRITE_TOKEN")


def _resolve_store_id():
    return os.getenv("BLOB_STORE_ID", "")


def _use_blob(token=None):
    return bool(_resolve_token(token))


def _blob_headers(tkn: str, extra: dict = None) -> dict:
    """Base headers for all Blob API requests."""
    h = {
        "authorization": f"Bearer {tkn}",
        "x-api-version": _BLOB_API_VERSION,
    }
    store_id = _resolve_store_id()
    if store_id:
        h["x-vercel-blob-store-id"] = store_id
    if extra:
        h.update(extra)
    return h


def _private_base_url(token: str) -> str:
    """Private CDN base URL for the store.

    CDN hostnames are lowercase with no 'store_' prefix:
    store_gvSu1dVAtADUtnK6 → gvsu1dvatadutnk6.private.blob.vercel-storage.com

    Legacy token: vercel_blob_rw_<storeId>_<secret> — storeId is parts[3].
    New v2 (eyJ…): fall back to BLOB_STORE_ID env var.
    """
    raw_id = None
    if not (token or "").startswith("eyJ"):
        parts = (token or "").split("_")
        if len(parts) >= 5 and parts[0] == "vercel" and parts[1] == "blob":
            raw_id = parts[3]
    if not raw_id:
        store_env = _resolve_store_id()
        # Strip 'store_' prefix if present
        raw_id = store_env.removeprefix("store_") if store_env else None
    if raw_id:
        return f"https://{raw_id.lower()}.private.blob.vercel-storage.com"
    return None


def put(path: str, data: bytes, access: str = "public", token: str = None, options: dict = None):
    """Store data. Returns a dict with at least a `url` key."""
    if _use_blob(token):
        tkn = _resolve_token(token)
        headers = _blob_headers(tkn, {
            "x-content-type": "application/json",
            "x-cache-control-max-age": "60",
            "x-allow-overwrite": "1",
            "x-vercel-blob-access": "private",
        })
        resp = _requests.put(
            f"{_BLOB_API}/?pathname={path}",
            data=data,
            headers=headers,
            timeout=10,
        )
        if not resp.ok:
            raise RuntimeError(f"Blob PUT {resp.status_code}: {resp.text[:500]}")
        return resp.json()
    else:
        local_path = os.path.join(LOCAL_STORE, path)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, "wb") as f:
            f.write(data)
        return {
            "url": f"local://{path}",
            "expiresAt": int(time.time() + 15 * 60),
        }


def get(path: str, token: str = None) -> bytes:
    """Retrieve data. Raises FileNotFoundError when the blob doesn't exist."""
    if _use_blob(token):
        tkn = _resolve_token(token)
        cache_bust = {"ts": str(int(time.time()))}
        auth_hdr = {"authorization": f"Bearer {tkn}"}

        # Fast path: private CDN URL constructed from store id in token
        base = _private_base_url(tkn)
        if base:
            resp = _requests.get(
                f"{base}/{path}",
                params=cache_bust,
                headers=auth_hdr,
                timeout=5,
            )
            if resp.status_code == 200:
                return resp.content

        # Fallback: list by prefix to find the blob's actual URL
        list_resp = _requests.get(
            f"{_BLOB_API}/",
            params={"prefix": path, "limit": "10"},
            headers=_blob_headers(tkn),
            timeout=5,
        )
        if list_resp.status_code == 200:
            listing = list_resp.json()
            for blob in listing.get("blobs", []):
                if blob.get("pathname") == path:
                    resp = _requests.get(
                        blob["url"],
                        params=cache_bust,
                        headers=auth_hdr,
                        timeout=5,
                    )
                    resp.raise_for_status()
                    return resp.content
        raise FileNotFoundError(f"Session not found: {path}")
    else:
        local_path = os.path.join(LOCAL_STORE, path)
        if not os.path.exists(local_path):
            raise FileNotFoundError(f"Session not found: {path}")
        with open(local_path, "rb") as f:
            return f.read()


def delete(path: str, token: str = None):
    """Best-effort delete (used when an expired session is encountered)."""
    try:
        if _use_blob(token):
            tkn = _resolve_token(token)
            base = _private_base_url(tkn)
            if base:
                _requests.post(
                    f"{_BLOB_API}/delete",
                    json={"urls": [f"{base}/{path}"]},
                    headers=_blob_headers(tkn),
                    timeout=5,
                )
        else:
            local_path = os.path.join(LOCAL_STORE, path)
            if os.path.exists(local_path):
                os.remove(local_path)
    except Exception:
        pass  # cleanup only — never let it break a request


def is_expired(session: dict) -> bool:
    """App-level expiry: blobs have no TTL, sessions carry expires_at."""
    expires_at = session.get("expires_at")
    return bool(expires_at) and time.time() > expires_at
