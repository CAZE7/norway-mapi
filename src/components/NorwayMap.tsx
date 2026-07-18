import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet.markercluster";
import { PLACES, CATEGORY_LABEL, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { colorFor } from "@/lib/category-color";
import { lookupPlaceImage } from "@/lib/wikipedia";


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
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const focusId = useAppStore((s) => s.focusId);
  const focusNonce = useAppStore((s) => s.focusNonce);
  const focus = useAppStore((s) => s.focus);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const addToRoute = useAppStore((s) => s.addToRoute);
  const [tileProgress, setTileProgress] = useState({ done: 0, total: 0, finished: false });
  const [markerProgress, setMarkerProgress] = useState({ done: 0, total: PLACES.length });


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
      zoomControl: false,
      attributionControl: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const tiles = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    let tilesFinished = false;
    tiles.on("tileloadstart", () => {
      if (tilesFinished) return;
      setTileProgress((p) => ({ ...p, total: p.total + 1 }));
    });
    tiles.on("tileload", () => {
      if (tilesFinished) return;
      setTileProgress((p) => ({ ...p, done: p.done + 1 }));
    });
    tiles.on("load", () => {
      tilesFinished = true;
      setTileProgress((p) => ({ ...p, finished: true, done: Math.max(p.done, p.total) }));
    });

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    });
    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    // Build all markers first (fast, no DOM cost until added to cluster).
    const built: Array<{ id: string; marker: L.Marker }> = [];
    for (const p of PLACES) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(colorFor(p.category)) });
      const color = colorFor(p.category);
      const popup = document.createElement("div");
      popup.className = "npopup";
      const safeName = escapeHtml(p.name);
      const safeMeta = escapeHtml(`${CATEGORY_LABEL[p.category]} · ${p.region}`);
      const safeDesc = escapeHtml(p.description);
      popup.innerHTML = `
        <div style="width:260px;font-family:'DM Sans',system-ui,sans-serif;overflow:hidden;border-radius:10px">
          <div data-img style="position:relative;height:130px;background:linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 45%, black));display:flex;align-items:flex-end">
            <div data-img-inner style="position:absolute;inset:0"></div>
            <div style="position:relative;padding:10px 12px;background:linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0));width:100%;color:white">
              <div style="font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:15px;line-height:1.2;text-shadow:0 1px 3px rgba(0,0,0,0.6)">${safeName}</div>
              <div style="font-size:11px;opacity:0.95;margin-top:2px;text-shadow:0 1px 3px rgba(0,0,0,0.6)">${safeMeta}</div>
            </div>
          </div>
          <div style="padding:10px 12px 12px;background:white">
            <div style="font-size:12.5px;line-height:1.45;color:#374151;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${safeDesc}</div>
            <div style="display:flex;gap:6px">
              <button data-act="details" style="flex:1;padding:6px 8px;border:0;border-radius:6px;background:${color};color:white;cursor:pointer;font-size:12px;font-weight:500">Details</button>
              <button data-act="fav" title="Favorit" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:12px">☆</button>
              <button data-act="route" title="Zur Route" style="padding:6px 10px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:12px">＋</button>
            </div>
          </div>
        </div>`;
      popup.querySelector('[data-act="fav"]')?.addEventListener("click", () => toggleFav(p.id));
      popup.querySelector('[data-act="route"]')?.addEventListener("click", () => addToRoute(p.id));
      popup.querySelector('[data-act="details"]')?.addEventListener("click", () => {
        navigate({ to: "/place/$id", params: { id: p.id } });
      });
      m.bindPopup(popup, { maxWidth: 280, minWidth: 260, closeButton: true });
      let imgLoaded = false;
      m.on("popupopen", () => {
        if (imgLoaded) return;
        imgLoaded = true;
        lookupPlaceImage(p.name, p.aliases).then((hit) => {
          if (!hit) return;
          const holder = popup.querySelector("[data-img-inner]") as HTMLElement | null;
          if (!holder) return;
          const img = document.createElement("img");
          img.src = hit.thumbnail;
          img.alt = "";
          img.loading = "lazy";
          img.decoding = "async";
          img.style.cssText =
            "width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .3s";
          img.onload = () => {
            img.style.opacity = "1";
          };
          holder.appendChild(img);
        });
      });
      m.on("click", () => focus(p.id));
      markersRef.current.set(p.id, m);
      built.push({ id: p.id, marker: m });
    }


    // Add markers to the cluster in chunks so the UI can report progress.
    const CHUNK = 300;
    let cursor = 0;
    let cancelled = false;
    const addNext = () => {
      if (cancelled || !clusterRef.current) return;
      const slice = built.slice(cursor, cursor + CHUNK);
      cursor += slice.length;
      clusterRef.current.addLayers(slice.map((b) => b.marker));
      setMarkerProgress({ done: cursor, total: built.length });
      if (cursor < built.length) {
        requestAnimationFrame(addNext);
      }
    };
    requestAnimationFrame(addNext);

    return () => {
      cancelled = true;
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

  const tilesDone = tileProgress.finished;
  const markersDone = markerProgress.done >= markerProgress.total && markerProgress.total > 0;
  const loading = !tilesDone || !markersDone;

  const tilePct = tileProgress.total
    ? Math.min(100, Math.round((tileProgress.done / tileProgress.total) * 100))
    : 0;
  const markerPct = markerProgress.total
    ? Math.round((markerProgress.done / markerProgress.total) * 100)
    : 0;
  const overallPct = Math.round((tilePct + markerPct) / 2);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {loading && (
        <div
          className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-background/70 backdrop-blur-sm transition-opacity duration-300"
          role="status"
          aria-live="polite"
          aria-label={`Karte wird geladen, ${overallPct}%`}
        >
          <div className="w-[min(20rem,calc(100%-2rem))] rounded-2xl border border-border/60 bg-card/95 p-5 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  Karte wird vorbereitet
                </div>
                <div className="text-xs text-muted-foreground">
                  {overallPct}% · {PLACES.length.toLocaleString("de-DE")} Orte
                </div>
              </div>
            </div>

            <ProgressRow
              label="Kartenkacheln"
              status={
                tilesDone
                  ? "Fertig"
                  : tileProgress.total
                  ? `${tileProgress.done} / ${tileProgress.total}`
                  : "Verbinde…"
              }
              pct={tilePct}
              done={tilesDone}
            />
            <div className="h-3" />
            <ProgressRow
              label="Marker platzieren"
              status={
                markersDone
                  ? "Fertig"
                  : `${markerProgress.done.toLocaleString("de-DE")} / ${markerProgress.total.toLocaleString("de-DE")}`
              }
              pct={markerPct}
              done={markersDone}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  status,
  pct,
  done,
}: {
  label: string;
  status: string;
  pct: number;
  done: boolean;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className={done ? "text-primary" : "text-muted-foreground"}>{status}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-out ${
            done ? "bg-primary" : "bg-primary/70"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

