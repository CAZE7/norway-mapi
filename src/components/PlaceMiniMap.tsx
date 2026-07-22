import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { colorFor } from "@/lib/category-color";

function pinIcon(color: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='48' viewBox='0 0 30 40'>
    <path d='M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z' fill='${color}' stroke='white' stroke-width='2'/>
    <circle cx='15' cy='15' r='5' fill='white'/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
}

// Module-level cache: one detached Leaflet instance is reused across every
// detail page. On mount the cached DOM node is re-attached to the current
// container; on unmount it's detached (not destroyed) so tiles stay warm.
type Cache = {
  host: HTMLDivElement;
  map: L.Map;
  marker: L.Marker;
  tilesLoaded: boolean;
};
let cache: Cache | null = null;

function ensureCache(): Cache {
  if (cache) return cache;
  const host = document.createElement("div");
  host.style.width = "100%";
  host.style.height = "100%";
  const map = L.map(host, {
    center: [64.5, 13.5],
    zoom: 11,
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  });
  const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
    maxZoom: 18,
  }).addTo(map);
  const marker = L.marker([64.5, 13.5]).addTo(map);
  cache = { host, map, marker, tilesLoaded: false };
  tiles.on("load", () => {
    if (cache) cache.tilesLoaded = true;
  });
  return cache;
}

export default function PlaceMiniMap({
  lat,
  lng,
  category,
  name,
}: {
  lat: number;
  lng: number;
  category: string;
  name: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(() => cache?.tilesLoaded ?? false);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const c = ensureCache();

    // Attach the cached map DOM into this container.
    container.appendChild(c.host);
    c.marker.setIcon(pinIcon(colorFor(category)));
    c.marker.setLatLng([lat, lng]);
    if (name) c.marker.bindTooltip(name);
    c.map.setView([lat, lng], 11, { animate: false });

    // The container may have a different size than the previous mount.
    requestAnimationFrame(() => c.map.invalidateSize());

    c.tilesLoaded = false;
    setTilesLoaded(false);
    const onLoad = () => {
      c.tilesLoaded = true;
      setTilesLoaded(true);
    };
    c.map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) layer.once("load", onLoad);
    });

    return () => {
      // Detach the cached host so the next mount can adopt it again.
      c.host.parentElement?.removeChild(c.host);
    };
  }, [lat, lng, category, name]);

  return (
    <div className="relative h-full w-full">
      <div ref={ref} className="h-full w-full" aria-label={`Karte für ${name}`} />
      {!tilesLoaded && (
        <div
          className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/90 px-3 py-2 shadow-md">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <span className="text-xs font-medium text-foreground">Karte wird geladen…</span>
          </div>
        </div>
      )}
    </div>
  );
}
