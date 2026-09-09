# MRANTI 5G Infrastructure Rollout Dashboard

Weekly commissioning and handover tracker for MRANTI Park's two-phase
5G router upgrade (48 Robustel R5020 routers), delivered by Simplify.

- Live (GitHub Pages): https://simplify-networks.github.io/SmarterWiFiDashboard_Mranti-redesign/
- API + database (Cloudflare Worker): https://mranti-5g-rollout.mranti.workers.dev (also serves the full page)
- Source data: Google Sheet (three phase tabs), with a CSV snapshot fallback in `public/data/`
- Phase 1 includes the first source tab plus Indoor Petronas 1 and Outdoor T17 (26 routers); Phase 2 includes the remaining routers from the second and third tabs (22 routers). Original router IDs are retained so saved updates and history remain linked.
- Status updates and history are stored in Cloudflare D1

## Develop

```bash
pnpm install
pnpm dev
```

## Deploy

See [DEPLOY.md](DEPLOY.md).

- Page on GitHub Pages: pushed automatically on every commit to `main` (`.github/workflows/pages.yml`).
- API on Cloudflare: `npx wrangler login` once, then `pnpm run deploy` whenever `app/api`, `lib` or `db` change.
