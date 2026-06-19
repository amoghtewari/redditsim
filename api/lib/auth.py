import hmac
import os


def check_api_key(headers) -> bool:
    """Return True if the request carries a valid X-App-Key header."""
    expected = os.getenv("APP_API_KEY", "")
    if not expected:
        return True  # key not configured — dev mode, allow all
    provided = headers.get("X-App-Key") or headers.get("x-app-key") or ""
    return hmac.compare_digest(provided, expected)
