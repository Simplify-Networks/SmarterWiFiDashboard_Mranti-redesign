export type Router = {
  id: string;
  phase: number;
  sourcePhase?: number;
  row: number;
  name: string;
  type: string;
  connectTo: string;
  ip: string;
  hostname: string;
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
  updatedBy?: string;
  commissionedAt?: string | null;
  handedOverAt?: string | null;
};
export type HistoryEntry = {
  id: string;
  routerId: string;
  commission: boolean;
  handover: boolean;
  action: string;
  at: string;
  by: string | null;
};
export const SHEET =
  'https://docs.google.com/spreadsheets/d/1fNmXMehYd2Y6a46WbISAThfOHLIvTKf0ytYv9r9UFfM';
export const PHASES = [1, 2] as const;
export function deploymentCategory(phase: number): string {
  return phase === 1 ? 'Priority Deployment' : 'Standard Deployment';
}
// Explicit assignments retain source IDs so updates and history stay linked.
const PHASE_ONE_ROUTER_IDS = new Set([
  'p2-10.100.23.155', // Indoor Petronas 1
  'p2-192.168.250.127', // Outdoor T17
]);
function dashboardPhase(id: string, sourcePhase: number): number {
  if (PHASE_ONE_ROUTER_IDS.has(id)) return 1;
  return sourcePhase === 3 ? 2 : sourcePhase;
}
export function mergePhases(r: Router): Router {
  const sourcePhase = r.sourcePhase ?? r.phase;
  return { ...r, sourcePhase, phase: dashboardPhase(r.id, sourcePhase) };
}

// Keep the original sheet tabs and router IDs for saved statuses and history.
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
/** Column lookup by header name, so inserting or reordering sheet columns does not break parsing. */
export type Columns = {
  name: number;
  type: number;
  connectTo: number;
  legacy: number;
  ip: number;
  hostname: number;
  subnet: number;
  cctvNames: number;
  cctvIps: number;
  cctvSubnet: number;
  lat: number;
  lng: number;
  commission: number;
  handover: number;
  photo: number;
};
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function columns(header: string[]): Columns {
  const h = header.map(norm);
  const find = (test: (x: string) => boolean, skip = 0) => {
    let n = 0;
    for (let i = 0; i < h.length; i++)
      if (test(h[i]) && n++ === skip) return i;
    return -1;
  };
  const c: Columns = {
    name: find((x) => x === 'name'),
    type: find((x) => x === 'type'),
    connectTo: find((x) => x.startsWith('connect')),
    legacy: find((x) => x.startsWith('4g router')),
    ip: find((x) => x.startsWith('ip')),
    // Optional: add a `Hostname` column to the sheet and it shows automatically.
    hostname: find((x) => x.startsWith('hostname') || x.startsWith('host name')),
    subnet: find((x) => x.startsWith('subnet')),
    cctvNames: find((x) => x.startsWith('cctv')),
    cctvIps: find((x) => x.startsWith('ip'), 1),
    cctvSubnet: find((x) => x.startsWith('subnet'), 1),
    lat: find((x) => x.startsWith('lat')),
    lng: find((x) => x.startsWith('lon')),
    commission: find((x) => x.startsWith('commission')),
    handover: find((x) => x.startsWith('handover')),
    photo: find((x) => x.includes('photo')),
  };
  const required: (keyof Columns)[] = [
    'name',
    'ip',
    'lat',
    'lng',
    'commission',
    'handover',
  ];
  const missing = required.filter((k) => c[k] < 0);
  if (missing.length)
    throw new Error(`Unexpected sheet format: missing ${missing.join(', ')}`);
  return c;
}
const cell = (r: string[], i: number) => (i < 0 ? '' : r[i] || '');
export function parse(text: string, phase: number): Router[] {
  const rows = csv(text);
  if (!rows.length) throw new Error('Unexpected sheet format');
  const c = columns(rows[0]);
  let parent: string[] = [];
  return rows.flatMap((r, i) => {
    if (i === 0 || !/^\d{1,3}(\.\d{1,3}){3}$/.test(cell(r, c.ip))) return [];
    const continuation = !cell(r, c.name);
    if (!continuation) parent = r;
    const p = continuation ? parent : r;
    const inherit = (col: number) =>
      cell(r, col) || (continuation ? cell(p, col) : '');
    const issues: string[] = [];
    const type = inherit(c.type) || 'Unspecified';
    if (type === 'Unspecified') issues.push('Router type missing in source');
    const lat = Number(inherit(c.lat));
    const lng = Number(inherit(c.lng));
    const gps = !!lat && !!lng && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    if (!gps) issues.push('GPS missing in source');
    const names = cell(r, c.cctvNames)
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    const ips = cell(r, c.cctvIps)
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean);
    if (names.length !== ips.length)
      issues.push('CCTV name / IP count mismatch');
    const legacy = cell(p, c.legacy);
    if (legacy.includes('found')) issues.push(legacy);
    return [
      {
        id: `p${phase}-${cell(r, c.ip)}`,
        phase: dashboardPhase(`p${phase}-${cell(r, c.ip)}`, phase),
        sourcePhase: phase,
        row: i + 1,
        name: cell(p, c.name),
        type,
        connectTo: cell(p, c.connectTo),
        ip: cell(r, c.ip),
        hostname: cell(r, c.hostname),
        subnet: cell(r, c.subnet),
        lat: gps ? lat : null,
        lng: gps ? lng : null,
        commission: cell(r, c.commission) === 'TRUE',
        handover: cell(r, c.handover) === 'TRUE',
        photo: inherit(c.photo),
        legacy,
        cameras: Array.from(
          { length: Math.max(names.length, ips.length) },
          (_, j) => ({
            name: names[j] || 'Unnamed CCTV',
            ip: ips[j] || 'Not supplied',
            subnet: cell(r, c.cctvSubnet),
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
