# RedditSim

Clone any Reddit thread and argue with AI bots that actually sound like Redditors.

**Live demo → [reddit-sim-gilt.vercel.app](https://reddit-sim-gilt.vercel.app)**

---

## What it does

Paste a Reddit post URL. RedditSim fetches the original post and its top comments via the Arctic Shift archive, then lets you reply anywhere in the thread. An AI pipeline generates responses that match the subreddit's culture, persona, and tone — complete with predicted upvote scores, fact-checking, and consistent per-bot identities across the conversation.

## Tech stack

| Layer | What |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| AI pipeline | LangGraph (Python) · DeepSeek via OpenAI-compatible API |
| Reddit data | Arctic Shift public API (no auth required) |
| Storage | Vercel Blob (private store, 15-min session TTL) |
| Deployment | Vercel (serverless Python functions + static SPA) |
| Rate limiting | Vercel Edge Middleware (3 clones / 7 replies per IP per minute) |

## Local development

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [DeepSeek API key](https://platform.deepseek.com/)

### Backend

```bash
cd api
pip install -r requirements-dev.txt
```

Create `api/.env`:

```
DEEPSEEK_API_KEY=sk-...
```

Start the Flask dev server:

```bash
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173). The Vite dev server proxies `/api/*` to the Flask backend on port 5000.

## Deployment (Vercel)

1. Fork this repo and import it into [Vercel](https://vercel.com).
2. Add the following environment variables in the Vercel dashboard:

| Variable | Description |
|---|---|
| `DEEPSEEK_API_KEY` | Your DeepSeek API key |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob store RW token (connect a Blob store to the project) |
| `BLOB_STORE_ID` | Vercel Blob store ID (`store_...`) |
| `APP_API_KEY` | A random secret string (protects the API endpoints) |
| `VITE_APP_API_KEY` | Same value as `APP_API_KEY` (baked into the frontend build) |

3. Connect a Vercel Blob store to the project (Storage tab → Create → Blob). The store must be in **private** access mode.
4. Deploy. `vercel.json` handles routing, function config, and SPA fallback automatically.

> **Note:** Vercel's Python runtime installs from `api/requirements.txt` automatically — no build step needed for the backend.

## Project structure

```
├── api/
│   ├── clone.py          # POST /api/clone — fetch & store Reddit thread
│   ├── respond.py        # POST /api/respond — run LangGraph pipeline
│   ├── session.py        # GET  /api/session/:id — restore session
│   ├── storage.py        # Vercel Blob / local filesystem abstraction
│   └── lib/
│       ├── clone_builder.py   # Arctic Shift fetcher + comment tree builder
│       ├── responder.py       # LangGraph pipeline (8-node graph)
│       ├── web_search.py      # DuckDuckGo fact-checking
│       └── auth.py            # Shared-secret API key check
├── frontend/
│   └── src/
│       ├── pages/        # HomePage, ClonePage, AboutPage, HowToUsePage
│       └── components/   # CommentTree, PostCard, TopNavBar, …
├── middleware.js          # Vercel Edge rate limiting
└── vercel.json           # Routing, function config, SPA fallback
```

## License

MIT
