import { cors, preflight, isTrustedOrigin } from '@/lib/cors';
import { getDb } from '@/db';
import { statuses, history } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getSourceCached } from '@/lib/source';
export const POST = cors(async (req: Request) => {
  if (!isTrustedOrigin(req))
    return Response.json({ error: 'Origin not allowed' }, { status: 403 });
  let b: {
    id: string;
    commission: boolean;
    handover: boolean;
    reset?: boolean;
    by?: string;
  };
  try {
    const raw = await req.json();
    if (!raw || typeof raw !== 'object') throw Error();
    b = raw as typeof b;
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (
    typeof b.id !== 'string' ||
    typeof b.commission !== 'boolean' ||
    typeof b.handover !== 'boolean' ||
    (b.handover && !b.commission && !b.reset)
  )
    return Response.json(
      { error: 'Commission the router before completing handover.' },
      { status: 400 },
    );
  const by =
    typeof b.by === 'string' ? b.by.trim().slice(0, 60) || null : null;
  const data = await getSourceCached();
  const r = data.routers.find((r) => r.id === b.id);
  if (!r)
    return Response.json(
      { error: 'Router is not in the source sheet.' },
      { status: 400 },
    );
  try {
    const db = getDb(),
      at = new Date().toISOString();
    const c = b.reset ? r.commission : b.commission,
      h = b.reset ? r.handover : b.handover;
    // Keep the first time each milestone was reached; clear it when unticked.
    const prev = b.reset
      ? undefined
      : (
          await db
            .select()
            .from(statuses)
            .where(eq(statuses.id, b.id))
            .limit(1)
        )[0];
    const commissionedAt = c ? prev?.commissionedAt || at : null;
    const handedOverAt = h ? prev?.handedOverAt || at : null;
    const row = {
      commission: c,
      handover: h,
      updatedAt: at,
      updatedBy: by,
      commissionedAt,
      handedOverAt,
    };
    const mutation = b.reset
      ? db.delete(statuses).where(eq(statuses.id, b.id))
      : db
          .insert(statuses)
          .values({ id: b.id, ...row })
          .onConflictDoUpdate({ target: statuses.id, set: row });
    await db.batch([
      mutation,
      db
        .insert(history)
        .values({
          id: crypto.randomUUID(),
          routerId: b.id,
          commission: c,
          handover: h,
          action: b.reset ? 'restore-source' : 'update',
          at,
          by,
        }),
    ]);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: 'The status could not be saved. Please try again.' },
      { status: 503 },
    );
  }
});
export const OPTIONS = preflight;
