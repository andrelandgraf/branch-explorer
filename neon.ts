import { defineConfig } from '@neondatabase/config/v1';

// The project whose branches this app visualizes and manages. Defaults to the
// seeded staging demo project; override via env when applying/deploying.
const TARGET_PROJECT_ID = process.env.TARGET_PROJECT_ID ?? 'shiny-cake-74173726';
const TRUNK_BRANCH_ID = process.env.TRUNK_BRANCH_ID ?? 'br-cold-sound-w2mo9k7t';

// The API key + base are read from the environment at policy-eval time (the
// `neonctl-staging` wrapper exports NEON_API_KEY and NEON_API_HOST), so the
// secret is never committed to the repo.
const NEON_API_KEY = process.env.NEON_API_KEY ?? '';
const NEON_API_BASE =
  process.env.NEON_API_BASE ??
  process.env.NEON_API_HOST ??
  'https://console-stage.neon.build/api/v2';

export default defineConfig({
  preview: {
    functions: {
      explorer: {
        name: 'Branch Explorer',
        source: 'src/index.tsx',
        env: {
          NEON_API_KEY,
          NEON_API_BASE,
          TARGET_PROJECT_ID,
          TRUNK_BRANCH_ID,
        },
      },
    },
  },
});
