// Static build of the dashboard for GitHub Pages. Entry lives in static-site/
// (not pages/, which vinext would treat as Next.js routes). The page talks to the
// Cloudflare Worker for /api/* and loads its own assets from the repo path.
//   pnpm pages:build   ->  dist-pages/
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { defineConfig } from 'vite';

const REPO = 'SmarterWiFiDashboard_Mranti-redesign';
const API = 'https://mranti-5g-rollout.mranti.workers.dev';

export default defineConfig({
  root: 'static-site',
  base: `/${REPO}/`,
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  css: { postcss: { plugins: [tailwindcss()] } },
  define: {
    __API_BASE__: JSON.stringify(API),
    __ASSET_BASE__: JSON.stringify(`/${REPO}`),
  },
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL('./dist-pages', import.meta.url)),
    emptyOutDir: true,
  },
});
