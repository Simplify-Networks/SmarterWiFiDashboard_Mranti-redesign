// Lets the GitHub Pages copy of the dashboard call this Worker's API.
export const ALLOWED_ORIGINS = ['https://simplify-networks.github.io'];
type Handler = (req: Request) => Promise<Response> | Response;
function allowed(req: Request): string {
  const origin = req.headers.get('origin') || '';
  if (!origin) return '';
  if (origin === new URL(req.url).origin) return '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
}
export function isTrustedOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  return (
    !origin ||
    origin === new URL(req.url).origin ||
    ALLOWED_ORIGINS.includes(origin)
  );
}
export function cors(handler: Handler): Handler {
  return async (req) => {
    const origin = allowed(req);
    if (req.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: origin
          ? {
              'Access-Control-Allow-Origin': origin,
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Max-Age': '86400',
              Vary: 'Origin',
            }
          : {},
      });
    const res = await handler(req);
    if (!origin) return res;
    const headers = new Headers(res.headers);
    headers.set('Access-Control-Allow-Origin', origin);
    headers.append('Vary', 'Origin');
    return new Response(res.body, { status: res.status, headers });
  };
}
export const preflight = cors(() => new Response(null, { status: 404 }));
