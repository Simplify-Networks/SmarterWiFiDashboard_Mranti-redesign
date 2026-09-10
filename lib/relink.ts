// A router's id is built from its IP (`p<tab>-<ip>`). When the IP is edited
// in the Google Sheet the id changes, which would strand the saved status and
// history under the old id. This re-links such records by matching the sheet
// tab, row and site name that were recorded at save time.
import { eq } from 'drizzle-orm';
import type { Router } from './routers';
import { statuses, history } from '@/db/schema';
import type { getDb } from '@/db';

type Db = ReturnType<typeof getDb>;
type Saved = typeof statuses.$inferSelect;

export function findRelinks(
  routers: Router[],
  saved: Saved[],
): { from: string; to: string }[] {
  const current = new Set(routers.map((r) => r.id));
  const taken = new Set(saved.map((s) => s.id));
  const out: { from: string; to: string }[] = [];
  for (const s of saved) {
    if (current.has(s.id) || s.sourcePhase == null || s.row == null) continue;
    const match = routers.find(
      (r) =>
        (r.sourcePhase ?? r.phase) === s.sourcePhase &&
        r.row === s.row &&
        r.name === s.name &&
        !taken.has(r.id),
    );
    if (match) {
      out.push({ from: s.id, to: match.id });
      taken.add(match.id);
    }
  }
  return out;
}

export async function applyRelinks(
  db: Db,
  relinks: { from: string; to: string }[],
): Promise<void> {
  for (const { from, to } of relinks) {
    await db.batch([
      db.update(statuses).set({ id: to }).where(eq(statuses.id, from)),
      db.update(history).set({ routerId: to }).where(eq(history.routerId, from)),
    ]);
  }
}
