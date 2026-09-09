import p1 from '../public/data/phase1.csv?raw';
import p2 from '../public/data/phase2.csv?raw';
import p3 from '../public/data/phase3.csv?raw';
import { parse, SHEET, GIDS } from './routers';
import { SNAPSHOT_DATE } from './snapshot-date';
export const snapshot = [parse(p1, 1), parse(p2, 2), parse(p3, 3)].flat();
export async function getSource() {
  try {
    const groups = await Promise.all(
      GIDS.map(async (g, i) => {
        const r = await fetch(`${SHEET}/export?format=csv&gid=${g}`, {
          signal: AbortSignal.timeout(12000),
        });
        if (!r.ok) throw new Error('Sheet unavailable');
        const rr = parse(await r.text(), i + 1);
        if (!rr.length) throw new Error('No router records');
        return rr;
      }),
    );
    return {
      routers: groups.flat(),
      source: 'Live Google Sheets',
      warning: '',
    };
  } catch {
    return {
      routers: snapshot,
      source: `Source snapshot · ${SNAPSHOT_DATE}`,
      warning:
        `Google Sheets could not be refreshed. Showing the ${SNAPSHOT_DATE} source snapshot with saved dashboard updates.`,
    };
  }
}
/** 60-second shared cache so map, photos and saves do not each re-fetch three Google Sheet tabs. */
let cached: { at: number; promise: ReturnType<typeof getSource> } | undefined;
export function getSourceCached(maxAgeMs = 60000) {
  if (!cached || Date.now() - cached.at > maxAgeMs)
    cached = { at: Date.now(), promise: getSource() };
  return cached.promise;
}
