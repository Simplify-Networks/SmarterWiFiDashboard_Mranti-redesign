'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Router as RouterIcon,
  MapPinned,
  List,
  RefreshCw,
  ArrowUpRight,
  CheckCheck,
  Radio,
  Camera,
  Search,
  Building2,
  Antenna,
  Download,
  TriangleAlert,
  CalendarDays,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { filterByUpdateDate, malaysiaDate } from '@/lib/report-date';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Router, SHEET, GIDS, parse, status } from '@/lib/routers';
import ParkMap from './park-map';
function weekLabel() {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }),
  );
  const start = new Date(now);
  start.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return (
    start.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' }) +
    ' – ' +
    end.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  );
}
const fmt = (d: string) =>
  new Date(d).toLocaleString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  items: string[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v || items[0])}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Badge({ r }: { r: Router }) {
  return (
    <span
      className={
        'status ' + (r.handover ? 'green' : r.commission ? 'blue' : 'amber')
      }
    >
      <i />
      {status(r)}
    </span>
  );
}
export default function Home() {
  const [routers, setRouters] = useState<Router[]>([]),
    [phase, setPhase] = useState('All phases'),
    [dateFrom, setDateFrom] = useState(''),
    [dateTo, setDateTo] = useState(''),
    [view, setView] = useState('map'),
    [filter, setFilter] = useState('All statuses'),
    [type, setType] = useState('All types'),
    [search, setSearch] = useState(''),
    [selected, setSelected] = useState<Router | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [source, setSource] = useState('Loading source data…'),
    [last, setLast] = useState(''),
    [commission, setCommission] = useState(false),
    [handover, setHandover] = useState(false),
    [saving, setSaving] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch('/api/routers', { cache: 'no-store' });
      if (!res.ok) throw Error();
      const data = (await res.json()) as {
        routers: Router[];
        source: string;
        at: string;
        warning?: string;
      };
      setRouters(data.routers);
      setSource(data.source);
      setLast(data.at);
      if (data.warning) setMessage(data.warning);
    } catch {
      const all = await Promise.all(
        [1, 2, 3].map(async (p) =>
          parse(await (await fetch(`/data/phase${p}.csv`)).text(), p),
        ),
      );
      setRouters(all.flat());
      setSource('Source snapshot · 8 Sep 2026');
      setMessage(
        'Live refresh unavailable. Showing the supplied sheet snapshot. Saved dashboard updates could not be loaded.',
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    refresh();
  }, []);
  const datedRouters = useMemo(
    () => filterByUpdateDate(routers, dateFrom, dateTo),
    [routers, dateFrom, dateTo],
  );
  const dateActive = !!(dateFrom || dateTo);
  const scoped = useMemo(
    () =>
      datedRouters.filter(
        (r) => phase === 'All phases' || r.phase === Number(phase.slice(-1)),
      ),
    [datedRouters, phase],
  );
  const visible = useMemo(
    () =>
      scoped.filter(
        (r) =>
          (filter === 'All statuses' || status(r) === filter) &&
          (type === 'All types' || r.type === type) &&
          `${r.name} ${r.ip} ${r.connectTo} ${r.cameras.map((c) => `${c.name} ${c.ip}`).join(' ')}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [scoped, filter, type, search],
  );
  const done = scoped.filter((r) => r.commission).length,
    handed = scoped.filter((r) => r.handover).length,
    cameras = scoped.reduce((n, r) => n + r.cameras.length, 0);
  function open(r: Router) {
    setSelected(r);
    setCommission(r.commission);
    setHandover(r.handover);
    setMessage('');
  }
  async function save(reset = false) {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, commission, handover, reset }),
      });
      if (!res.ok)
        throw Error(
          ((await res.json()) as { error?: string }).error || 'Unable to save',
        );
      setSelected(null);
      await refresh();
      setMessage(
        reset
          ? 'Source sheet status restored.'
          : 'Status saved to the dashboard. The Google Sheet is unchanged.',
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to save');
    } finally {
      setSaving(false);
    }
  }
  function exportReport() {
    const lines = [
      [
        'Router',
        'Phase',
        'Type',
        'IP',
        'Commissioned',
        'Handed over',
        'CCTVs',
        'Updated',
      ],
      ...visible.map((r) => [
        r.name,
        r.phase,
        r.type,
        r.ip,
        r.commission,
        r.handover,
        r.cameras.length,
        r.updatedAt || 'Source sheet',
      ]),
    ];
    const csv = lines
      .map((row) =>
        row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(','),
      )
      .join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }),
    );
    a.download = `MRANTI-router-status-${dateFrom || 'all'}-to-${dateTo || 'latest'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <div className="dashboard">
      <header className="topbar">
        <div className="brand">
          <img src="/mranti-logo.png" alt="MRANTI" />
          <span className="brand-divider" />
          <span className="project-tag">PARK INFRASTRUCTURE</span>
        </div>
        <div className="partner">
          Delivered by{' '}
          <a href="https://simplify.network/" target="_blank" rel="noreferrer">
            <img
              className="simplify-logo"
              src="/simplify-wordmark.png"
              alt="Simplify"
            />
          </a>
        </div>
      </header>
      <main>
        <div className="report-toolbar">
          <div className="eyebrow">
            <span /> WEEKLY PROJECT REPORT
          </div>
          <time
            className="today-date"
            dateTime={malaysiaDate(new Date().toISOString())}
          >
            <CalendarDays size={15} />
            {new Date().toLocaleDateString('en-MY', {
              timeZone: 'Asia/Kuala_Lumpur',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          <div
            className="date-filters"
            role="group"
            aria-label="Filter by dashboard status update date"
          >
            <span className="date-filter-title">Status updated</span>
            <label>
              From
              <Input
                type="date"
                aria-label="Status updated from date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label>
              To
              <Input
                type="date"
                aria-label="Status updated to date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            {dateActive && (
              <button
                className="text-button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                All dates
              </button>
            )}
          </div>
        </div>
        {dateActive && (
          <p className="date-filter-note" role="status">
            Showing routers whose latest dashboard status update falls within
            the selected dates (MYT). Undated sheet records are excluded.
            Statuses shown are current, not historical snapshots.
          </p>
        )}
        <div className="heading">
          <div>
            <h1>
              5G infrastructure <span>rollout</span>
            </h1>
            <p>
              Critical Park Services <span className="dot">/</span> MRANTI Park
            </p>
          </div>
          <div className="heading-actions">
            <div className="report-date">
              Reporting week <strong>{weekLabel()}</strong>
            </div>
            <button onClick={exportReport} className="button">
              <Download size={16} /> Export report
            </button>
          </div>
        </div>
        <div className="phase-row">
          <Tabs value={phase} onValueChange={(v) => setPhase(String(v))}>
            <TabsList className="phase-tabs">
              {['All phases', 'Phase 1', 'Phase 2', 'Phase 3'].map((p, i) => (
                <TabsTrigger value={p} key={p}>
                  {p}
                  <span className="count">
                    {i === 0 ? 48 : i === 1 ? 24 : 12}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="source">
            <span
              className={
                source.startsWith('Live') ? 'live-dot' : 'snapshot-dot'
              }
            />
            {source}
            <button
              aria-label="Refresh Google Sheets"
              onClick={refresh}
              disabled={busy}
            >
              <RefreshCw size={15} className={busy ? 'spin' : ''} />
            </button>
          </div>
        </div>
        {message && (
          <div className="notice" role="status">
            {message}
            <button
              onClick={() => setMessage('')}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}
        <section className="metrics">
          <article>
            <div className="metric-label">
              {dateActive ? 'Routers matching dates' : 'Routers in scope'}{' '}
              <RouterIcon />
            </div>
            <strong>
              {scoped.length}
              <small>
                / {phase === 'All phases' ? 48 : phase === 'Phase 1' ? 24 : 12}
              </small>
            </strong>
            <p>4G → Robustel R5020 5G</p>
          </article>
          <article>
            <div className="metric-label">
              Commissioned <Radio className="blue-text" />
            </div>
            <strong>
              {done}
              <small className="percent">
                {scoped.length ? Math.round((done / scoped.length) * 100) : 0}%
              </small>
            </strong>
            <Progress
              value={scoped.length ? (done / scoped.length) * 100 : 0}
            />
            <p>{scoped.length - done} awaiting commissioning</p>
          </article>
          <article>
            <div className="metric-label">
              Handed over <CheckCheck className="green-text" />
            </div>
            <strong>
              {handed}
              <small className="percent">
                {scoped.length ? Math.round((handed / scoped.length) * 100) : 0}
                %
              </small>
            </strong>
            <Progress
              value={scoped.length ? (handed / scoped.length) * 100 : 0}
            />
            <p>{scoped.length - handed} awaiting handover</p>
          </article>
          <article>
            <div className="metric-label">
              Associated CCTVs <Camera />
            </div>
            <strong>{cameras}</strong>
            <p>Counted from individual CCTV entries</p>
          </article>
        </section>
        <section className="phase-cards">
          {[1, 2, 3].map((p) => {
            const rr = datedRouters.filter((r) => r.phase === p),
              c = rr.filter((r) => r.commission).length,
              h = rr.filter((r) => r.handover).length;
            return (
              <button
                key={p}
                onClick={() => setPhase(`Phase ${p}`)}
                className={phase === `Phase ${p}` ? 'active' : ''}
              >
                <div>
                  <span className="phase-number">0{p}</span>
                  <strong>Phase {p}</strong>
                  <span className="phase-total">
                    {p === 1 ? 24 : 12} routers <ArrowUpRight size={15} />
                  </span>
                </div>
                <div className="phase-bottom">
                  <span>
                    <i className="blue-dot" />
                    {c} commissioned
                  </span>
                  <span>
                    <i className="green-dot" />
                    {h} handed over
                  </span>
                </div>
              </button>
            );
          })}
        </section>
        <section className="workspace">
          <div className="workspace-heading">
            <div>
              <h2>Network deployment</h2>
              <p>
                {visible.length} routers
                {phase !== 'All phases'
                  ? ` · ${phase}`
                  : ' across three phases'}{' '}
                · Select a router to inspect or update
              </p>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(String(v))}>
              <TabsList className="view-tabs">
                <TabsTrigger value="map">
                  <MapPinned />
                  Map view
                </TabsTrigger>
                <TabsTrigger value="routers">
                  <List />
                  Router view
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="filters">
            <label className="search">
              <Search size={17} />
              <input
                placeholder="Search router, IP or CCTV…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <Choice
              value={filter}
              onChange={setFilter}
              label="Filter by status"
              items={['All statuses', 'Pending', 'Commissioned', 'Handed over']}
            />
            <Choice
              value={type}
              onChange={setType}
              label="Filter by router type"
              items={['All types', 'Indoor', 'Outdoor', 'Unspecified']}
            />
            <span className="results">{visible.length} results</span>
          </div>
          {view === 'map' ? (
            <div className="map-layout">
              <div className="map-area">
                <ParkMap routers={visible} onSelect={open} />
                <div className="map-caption">
                  <MapPinned size={14} /> MRANTI PARK{' '}
                  <span>Kuala Lumpur, Malaysia</span>
                </div>
              </div>
              <aside className="map-list">
                <div className="list-title">
                  Router locations <span>{visible.length}</span>
                </div>
                {visible.length === 0 ? (
                  <p className="empty">No routers match these filters.</p>
                ) : (
                  visible.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => open(r)}
                      className="router-item"
                    >
                      <span
                        className={
                          'router-symbol ' +
                          (r.type === 'Outdoor' ? 'outdoor' : 'indoor')
                        }
                      >
                        {r.type === 'Outdoor' ? (
                          <Antenna size={18} />
                        ) : r.type === 'Indoor' ? (
                          <Building2 size={18} />
                        ) : (
                          <RouterIcon size={18} />
                        )}
                      </span>
                      <span className="router-item-main">
                        <strong>{r.name}</strong>
                        <span>{r.ip}</span>
                        <Badge r={r} />
                      </span>
                      <span className="item-phase">
                        P{r.phase}
                        <ArrowUpRight size={14} />
                      </span>
                    </button>
                  ))
                )}
              </aside>
            </div>
          ) : (
            <div className="router-table">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      'Router / location',
                      'Phase',
                      'Type',
                      'Router IP',
                      'CCTVs',
                      'Status',
                      '',
                    ].map((h, i) => (
                      <TableHead key={i}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <strong>{r.name}</strong>
                        {r.issues.length > 0 && (
                          <span
                            className="issue-dot"
                            title={r.issues.join('; ')}
                          >
                            {' '}
                            •
                          </span>
                        )}
                      </TableCell>
                      <TableCell>Phase {r.phase}</TableCell>
                      <TableCell>{r.type}</TableCell>
                      <TableCell className="mono">{r.ip}</TableCell>
                      <TableCell>{r.cameras.length}</TableCell>
                      <TableCell>
                        <Badge r={r} />
                        {r.override && (
                          <small className="override-label">
                            Dashboard update
                          </small>
                        )}
                      </TableCell>
                      <TableCell>
                        <button className="text-button" onClick={() => open(r)}>
                          Details <ArrowUpRight size={14} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!visible.length && (
                <p className="empty">No routers match these filters.</p>
              )}
            </div>
          )}
          <div className="legend">
            <span>
              <i className="amber-dot" />
              Pending
            </span>
            <span>
              <i className="blue-dot" />
              Commissioned
            </span>
            <span>
              <i className="green-dot" />
              Handed over
            </span>
            <span className="legend-divider" />
            <span>
              <Building2 size={15} />
              Indoor
            </span>
            <span>
              <Antenna size={15} />
              Outdoor
            </span>
            <span>
              <RouterIcon size={15} />
              Unspecified
            </span>
            <span className="map-note">
              Co-located routers are grouped ·{' '}
              {visible.filter((r) => r.lat === null).length} missing GPS
            </span>
          </div>
        </section>
        <div className="bottom-info">
          <span>
            <TriangleAlert size={15} />
            {routers.filter((r) => r.issues.length).length} routers have source
            notes or missing fields. Review in router details.
          </span>
          <a href={SHEET + '/edit'} target="_blank" rel="noreferrer">
            Open source sheet <ArrowUpRight size={14} />
          </a>
        </div>
        <footer>
          <span>
            Simplify × MRANTI <span className="dot">/</span> 5G Network
            Infrastructure for Critical Park Services
          </span>
          <span>
            {last
              ? `Retrieved ${fmt(last)} MYT`
              : 'Source snapshot: 8 Sep 2026'}
          </span>
        </footer>
        <details className="source-notes">
          <summary>Data notes & attribution</summary>
          <p>
            Phases follow the three sheet tabs: 24 / 12 / 12 routers. Each
            router IP is one record. Blank continuation rows inherit only their
            parent site details; missing GPS on a named router is not guessed.
            CCTV totals count individual entries, which may differ from summary
            cells. Status indicates project milestones, not live network uptime.
            Dashboard edits override the sheet until “Restore source status” is
            used. Refresh retrieves all three tabs.
          </p>
          <p>
            MRANTI logo by AdzimAzmi,{' '}
            <a href="https://commons.wikimedia.org/wiki/File:MRANTI_Logo.png">
              Wikimedia Commons
            </a>
            ,{' '}
            <a href="https://creativecommons.org/licenses/by-sa/4.0/">
              CC BY-SA 4.0
            </a>
            , displayed unmodified.
          </p>
        </details>
      </main>
      <Sheet
        open={!!selected}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <SheetContent className="detail-sheet">
          {selected && (
            <>
              <SheetHeader>
                <div className="eyebrow">
                  PHASE {selected.phase} · {selected.type.toUpperCase()}
                </div>
                <SheetTitle className="detail-title">
                  {selected.name}
                </SheetTitle>
                <SheetDescription>
                  Robustel R5020 · 5G industrial router
                </SheetDescription>
              </SheetHeader>
              <div className="detail-body">
                <Badge r={selected} />
                <dl>
                  <dt>Router IP</dt>
                  <dd className="mono">{selected.ip}</dd>
                  <dt>Subnet</dt>
                  <dd className="mono">{selected.subnet || 'Not supplied'}</dd>
                  <dt>Connects to</dt>
                  <dd>{selected.connectTo || 'Not specified'}</dd>
                  <dt>GPS location</dt>
                  <dd>
                    {selected.lat === null
                      ? 'Not supplied'
                      : `${selected.lat}, ${selected.lng}`}
                  </dd>
                </dl>
                <div className="detail-links">
                  {selected.lat !== null && (
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                    >
                      Google Maps ↗
                    </a>
                  )}
                  {selected.photo && (
                    <a target="_blank" rel="noreferrer" href={selected.photo}>
                      Site photos ↗
                    </a>
                  )}
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`${SHEET}/edit#gid=${GIDS[selected.phase - 1]}&range=A${selected.row}:O${selected.row}`}
                  >
                    Source row ↗
                  </a>
                </div>
                {selected.issues.length > 0 && (
                  <div className="data-warning">
                    <TriangleAlert size={17} />
                    <div>
                      {selected.issues.map((t) => (
                        <p key={t}>{t}</p>
                      ))}
                    </div>
                  </div>
                )}
                <h3>Commissioning & handover</h3>
                <p className="muted">
                  Updates are saved in this dashboard. They do not write back to
                  Google Sheets.
                </p>
                <label className="check-row">
                  <Checkbox
                    checked={commission}
                    onCheckedChange={(v) => {
                      setCommission(!!v);
                      if (!v) setHandover(false);
                    }}
                  />
                  Router commissioned
                </label>
                <label className="check-row">
                  <Checkbox
                    checked={handover}
                    disabled={!commission}
                    onCheckedChange={(v) => setHandover(!!v)}
                  />
                  Handover completed
                </label>
                <div className="save-row">
                  <button
                    className="button primary"
                    disabled={saving}
                    onClick={() => save()}
                  >
                    {saving ? 'Saving…' : 'Save status'}
                  </button>
                  {selected.override && (
                    <button
                      className="text-button"
                      disabled={saving}
                      onClick={() => save(true)}
                    >
                      Restore source status
                    </button>
                  )}
                </div>
                {selected.updatedAt && (
                  <p className="muted">
                    Last dashboard update: {fmt(selected.updatedAt)} MYT
                  </p>
                )}
                {message && (
                  <p role="status" className="data-warning">
                    {message}
                  </p>
                )}
                <h3>
                  <Camera size={18} /> Associated CCTVs{' '}
                  <span>{selected.cameras.length}</span>
                </h3>
                {selected.cameras.length ? (
                  selected.cameras.map((c, i) => (
                    <div className="cctv" key={i}>
                      <strong>{c.name}</strong>
                      <span className="mono">{c.ip}</span>
                      <small>Subnet: {c.subnet || 'Not supplied'}</small>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    No CCTV entries attached to this router in the source sheet.
                  </p>
                )}
                <a
                  className="text-button"
                  href="https://drive.google.com/file/d/1kOspb5XnF1764W6z7VmtEPrnH9GcH-aj/view"
                  target="_blank"
                  rel="noreferrer"
                >
                  Robustel R5020 reference ↗
                </a>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
