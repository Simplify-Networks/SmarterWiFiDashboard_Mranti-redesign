// Where the client fetches its API and static files from.
// - On the Cloudflare Worker both are same-origin, so the bases are ''.
// - The GitHub Pages build (vite.pages.config.ts) defines __API_BASE__ to
//   point at the Worker and __ASSET_BASE__ to the repository sub-path.
declare const __API_BASE__: string | undefined;
declare const __ASSET_BASE__: string | undefined;
export const API_BASE = typeof __API_BASE__ === 'string' ? __API_BASE__ : '';
export const ASSET_BASE =
  typeof __ASSET_BASE__ === 'string' ? __ASSET_BASE__ : '';
export const api = (path: string) => API_BASE + path;
export const asset = (path: string) => ASSET_BASE + path;
