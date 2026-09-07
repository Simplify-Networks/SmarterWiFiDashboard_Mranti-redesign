'use client';
import { useEffect, useState, type ReactElement } from 'react';
import { ImageIcon, ExternalLink } from 'lucide-react';
import type { Router } from '@/lib/routers';
import { safePhotoLink, type SitePhotos } from '@/lib/site-photos';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
const cache = new Map<string, { at: number; promise: Promise<SitePhotos> }>();
function load(r: Router) {
  const key = r.id + '|' + r.photo;
  let entry = cache.get(key);
  if (!entry || Date.now() - entry.at > 60000) {
    entry = {
      at: Date.now(),
      promise: fetch(`/api/photos?router=${encodeURIComponent(r.id)}`).then(
        async (res) => {
          if (!res.ok) throw Error();
          return (await res.json()) as SitePhotos;
        },
      ),
    };
    cache.set(key, entry);
    entry.promise.catch(() => cache.delete(key));
  }
  return entry.promise;
}
export function SitePhotoGallery({
  router,
  compact = false,
}: {
  router: Router;
  compact?: boolean;
}) {
  const [data, setData] = useState<SitePhotos | null>(null),
    [failed, setFailed] = useState<string[]>([]),
    [error, setError] = useState(false);
  const link = safePhotoLink(router.photo);
  useEffect(() => {
    let active = true;
    setData(null);
    setFailed([]);
    setError(false);
    if (link)
      load(router)
        .then((d) => {
          if (active) setData(d);
        })
        .catch(() => {
          if (active) setError(true);
        });
    return () => {
      active = false;
    };
  }, [router.id, router.photo]);
  const photos = data?.photos.filter((p) => !failed.includes(p.id)) || [];
  return (
    <section
      className={compact ? 'photo-gallery compact' : 'photo-gallery'}
      aria-label={`${router.name} site photos`}
    >
      <div className="photo-heading">
        <ImageIcon size={16} />
        <strong>{compact ? router.name : 'Site photos'}</strong>
        {compact && <span>Phase {router.phase}</span>}
      </div>
      {!link ? (
        <div className="photo-placeholder">
          <ImageIcon size={24} />
          <p>No site photos linked in the source sheet.</p>
        </div>
      ) : !data && !error ? (
        <div className="photo-placeholder" role="status">
          <span className="photo-loading" />
          Loading site photos…
        </div>
      ) : photos.length ? (
        <div className="photo-grid">
          {photos.slice(0, compact ? 1 : 12).map((p, i) => (
            <a
              href={p.href}
              key={p.id}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${router.name} site photo ${i + 1}`}
            >
              <img
                src={p.src}
                alt={`${router.name} site photo ${i + 1}`}
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={() => setFailed((f) => [...f, p.id])}
              />
            </a>
          ))}
        </div>
      ) : (
        <div className="photo-placeholder">
          <ImageIcon size={24} />
          <p>
            {data?.message ||
              'Photo preview unavailable. Open the site photo link to view the files.'}
          </p>
        </div>
      )}
      {link && (
        <a
          className="photo-source-link"
          href={link}
          target="_blank"
          rel="noreferrer"
        >
          Open all site photos <ExternalLink size={13} />
        </a>
      )}
      {compact && (
        <p className="photo-router-ip">
          {router.ip} · Click router for details
        </p>
      )}
    </section>
  );
}
export function RouterPhotoHover({
  router,
  children,
}: {
  router: Router;
  children: ReactElement;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={300} closeDelay={150} render={children} />
      <HoverCardContent
        side="left"
        align="start"
        className="router-photo-hover"
      >
        <SitePhotoGallery router={router} compact />
      </HoverCardContent>
    </HoverCard>
  );
}
