import { cors, preflight } from '@/lib/cors';
import { getDb } from '@/db';
import { history } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
export const GET = cors(async (request: Request) => {
  const url = new URL(request.url);
  const router = url.searchParams.get('router');
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
  if (router && router.length > 120)
    return Response.json({ error: 'Invalid router' }, { status: 400 });
  try {
    const db = getDb();
    const q = db.select().from(history);
    const rows = await (router ? q.where(eq(history.routerId, router)) : q)
      .orderBy(desc(history.at))
      .limit(limit);
    return Response.json(
      { entries: rows },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { entries: [], error: 'History is unavailable right now.' },
      { status: 503 },
    );
  }
});
export const OPTIONS = preflight;
