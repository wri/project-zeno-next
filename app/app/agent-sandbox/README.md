# Agent Sandbox

A stripped-down, auth-free version of the main GNW app UI, intended for backend/agent developers working on [project-zeno](https://github.com/wri/project-zeno) who need to test local API changes against the real frontend without setting up auth.

## What it does

- Renders the full chat + map UI (same `ChatPanel` and `Map` components as the main app)
- Routes all API requests to `NEXT_PUBLIC_API_HOST` in your `.env.local`
- Bypasses authentication — no login required, no session, no prompt limits
- Resets all stores on mount so you always start from a clean state

## What it doesn't do

- It is **not** a testing harness for frontend code — use the main app or `chart-debug` for that
- It does **not** mock the API — it talks to a real backend, just whichever one you point it at
- It is **not** available in production (tree-shaken at build time via `NODE_ENV` guard + middleware exemption)

## How to use

1. Point `NEXT_PUBLIC_API_HOST` at your local agent in `.env.local`:

   ```
   NEXT_PUBLIC_API_HOST=http://localhost:8000
   ```

2. Start the dev server:

   ```sh
   pnpm dev
   ```

3. Visit [http://localhost:3000/app/agent-sandbox](http://localhost:3000/app/agent-sandbox)

The header shows an **AGENT SANDBOX** badge so it's clear you're not in the main app. The system message in the chat confirms which API host is being used.

## How auth is bypassed

The middleware exempts `/app/agent-sandbox` from the normal auth check — no env var toggle needed. The production guard (`NODE_ENV === "production"`) ensures the page renders nothing if it somehow reaches a production build.
