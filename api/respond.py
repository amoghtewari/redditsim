"""POST /api/respond — Generate AI response to user comment."""
import json
import os
import sys
import time
from http.server import BaseHTTPRequestHandler

# Vercel loads this file by path from /var/task — api/ itself is not on
# sys.path, so lib/ and storage imports need it added explicitly.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lib.auth import check_api_key
from lib.responder import respond
from storage import put as blob_put, get as blob_get


def _store_user_comment(session_id, comment_id, body, parent_id):
    """Persist the user's comment into the session blob before responding."""
    blob_path = f"sessions/{session_id}.json"
    try:
        blob_data = blob_get(blob_path, token=os.getenv("BLOB_READ_WRITE_TOKEN"))
        session = json.loads(blob_data)
        user_c = {
            "id": comment_id,
            "author": "You",
            "body": body,
            "score": 1,
            "depth": 0,
            "parent_id": parent_id or "",
            "created_utc": int(time.time()),
            "is_user": True,
        }
        if parent_id:
            by_id = {c["id"]: c for c in session["comments"]}
            parent = by_id.get(parent_id)
            user_c["depth"] = (parent["depth"] + 1) if parent else 1
        session["comments"].append(user_c)
        blob_put(
            blob_path,
            json.dumps(session).encode("utf-8"),
            token=os.getenv("BLOB_READ_WRITE_TOKEN"),
        )
    except Exception:
        pass  # non-critical — AI response proceeds regardless


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if not check_api_key(self.headers):
            self._json({"error": "Unauthorized"}, 401)
            return
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(content_length))

            session_id = body.get("session_id", "").strip()
            user_comment = body.get("comment", "").strip()
            persona = body.get("persona", "").strip()
            parent_comment_id = body.get("parent_comment_id")
            user_comment_id = body.get("user_comment_id")

            if not session_id or not user_comment:
                self._json({"error": "session_id and comment are required"}, 400)
                return

            if user_comment_id:
                _store_user_comment(session_id, user_comment_id, user_comment, parent_comment_id)

            result = respond(session_id, user_comment, persona, parent_comment_id, user_comment_id)
            self._json(result)

        except ValueError as e:
            self._json({"error": str(e)}, 400)
        except Exception as e:
            self._json({"error": f"Response failed: {str(e)}"}, 500)

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
