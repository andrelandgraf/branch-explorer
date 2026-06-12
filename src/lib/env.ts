export interface AppEnv {
  /** Neon API key (staging). */
  apiKey: string;
  /** Neon API base, e.g. https://console-stage.neon.build/api/v2 */
  apiBase: string;
  /** The project whose branches we manage. */
  projectId: string;
  /** The seed / root branch we fork from and never delete. */
  trunkBranchId: string;
  /** Default database + role on the demo project (used to build connection URIs). */
  databaseName: string;
  roleName: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. It is injected by neon.ts; run via \`neon dev\` / \`neon deploy\`.`,
    );
  }
  return value;
}

export function readEnv(): AppEnv {
  return {
    apiKey: required('NEON_API_KEY', process.env.NEON_API_KEY),
    apiBase: required(
      'NEON_API_BASE',
      process.env.NEON_API_BASE ?? process.env.NEON_API_HOST,
    ),
    projectId: required('TARGET_PROJECT_ID', process.env.TARGET_PROJECT_ID),
    trunkBranchId: required('TRUNK_BRANCH_ID', process.env.TRUNK_BRANCH_ID),
    databaseName: process.env.DEMO_DATABASE_NAME ?? 'neondb',
    roleName: process.env.DEMO_ROLE_NAME ?? 'neondb_owner',
  };
}
