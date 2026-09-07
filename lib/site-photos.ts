export type SitePhoto = { id: string; src: string; href: string };
export type SitePhotos = {
  photos: SitePhoto[];
  link: string;
  message?: string;
};
export function safePhotoLink(value: string): string {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}
export function driveId(link: string): { id: string; folder: boolean } | null {
  try {
    const u = new URL(link);
    if (u.hostname !== 'drive.google.com') return null;
    const folder = u.pathname.match(/\/folders\/([\w-]+)/);
    const file = u.pathname.match(/\/file\/d\/([\w-]+)/);
    const id = folder?.[1] || file?.[1] || u.searchParams.get('id');
    return id && /^[\w-]+$/.test(id) ? { id, folder: !!folder } : null;
  } catch {
    return null;
  }
}
export function folderPhotoIds(html: string): string[] {
  return [
    ...new Set(
      Array.from(
        html.matchAll(
          /\[null,"([\w-]+)"\],null,null,null,"image\/(?:jpeg|png|webp|gif|heic|heif)"/g,
        ),
        (m) => m[1],
      ),
    ),
  ].slice(0, 12);
}
export function drivePhoto(id: string): SitePhoto {
  return {
    id,
    src: `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w800`,
    href: `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`,
  };
}
