/** Calendar date in Malaysia, independent of browser or server timezone. */
export function malaysiaDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
/** True when the timestamp's Malaysian calendar day falls inside [from, to]. Empty bounds are open. */
export function inRange(
  timestamp: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (!timestamp) return false;
  if (from && to && from > to) return false;
  const day = malaysiaDate(timestamp);
  return !!day && (!from || day >= from) && (!to || day <= to);
}
type Dated = {
  commissionedAt?: string | null;
  handedOverAt?: string | null;
};
export const commissionedIn = (r: Dated, from: string, to: string) =>
  inRange(r.commissionedAt, from, to);
export const handedOverIn = (r: Dated, from: string, to: string) =>
  inRange(r.handedOverAt, from, to);
/** Routers that reached commissioning or handover inside the date range. */
export function filterByMilestoneDate<T extends Dated>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  if (!from && !to) return rows;
  return rows.filter(
    (r) => commissionedIn(r, from, to) || handedOverIn(r, from, to),
  );
}
