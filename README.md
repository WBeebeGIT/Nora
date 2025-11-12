# Nora – OpenAI‑Ready Starter

This kit deploys a secure chat bubble + quote API on Vercel.
- `/public/nora-chat.js` – chat UI
- `/api/quote.js` – pricing engine (no keys)
- `/api/nora.js` – **OpenAI-ready** chat endpoint (uses env var `OPENAI_API_KEY`); optional

## Deploy (if Vercel shows Upload)
- New Project → Upload folder or ZIP → Deploy

## If Upload is hidden (new UI)
- Create free GitHub → new public repo → upload folder contents
- Then open: https://vercel.com/new/clone?repository-url=<YOUR_REPO_URL>

## Configure OpenAI (optional)
- In Vercel → Project Settings → Environment Variables:
  - `OPENAI_API_KEY` = sk-…
