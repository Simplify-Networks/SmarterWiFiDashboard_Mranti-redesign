import { cors, preflight } from '@/lib/cors';
import { getSourceCached } from '@/lib/source';
import { getDb } from '@/db';
import { statuses } from '@/db/schema';
import { findRelinks, applyRelinks } from '@/lib/relink';
export const GET = cors(async (req: Request) => {
  const url = new URL(req.url);
  const data = await getSourceCached(
    url.searchParams.get('fresh') === '1' ? 0 : 60000,
  );
  try {
    const db = getDb();
    let saved = await db.select().from(statuses);
    // A router whose IP changed in the sheet gets a new id; carry its saved
    // status and history across so nothing is lost.
    const relinks = findRelinks(data.routers, saved);
    if (relinks.length) {
      await applyRelinks(db, relinks);
      saved = await db.select().from(statuses);
    }
    const map = new Map(saved.map((s) => [s.id, s]));
    return Response.json(
      {
        ...data,
        routers: data.routers.map((r) => {
          const s = map.get(r.id);
          return s
            ? {
                ...r,
                commission: s.commission,
                handover: s.handover,
                updatedAt: s.updatedAt,
                updatedBy: s.updatedBy || undefined,
                commissionedAt: s.commissionedAt,
                handedOverAt: s.handedOverAt,
                override: true,
              }
            : r;
        }),
        at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      {
        ...data,
        warning: [
          data.warning,
          'Saved updates are unavailable; source statuses are shown.',
        ]
          .filter(Boolean)
          .join(' '),
        at: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
});
export const OPTIONS = preflight;
