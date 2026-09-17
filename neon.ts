import { defineConfig } from "@neon/config/v1";

// Staging demo project this Function visualizes. Override at deploy time.
const TARGET_PROJECT_ID = process.env.TARGET_PROJECT_ID ?? "shiny-cake-74173726";
const TRUNK_BRANCH_ID = process.env.TRUNK_BRANCH_ID ?? "br-cold-sound-w2mo9k7t";
const NEON_API_BASE =
  process.env.NEON_API_BASE ??
  process.env.NEON_API_HOST ??
  "https://console-stage.neon.build/api/v2";

export default defineConfig({
  aiGateway: true,
  functions: {
    explorer: {
      name: "Branch Explorer API",
      source: "src/index.ts",
      env: {
        NEON_API_KEY: process.env.NEON_API_KEY!,
        NEON_API_BASE,
        TARGET_PROJECT_ID,
        TRUNK_BRANCH_ID,
      },
    },
  },
});
