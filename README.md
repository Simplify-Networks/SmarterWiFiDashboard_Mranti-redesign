# MRANTI 5G Infrastructure Rollout Dashboard

Weekly commissioning and handover tracker for MRANTI Park's three-phase
5G router upgrade (48 Robustel R5020 routers), delivered by Simplify.

- Live: https://mranti-5g-rollout.mranti.workers.dev
- Source data: Google Sheet (three phase tabs), with a CSV snapshot fallback in `public/data/`
- Status updates and history are stored in Cloudflare D1

## Develop

```bash
pnpm install
pnpm dev
```

## Deploy

See [DEPLOY.md](DEPLOY.md). In short: `npx wrangler login` once, then `pnpm run deploy`.
