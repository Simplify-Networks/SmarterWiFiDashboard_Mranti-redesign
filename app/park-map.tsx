'use client';
import { useEffect, useRef, useState } from 'react';
import type { Router } from '@/lib/routers';
import { status } from '@/lib/routers';
import 'leaflet/dist/leaflet.css';
import { createRoot, type Root } from 'react-dom/client';
import { SitePhotoGallery } from './site-photos';
export default function ParkMap({
  routers,
  onSelect,
  theme,
}: {
  routers: Router[];
  theme: 'light' | 'dark';
  onSelect: (r: Router) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    let map: import('leaflet').Map | undefined;
    const previewRoots: Root[] = [];
    import('leaflet')
      .then((L) => {
        if (disposed || !ref.current) return;
        map = L.map(ref.current, { scrollWheelZoom: false }).setView(
          [3.05, 101.69],
          15,
        );
        L.tileLayer(
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          },
        )
          .on('tileerror', () => setError(true))
          .addTo(map);
        const groups = new Map<string, Router[]>();
        routers
          .filter((r) => r.lat !== null && r.lng !== null)
          .forEach((r) => {
            const k = `${r.lat},${r.lng}`;
            groups.set(k, [...(groups.get(k) || []), r]);
          });
        const bounds: [number, number][] = [];
        groups.forEach((rr) => {
          const r = rr[0];
          bounds.push([r.lat!, r.lng!]);
          const color = rr.every((x) => x.handover)
            ? 'green'
            : rr.every((x) => x.commission)
              ? 'blue'
              : rr.some((x) => x.commission || x.handover)
                ? 'mixed'
                : 'amber';
          const symbol =
            r.type === 'Outdoor' ? '⌁' : r.type === 'Indoor' ? '▤' : '◇';
          const marker = L.marker([r.lat!, r.lng!], {
            icon: L.divIcon({
              className: 'map-marker',
              html: `<div class="pin ${color}"><span>${symbol}</span>${rr.length > 1 ? `<b>${rr.length}</b>` : ''}</div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
            title: rr.map((x) => `${x.name} — ${status(x)}`).join(','),
          }).addTo(map!);
          const preview = document.createElement('div');
          let previewRoot: Root | undefined;
          marker.bindTooltip(preview, {
            className: 'map-photo-tooltip',
            direction: 'auto',
            interactive: true,
            opacity: 1,
          });
          marker.on('tooltipopen', () => {
            if (!previewRoot) {
              previewRoot = createRoot(preview);
              previewRoots.push(previewRoot);
              previewRoot.render(
                <div className="map-photo-group">
                  {rr.map((x) => (
                    <SitePhotoGallery key={x.id} router={x} compact />
                  ))}
                </div>,
              );
            }
          });
          const element = marker.getElement();
          element?.addEventListener('focus', () => marker.openTooltip());
          element?.addEventListener('blur', () => marker.closeTooltip());
          if (rr.length === 1) marker.on('click', () => select.current(r));
          else {
            const box = document.createElement('div');
            box.className = 'map-popup';
            rr.forEach((x) => {
              const b = document.createElement('button');
              b.textContent = `${x.name} · ${x.ip} · ${status(x)}`;
              b.onclick = () => select.current(x);
              box.appendChild(b);
            });
            marker.bindPopup(box);
          }
        });
        if (bounds.length)
          map.fitBounds(bounds, { padding: [45, 45], maxZoom: 17 });
        setTimeout(() => map?.invalidateSize(), 80);
      })
      .catch(() => setError(true));
    return () => {
      disposed = true;
      queueMicrotask(() => previewRoots.forEach((root) => root.unmount()));
      map?.remove();
    };
  }, [routers, theme]);
  return (
    <>
      <div
        ref={ref}
        className="leaflet-map"
        aria-label="Interactive map of MRANTI router locations"
      />
      {error && (
        <div className="map-error">
          Map tiles unavailable. Router details remain available in the list.
        </div>
      )}
    </>
  );
}
