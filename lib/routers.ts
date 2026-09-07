export type Router = {
  id: string;
  phase: number;
  row: number;
  name: string;
  type: string;
  connectTo: string;
  ip: string;
  subnet: string;
  lat: number | null;
  lng: number | null;
  commission: boolean;
  handover: boolean;
  photo: string;
  cameras: { name: string; ip: string; subnet: string }[];
  issues: string[];
  legacy: string;
  override?: boolean;
  updatedAt?: string;
};
export const SHEET =
  'https://docs.google.com/spreadsheets/d/1fNmXMehYd2Y6a46WbISAThfOHLIvTKf0ytYv9r9UFfM';
export const GIDS = [0, 897242695, 804851942];
export function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quote && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quote = !quote;
    } else if (c === ',' && !quote) {
      row.push(cell.trim());
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quote) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}
export function parse(text: string, phase: number): Router[] {
  const rows = csv(text);
  if (rows[0]?.[0] !== 'Name') throw new Error('Unexpected sheet format');
  let parent: string[] = [];
  return rows.flatMap((r, i) => {
    if (i === 0 || !/^\d{1,3}(\.\d{1,3}){3}$/.test(r[5] || '')) return [];
    const continuation = !r[0];
    if (!continuation) parent = r;
    const p = continuation ? parent : r;
    const issues: string[] = [];
    const type = r[1] || (continuation ? p[1] : '') || 'Unspecified';
    if (type === 'Unspecified') issues.push('Router type missing in source');
    const lat = Number(r[10] || (continuation ? p[10] : ''));
    const lng = Number(r[11] || (continuation ? p[11] : ''));
    const gps = !!lat && !!lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!gps) issues.push('GPS missing in source');
    const names = (r[7] || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    const ips = (r[8] || '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (names.length !== ips.length)
      issues.push('CCTV name / IP count mismatch');
    if (p[3]?.includes('found')) issues.push(p[3]);
    return [
      {
        id: `p${phase}-${r[5]}`,
        phase,
        row: i + 1,
        name: p[0],
        type,
        connectTo: p[2] || '',
        ip: r[5],
        subnet: r[6] || '',
        lat: gps ? lat : null,
        lng: gps ? lng : null,
        commission: r[12] === 'TRUE',
        handover: r[13] === 'TRUE',
        photo: p[14] || '',
        legacy: p[3] || '',
        cameras: Array.from(
          { length: Math.max(names.length, ips.length) },
          (_, j) => ({
            name: names[j] || 'Unnamed CCTV',
            ip: ips[j] || 'Not supplied',
            subnet: r[9] || '',
          }),
        ),
        issues,
      },
    ];
  });
}
export function status(r: Router) {
  return r.handover ? 'Handed over' : r.commission ? 'Commissioned' : 'Pending';
}
