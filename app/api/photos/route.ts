import { getSource } from '@/lib/source';
import {
  safePhotoLink,
  driveId,
  folderPhotoIds,
  drivePhoto,
  type SitePhotos,
} from '@/lib/site-photos';
let sourceCache:
  | { at: number; promise: ReturnType<typeof getSource> }
  | undefined;
const cache = new Map<string, { at: number; promise: Promise<SitePhotos> }>();
async function resolve(link: string): Promise<SitePhotos> {
  const drive = driveId(link);
  if (!drive) {
    return {
      link,
      photos: /\.(?:jpe?g|png|webp|gif)(?:[?#]|$)/i.test(link)
        ? [{ id: link, src: link, href: link }]
        : [],
      message: 'Open the site photo link to view all files.',
    };
  }
  if (!drive.folder) return { link, photos: [drivePhoto(drive.id)] };
  try {
    const response = await fetch(
      `https://drive.google.com/drive/folders/${drive.id}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!response.ok) throw Error();
    const html = await response.text();
    const photos = folderPhotoIds(html).map(drivePhoto);
    return {
      link,
      photos,
      ...(!photos.length
        ? {
            message:
              'No previewable photos found. Open the folder to view files or sign in to Google Drive.',
          }
        : {}),
    };
  } catch {
    return {
      link,
      photos: [],
      message:
        'Photo preview is unavailable. Open the folder to view the site photos.',
    };
  }
}
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('router');
  if (!id || id.length > 120)
    return Response.json({ error: 'Invalid router' }, { status: 400 });
  if (!sourceCache || Date.now() - sourceCache.at > 60000)
    sourceCache = { at: Date.now(), promise: getSource() };
  const data = await sourceCache.promise;
  const router = data.routers.find((r) => r.id === id);
  if (!router)
    return Response.json({ error: 'Router not found' }, { status: 404 });
  const link = safePhotoLink(router.photo);
  if (!link)
    return Response.json({
      link: '',
      photos: [],
      message: 'No site photos linked in the source sheet.',
    });
  let entry = cache.get(link);
  if (!entry || Date.now() - entry.at > 300000) {
    if (cache.size >= 100) cache.clear();
    entry = { at: Date.now(), promise: resolve(link) };
    cache.set(link, entry);
  }
  return Response.json(await entry.promise, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  });
}
