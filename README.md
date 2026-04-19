# bAIwenger dashboard

Private fantasy football dashboard for biwenger · La Liga.
Built with Next.js 15, deployed on Zeabur alongside the existing n8n workflow.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **iron-session** — encrypted cookie sessions (no database needed for auth)
- **pg** — direct PostgreSQL connection (same DB as n8n)
- **Biwenger API** — live market data fetched with your own session token

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.example .env.local
# Fill in DATABASE_URL, SESSION_SECRET, REVALIDATE_SECRET

# 3. Run the DB migration (once)
psql $DATABASE_URL -f migrations/001_market_analysis.sql

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

## Deploy on Zeabur

1. Push this repo to GitHub
2. In your Zeabur project → **Add Service → Git**
3. Select your repo — Zeabur auto-detects Next.js
4. Add environment variables in Zeabur dashboard:
   - `DATABASE_URL` → copy from your existing Postgres service
   - `SESSION_SECRET` → run `openssl rand -base64 32` and paste
   - `REVALIDATE_SECRET` → another random string
5. Deploy — done.

Your app will be at `https://your-app-name.zeabur.app`

## n8n workflow changes

See `N8N_CHANGES.md` — only 2-3 nodes need to be added, nothing removed.

## How auth works

Login page → POSTs credentials to `/api/auth`
→ Proxied to Biwenger `/api/v2/auth/login`
→ On success: stores Biwenger JWT in an encrypted iron-session cookie (httpOnly)
→ All API routes use that token to call Biwenger on your behalf

No passwords are stored anywhere. The session expires in 7 days.

## How AI analysis works

1. n8n runs daily at 15:00, calls Gemini, gets per-player analysis
2. New "Code: Parse AI for DB" node formats the output
3. New "Postgres: Save AI Analysis" node inserts into `market_analysis` table
4. Dashboard `/api/market` reads from that table and returns it alongside live player data
5. Click any row in the table to expand the AI analysis

## Environment variables

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `DATABASE_URL`      | PostgreSQL connection string             |
| `SESSION_SECRET`    | Min 32 chars, used to encrypt cookies    |
| `REVALIDATE_SECRET` | Secret for the n8n → Next.js cache hook  |
