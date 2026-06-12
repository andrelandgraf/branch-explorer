# Neon Branch Explorer

A full-stack demo that runs entirely on **Neon Functions** — a [Hono](https://hono.dev)
API + server-rendered `hono/jsx` UI — and showcases the superpower of the Neon
platform: **branching forks your Postgres database *and* your object storage
together, instantly.**

The app uses a staging `NEON_API_KEY` to manage branches of a target project. For
the selected branch it shows the live **database tables** (row + column counts,
queried over the Neon serverless driver) and the **object-storage buckets +
objects** (listed via the branch's S3-compatible endpoint). You can:

- **Fork** any branch (copies DB + storage in one call)
- **Swap** between branches with the tree visualizer
- **Mutate** a branch (add a row / add an object) to watch it diverge from its parent
- **Kill** a branch (deletes its database + storage)

## How it works

```
Browser ──(htmx partials)──► Neon Function (Hono)
                                ├─ Neon API (staging)           branches: list / create / delete, connection URIs
                                ├─ @neondatabase/config         per-branch storage endpoint + minted S3 credential
                                ├─ @neondatabase/serverless     per-branch table + row counts (HTTP)
                                └─ @aws-sdk/client-s3           per-branch ListObjects / Put / Delete
```

Everything is one function. `neon.ts` injects `NEON_API_KEY` (read from the
environment at apply time, never committed), the API base, and the target
project + trunk branch ids.

## Project structure

```
branch-explorer/
├── neon.ts                  # policy: one function + its injected env
├── src/
│   ├── index.tsx            # Hono app: routes + SSR
│   ├── lib/
│   │   ├── env.ts           # required env vars
│   │   ├── neon-client.ts   # branches CRUD, connection URIs, storage creds
│   │   ├── inspect.ts       # per-branch tables (serverless) + objects (S3)
│   │   ├── ops.ts           # mutations (add widget / add object / delete object)
│   │   ├── tree.ts          # build the branch forest
│   │   ├── json.ts          # response narrowing helpers (no casts)
│   │   └── util.ts
│   └── ui/
│       ├── components.tsx   # Layout, Board, TreeView, Panel
│       └── styles.ts
└── package.json
```

## Run it (staging)

The Neon platform preview features run on staging, accessed via `neonctl-staging`
(which exports `NEON_API_KEY` + `NEON_API_HOST`).

```bash
npm install
neonctl-staging link --agent            # link this folder for a dev context
neonctl-staging dev                      # serves the function locally
```

Open the printed `explorer` URL. The default target is the seeded
`branch-explorer-demo` project; override with `TARGET_PROJECT_ID` /
`TRUNK_BRANCH_ID`.

## Deploy

```bash
neonctl-staging deploy
```
