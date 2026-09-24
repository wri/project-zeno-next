# src/app

FSD **app** layer: the application entry.

- `routes.tsx` — the route table (React Router, data mode); pages under `app/` are lazy routes.
- `main.tsx` — browser entry: hydrates prerendered pages, renders the rest.
- `entry-server.tsx` — build-time render used by `scripts/prerender.mjs` for `/` and `/amazonia`.
