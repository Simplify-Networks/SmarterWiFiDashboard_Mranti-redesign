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
export function filterByUpdateDate<T extends { updatedAt?: string }>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  if (!from && !to) return rows;
  if (from && to && from > to) return [];
  return rows.filter((r) => {
    const day = r.updatedAt ? malaysiaDate(r.updatedAt) : '';
    return !!day && (!from || day >= from) && (!to || day <= to);
  });
}
