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
  const mapRef = useRef<L.Map | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    tiles.on("load", () => setTilesLoaded(true));
    L.marker([lat, lng], { icon: pinIcon(colorFor(category)), title: name }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
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
