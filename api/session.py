"""GET /api/session/[id] — Restore session state on page refresh.

On Vercel this function maps to /api/session; the path form
/api/session/<id> reaches it via the rewrite in vercel.json, which moves
the id into a query parameter. Both forms are accepted here.
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Vercel loads this file by path from /var/task — api/ itself is not on
# sys.path, so lib/ and storage imports need it added explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.auth import check_api_key
from storage import get as blob_get, delete as blob_delete, is_expired


def _extract_session_id(path: str) -> str:
    parsed = urlparse(path)
    qs = parse_qs(parsed.query)
    if qs.get("id"):
        return qs["id"][0].strip()
    # Fallback: last path segment (/api/session/<id>)
    segment = parsed.path.rstrip("/").split("/")[-1]
    return "" if segment == "session" else segment.strip()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if not check_api_key(self.headers):
            self._json({"error": "Unauthorized"}, 401)
            return
        session_id = _extract_session_id(self.path)
        if not session_id:
            self._json({"error": "session_id required"}, 400)
            return
        blob_path = f"sessions/{session_id}.json"
        try:
            blob_data = blob_get(blob_path, token=os.getenv("BLOB_READ_WRITE_TOKEN"))
            session = json.loads(blob_data)
            if is_expired(session):
                blob_delete(blob_path)
                self._json({"error": "Session expired"}, 404)
                return
            self._json({
                "session_id": session["session_id"],
                "post": session["post"],
                "comments": session["comments"],
                "rules": session.get("rules", []),
                "expires_at": session.get("expires_at"),
                "status": "ready",
            })
        except Exception as e:
            self._json({"error": f"Session not found or expired: {e}"}, 404)

    def _json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
