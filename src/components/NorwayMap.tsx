import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { PLACES, CATEGORY_LABEL, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { colorFor } from "@/lib/category-color";

// Fix default marker icons served from a CDN so we don't fight bundler paths.
const iconRetina = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl, shadowUrl });

function pinIcon(color: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='40' viewBox='0 0 30 40'>
    <path d='M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z' fill='${color}' stroke='white' stroke-width='2'/>
    <circle cx='15' cy='15' r='5' fill='white'/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -36],
  });
}

export default function NorwayMap({ visibleIds }: { visibleIds: Set<string> }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const focusId = useAppStore((s) => s.focusId);
  const focusNonce = useAppStore((s) => s.focusNonce);
  const focus = useAppStore((s) => s.focus);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const addToRoute = useAppStore((s) => s.addToRoute);
  const [tilesLoaded, setTilesLoaded] = useState(false);
  const [markersReady, setMarkersReady] = useState(false);

  const placesById = useMemo(() => {
    const m = new Map<string, Place>();
    PLACES.forEach((p) => m.set(p.id, p));
    return m;
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [64.5, 13.5],
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    tiles.on("load", () => setTilesLoaded(true));

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    });
    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    for (const p of PLACES) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(colorFor(p.category)) });
      const popup = document.createElement("div");
      popup.innerHTML = `
        <div style="min-width:200px;font-family:inherit">
          <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;margin-bottom:4px">${p.name}</div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:6px">${CATEGORY_LABEL[p.category]} · ${p.region}</div>
          <div style="font-size:13px;line-height:1.4;margin-bottom:8px">${p.description}</div>
          <div style="display:flex;gap:6px">
            <button data-act="fav" style="flex:1;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:12px">☆ Favorit</button>
            <button data-act="route" style="flex:1;padding:4px 8px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:12px">＋ Route</button>
          </div>
        </div>`;
      popup.querySelector('[data-act="fav"]')?.addEventListener("click", () => toggleFav(p.id));
      popup.querySelector('[data-act="route"]')?.addEventListener("click", () => addToRoute(p.id));
      m.bindPopup(popup);
      m.on("click", () => focus(p.id));
      markersRef.current.set(p.id, m);
    }
    setMarkersReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
      markersRef.current.clear();
    };
  }, [focus, toggleFav, addToRoute]);

  // Sync visible markers with filter/search results
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    const layers: L.Marker[] = [];
    markersRef.current.forEach((m, id) => {
      if (visibleIds.has(id)) layers.push(m);
    });
    cluster.addLayers(layers);
  }, [visibleIds]);

  // Fly to focused place
  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const p = placesById.get(focusId);
    const m = markersRef.current.get(focusId);
    if (!p) return;
    mapRef.current.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 9), {
      duration: 0.8,
    });
    if (m) setTimeout(() => m.openPopup(), 400);
  }, [focusId, focusNonce, placesById]);

  const loading = !tilesLoaded || !markersReady;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loading && (
        <div
          className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-300"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card/90 px-5 py-4 shadow-lg">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <div className="text-sm font-medium text-foreground">
              {!tilesLoaded ? "Karte wird geladen…" : "Marker werden platziert…"}
            </div>
            <div className="text-xs text-muted-foreground">
              {PLACES.length.toLocaleString("de-DE")} Orte in Norwegen
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
