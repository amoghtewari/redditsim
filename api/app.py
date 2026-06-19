"""Flask wrapper for local development. Not used on Vercel."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from lib.clone_builder import build_clone
from lib.responder import respond
from storage import put as blob_put, get as blob_get, delete as blob_delete, is_expired
import json
import time

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env.local"))

app = Flask(__name__)
CORS(app)


@app.route("/api/clone", methods=["POST"])
def api_clone():
    data = request.get_json()
    url = (data or {}).get("url", "").strip()
    if not url:
        return jsonify({"error": "URL required"}), 400
    
    try:
        session = build_clone(url)
        session_id = session["session_id"]
        session["expires_at"] = int(time.time() + 15 * 60)

        blob_data = json.dumps(session).encode("utf-8")
        blob_result = blob_put(
            f"sessions/{session_id}.json",
            blob_data,
        )

        return jsonify({
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
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Clone failed: {str(e)}"}), 500


@app.route("/api/respond", methods=["POST"])
def api_respond():
    data = request.get_json()
    session_id = (data or {}).get("session_id", "").strip()
    user_comment = (data or {}).get("comment", "").strip()
    persona = (data or {}).get("persona", "").strip()
    parent_comment_id = (data or {}).get("parent_comment_id")
    user_comment_id = (data or {}).get("user_comment_id")  # frontend-generated ID
    
    if not session_id or not user_comment:
        return jsonify({"error": "session_id and comment are required"}), 400
    
    try:
        # Persist user's comment in the session
        if user_comment_id:
            _store_user_comment(session_id, user_comment_id, user_comment, parent_comment_id)
        
        result = respond(session_id, user_comment, persona, parent_comment_id, user_comment_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Response failed: {str(e)}"}), 500


def _store_user_comment(session_id, comment_id, body, parent_id):
    """Store the user's comment in the session so it survives refresh."""
    import time as _time
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
            "created_utc": int(_time.time()),
            "is_user": True,
        }
        if parent_id:
            by_id = {c["id"]: c for c in session["comments"]}
            parent = by_id.get(parent_id)
            user_c["depth"] = (parent["depth"] + 1) if parent else 1
        session["comments"].append(user_c)
        blob_put(
            f"sessions/{session_id}.json",
            json.dumps(session).encode("utf-8"),
            token=os.getenv("BLOB_READ_WRITE_TOKEN"),
        )
    except Exception:
        pass  # non-critical


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/session/<session_id>")
def get_session(session_id):
    """Restore session state — used on page refresh."""
    try:
        blob_path = f"sessions/{session_id}.json"
        blob_data = blob_get(blob_path, token=os.getenv("BLOB_READ_WRITE_TOKEN"))
        session = json.loads(blob_data)
        if is_expired(session):
            blob_delete(blob_path)
            return jsonify({"error": "Session expired"}), 404
        return jsonify({
            "session_id": session["session_id"],
            "post": session["post"],
            "comments": session["comments"],
            "rules": session.get("rules", []),
            "expires_at": session.get("expires_at"),
            "status": "ready",
        })
    except Exception as e:
        return jsonify({"error": f"Session not found or expired: {str(e)}"}), 404


if __name__ == "__main__":
    print("Starting RedditSim backend on http://localhost:5001")
    app.run(debug=False, port=5001)
