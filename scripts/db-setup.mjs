// Creates the production D1 database (if missing) and applies every
// statement in drizzle/*.sql. Safe to re-run: statements that would
// re-create an existing table or column are skipped.
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { D1_NAME, findDatabaseId } from './deploy.mjs';

const run = (cmd) => execSync(cmd, { stdio: 'inherit', shell: true });

if (!findDatabaseId()) {
  run(`npx wrangler d1 create ${D1_NAME}`);
}

const statements = readdirSync('drizzle')
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .flatMap((f) =>
    readFileSync(`drizzle/${f}`, 'utf8')
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean),
  );

for (const sql of statements) {
  const cmd = `npx wrangler d1 execute ${D1_NAME} --remote --yes --command "${sql.replace(/"/g, '\\"').replace(/\s+/g, ' ')}"`;
  try {
    execSync(cmd, { stdio: 'pipe', shell: true });
    console.log('applied:', sql.slice(0, 60));
  } catch (e) {
    const out = String(e.stdout) + String(e.stderr);
    if (/already exists|duplicate column/i.test(out)) {
      console.log('skipped (exists):', sql.slice(0, 60));
    } else {
      console.error(out);
      process.exit(1);
    }
  }
}
console.log(`\nD1 "${D1_NAME}" ready (id ${findDatabaseId()}).`);
