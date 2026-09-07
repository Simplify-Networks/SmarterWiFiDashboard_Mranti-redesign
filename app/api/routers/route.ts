import { getSource } from '@/lib/source';
import { getDb } from '@/db';
import { statuses } from '@/db/schema';
export async function GET() {
  const data = await getSource();
  try {
    const saved = await getDb().select().from(statuses);
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
}
