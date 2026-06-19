"""POST /api/clone — Build a Reddit post clone."""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler

# Vercel loads this file by path from /var/task — api/ itself is not on
# sys.path, so lib/ and storage imports need it added explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.auth import check_api_key
from lib.clone_builder import build_clone
from storage import put as blob_put


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not check_api_key(self.headers):
            self._json({"error": "Unauthorized"}, 401)
            return
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))
            url = body.get("url", "").strip()

            if not url:
                self._json({"error": "URL required"}, 400)
                return

            session = build_clone(url)
            session_id = session["session_id"]

            # App-level expiry: Vercel Blob has no TTL, so the session itself
            # carries its deadline and readers treat expired as missing.
            session["expires_at"] = int(time.time() + 15 * 60)

            blob_data = json.dumps(session).encode("utf-8")
            blob_result = blob_put(
                f"sessions/{session_id}.json",
                blob_data,
                token=os.getenv("BLOB_READ_WRITE_TOKEN"),
            )

            self._json({
                "session_id": session_id,
                "post": session["post"],
                "comments": session["comments"],
                "num_comments": len(session["comments"]),
                "rules": session["rules"],
                "blob_url": blob_result.get("url", ""),
                "expires_at": session["expires_at"],
                "status": "ready",
            })

        except ValueError as e:
            self._json({"error": str(e)}, 400)
        except Exception as e:
            self._json({"error": f"Clone failed: {str(e)}"}, 500)

    def _json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
