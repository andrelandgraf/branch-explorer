# Neon Branch Explorer

A full-stack demo of the **Neon platform's superpower**: branching forks your
Postgres database *and* your object storage together, instantly.

It's split into two pieces:

- **API** — a [Hono](https://hono.dev) JSON API running on **Neon Functions**. It
  holds the Neon API key, manages branches, queries each branch's tables (Neon
  serverless driver), and reads/writes objects through the console storage
  endpoints. Also generates images via the **Neon AI Gateway**.
- **Web** (`web/`) — a **Vite + React + TanStack Router** SPA hosted on **Vercel**.
  It queries the Neon Function API (CORS) and renders the whole UI. No secrets in
  the browser — the API key stays in the function.

```
Browser ──► Vercel (TanStack Router SPA)
                 │  fetch + <img>  (CORS)
                 ▼
            Neon Function (Hono JSON API)
                 ├─ Neon API (staging)        branches: list / fork / kill, connection URIs
                 ├─ console storage endpoints  buckets / objects / presign / download proxy
                 ├─ @neondatabase/serverless   per-branch table rows
                 └─ Neon AI Gateway            image generation
```

## Features

- **Branch tree visualizer** — fork, swap, and kill branches.
- **Always-expanded tables** — every public table shows columns + up to 100 rows;
  delete rows (by primary key) or drop whole tables.
- **Object storage with previews** — image thumbnails + type tiles; add a random
  file, generate an AI image, or delete objects (served via an auth'd proxy).
- **Limits** (be kind!) — 100 objects/bucket, 100 rows/table, 100 branches.
- Global loading indicator, per-action spinners, and an error toast.

## Repo layout

```
branch-explorer/
├── neon.ts                 # Neon policy: the API function + AI Gateway + injected env
├── src/
│   ├── index.ts            # Hono JSON API (/api/*) + object proxy
│   └── lib/                # env, neon-client, inspect, ops, sql, json, util
└── web/                    # Vercel SPA
    ├── src/
    │   ├── api.ts          # typed fetch client (VITE_API_BASE)
    │   ├── router.tsx      # TanStack Router
    │   ├── tree.ts         # build the branch forest
    │   └── components/     # App, BranchTree, Panel, TableGrid, ObjectRow
    └── vercel.json
```

## Run the API (Neon staging)

Preview features run on staging, accessed via `neonctl-staging` (which exports
`NEON_API_KEY` + `NEON_API_HOST`).

```bash
npm install
neonctl-staging link --agent
neonctl-staging dev          # serves the JSON API locally
neonctl-staging deploy       # deploy the function
```

Set `TARGET_PROJECT_ID` / `TRUNK_BRANCH_ID` to point at your seeded demo project.

## Run the Web SPA

```bash
cd web
npm install
# point at your deployed API:
echo "VITE_API_BASE=https://<your-function-url>" > .env
npm run dev
```

## Deploy the Web SPA (Vercel)

```bash
cd web
vercel link --project branch-explorer --scope <your-team>
vercel env add VITE_API_BASE production   # the deployed Neon Function URL
vercel deploy --prod
```
