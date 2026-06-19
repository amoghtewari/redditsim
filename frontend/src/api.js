const API_BASE = '/api';
const API_KEY = import.meta.env.VITE_APP_API_KEY || '';

function authHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', 'X-App-Key': API_KEY, ...extra };
}

export async function clonePost(url) {
  const res = await fetch(`${API_BASE}/clone`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Clone failed');
  return data;
}

export async function respondToComment(sessionId, comment, persona = '', parentCommentId = null, userCommentId = null) {
  const res = await fetch(`${API_BASE}/respond`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      session_id: sessionId,
      comment,
      persona,
      parent_comment_id: parentCommentId,
      user_comment_id: userCommentId,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Response failed');
  return data;
}

export async function getSession(sessionId) {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, {
    headers: { 'X-App-Key': API_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Session not found');
  return data;
}
