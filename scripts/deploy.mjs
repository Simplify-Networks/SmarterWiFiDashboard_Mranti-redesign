// Deploys the built site to Cloudflare Workers with a real D1 database.
// Usage: pnpm run deploy   (runs `vinext build` first, then patches the
// generated dist/server/wrangler.json and calls `wrangler deploy`).
//
// One-time setup: `npx wrangler login`, then `pnpm run db:setup`.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

export const WORKER_NAME = 'mranti-5g-rollout';
export const D1_NAME = 'mranti-5g-rollout-db';

const run = (cmd) => execSync(cmd, { stdio: 'inherit', shell: true });
const out = (cmd) => execSync(cmd, { encoding: 'utf8', shell: true });

export function findDatabaseId() {
  const list = JSON.parse(out('npx wrangler d1 list --json'));
  const db = list.find((d) => d.name === D1_NAME);
  return db?.uuid ?? null;
}

if (process.argv[1] && process.argv[1].endsWith('deploy.mjs')) {
  const databaseId = findDatabaseId();
  if (!databaseId) {
    console.error(
      `D1 database "${D1_NAME}" not found. Run \`pnpm run db:setup\` first.`,
    );
    process.exit(1);
  }
  run('npx tsc --noEmit'); // build does not type-check; a bad import would 500 at runtime
  run('pnpm build');
  const file = 'dist/server/wrangler.json';
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  cfg.name = WORKER_NAME;
  cfg.topLevelName = WORKER_NAME;
  cfg.d1_databases = [
    { binding: 'DB', database_name: D1_NAME, database_id: databaseId },
  ];
  cfg.workers_dev = true;
  writeFileSync(file, JSON.stringify(cfg));
  run(`npx wrangler deploy --config ${file}`);
}
