# Deployment

Live URL: https://mranti-5g-rollout.mranti.workers.dev

Hosted on Cloudflare Workers (personal account `ypyik0669@gmail.com`).
Worker name `mranti-5g-rollout`; saved status updates live in the D1
database `mranti-5g-rollout-db` (tables `router_status`, `status_history`).

## Redeploy after code changes

```bash
pnpm install          # first time on a new machine
npx wrangler login    # first time only, opens the browser
pnpm run deploy       # builds, patches dist/server/wrangler.json, deploys
```

`pnpm run db:setup` creates the D1 database and applies `drizzle/*.sql`.
It is idempotent and only needs re-running if the schema changes.

## Notes

- Data comes live from the Google Sheet in `lib/routers.ts`; if the sheet
  is unreachable the app falls back to `public/data/phase*.csv`.
- Map tiles use OpenStreetMap (no API key). CARTO tiles were replaced
  because they watermark unregistered domains with "API KEY REQUIRED".
- `.openai/hosting.json` is only used for local `pnpm dev`; production
  bindings are set by `scripts/deploy.mjs`.

## Update history

- Every save records the operator name typed in the router sheet
  (remembered in the browser) in `status_history.by`.
- `/api/history?router=<id>` returns one router's changes;
  `/api/history?limit=30` feeds the "Recent updates" panel.
- Google Sheet reads are cached for 60 s; the refresh button forces a fresh
  fetch with `/api/routers?fresh=1`.

## Milestone dates

`router_status` keeps `commissioned_at` and `handed_over_at` separately.
Each is set the first time its box is ticked, kept on later saves, and
cleared when the box is unticked. The date filter at the top of the page
and the CSV export use these two dates, not the last-update time.

## Sheet columns

Columns are located by header name (`Name`, `IP`, `Latitude`,
`Commission?`, `Site Photo` ...), so columns may be inserted or reordered
in the sheet. Renaming a header will break parsing; the app then falls
back to the snapshot and shows a warning.

## Refreshing the offline snapshot

```bash
pnpm snapshot   # downloads the three tabs into public/data and stamps the date
```

Run it before `pnpm run deploy` so the fallback stays close to the sheet.
