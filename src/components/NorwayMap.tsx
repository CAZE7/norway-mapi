import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2, Minimize2 } from "lucide-react";
import L from "leaflet";
import "leaflet.markercluster";
import { PLACES, CATEGORY_LABEL, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { colorFor } from "@/lib/category-color";
import { lookupPlaceImage } from "@/lib/wikipedia";

const iconRetina = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: iconRetina, iconUrl, shadowUrl });

const ADD_BATCH = 200;

function escapeHtml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

// Cache pin icons per color/size so we don't re-generate SVG for every marker.
const iconCache = new Map<string, L.DivIcon>();
function pinIcon(color: string, quality: number): L.DivIcon {
  const size = quality === 3 ? 36 : quality === 2 ? 32 : 28;
  const key = `${color}|${size}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const w = size;
  const h = Math.round(size * 1.3);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 32 42">
      <defs>
        <filter id="s" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path filter="url(#s)" fill="${color}" stroke="#ffffff" stroke-width="2"
        d="M16 1C8.27 1 2 7.27 2 15c0 10.5 12.3 24.2 13.1 25.1a1.2 1.2 0 0 0 1.8 0C17.7 39.2 30 25.5 30 15 30 7.27 23.73 1 16 1z"/>
      <circle cx="16" cy="15" r="5.2" fill="#ffffff" fill-opacity="0.95"/>
    </svg>`;
  const icon = L.divIcon({
    html: svg,
    className: "n-pin",
    iconSize: [w, h],
    iconAnchor: [w / 2, h - 2],
    popupAnchor: [0, -h + 8],
  });
  iconCache.set(key, icon);
  return icon;
}

function buildPopup(
  p: Place,
  color: string,
  handlers: { onFav: () => void; onRoute: () => void; onDetails: () => void },
): HTMLElement {
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
          <button data-act="details" aria-label="Details zu ${safeName}" style="flex:1;padding:8px 12px;border:0;border-radius:6px;background:${color};color:white;cursor:pointer;font-size:12.5px;font-weight:600;min-height:36px">Details</button>
          <button data-act="fav" title="Favorit" aria-label="Als Favorit merken" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;min-height:36px;min-width:36px">☆</button>
          <button data-act="route" title="Zur Route" aria-label="Zur Route hinzufügen" style="padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;background:white;cursor:pointer;font-size:14px;min-height:36px;min-width:36px">＋</button>
        </div>
      </div>
    </div>`;
  popup.querySelector('[data-act="fav"]')?.addEventListener("click", handlers.onFav);
  popup.querySelector('[data-act="route"]')?.addEventListener("click", handlers.onRoute);
  popup.querySelector('[data-act="details"]')?.addEventListener("click", handlers.onDetails);
  return popup;
}

type ClusterGroup = L.MarkerClusterGroup;

export default function NorwayMap({ visibleIds }: { visibleIds: Set<string> }) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<ClusterGroup | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const currentIdsRef = useRef<Set<string>>(new Set());
  const syncTimerRef = useRef<number | null>(null);
  const batchTimerRef = useRef<number | null>(null);
  const focusId = useAppStore((s) => s.focusId);
  const focusNonce = useAppStore((s) => s.focusNonce);
  const focus = useAppStore((s) => s.focus);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const addToRoute = useAppStore((s) => s.addToRoute);
  const route = useAppStore((s) => s.route);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [tileProgress, setTileProgress] = useState({ done: 0, total: 0, finished: false });
  const [markerProgress, setMarkerProgress] = useState({ done: 0, total: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (mapRef.current) setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) wrapperRef.current.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };

  const actionsRef = useRef({ focus, toggleFav, addToRoute, navigate });
  actionsRef.current = { focus, toggleFav, addToRoute, navigate };

  const placesById = useMemo(() => {
    const m = new Map<string, Place>();
    PLACES.forEach((p) => m.set(p.id, p));
    return m;
  }, []);

  const createMarker = (p: Place): L.Marker => {
    const cached = markersRef.current.get(p.id);
    if (cached) return cached;
    const color = colorFor(p.category);
    const marker = L.marker([p.lat, p.lng], {
      icon: pinIcon(color, p.quality ?? 1),
      bubblingMouseEvents: false,
    });
    let popupBuilt = false;
    const buildAndOpen = () => {
      if (!popupBuilt) {
        popupBuilt = true;
        const popup = buildPopup(p, color, {
          onFav: () => actionsRef.current.toggleFav(p.id),
          onRoute: () => actionsRef.current.addToRoute(p.id),
          onDetails: () => actionsRef.current.navigate({ to: "/place/$id", params: { id: p.id } }),
        });
        marker.bindPopup(popup, { maxWidth: 280, minWidth: 260, closeButton: true });
        const holder = popup.querySelector("[data-img-inner]") as HTMLElement | null;
        if (holder) {
          lookupPlaceImage(p.name, p.aliases).then((hit) => {
            if (!hit || holder.querySelector("img")) return;
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
        }
      }
      marker.openPopup();
    };
    marker.on("click", () => {
      actionsRef.current.focus(p.id);
      buildAndOpen();
    });
    markersRef.current.set(p.id, marker);
    return marker;
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [64.5, 13.5],
      zoom: 5,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
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
    tiles.on("tileerror", () => {
      if (tilesFinished) return;
      setTileProgress((p) => ({ ...p, done: p.done + 1 }));
    });
    tiles.on("load", () => {
      tilesFinished = true;
      setTileProgress((p) => ({ ...p, finished: true, done: Math.max(p.done, p.total) }));
    });

    const cluster = (L as unknown as {
      markerClusterGroup: (opts: L.MarkerClusterGroupOptions) => ClusterGroup;
    }).markerClusterGroup({
      chunkedLoading: true,
      chunkInterval: 60,
      chunkDelay: 20,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      disableClusteringAtZoom: 12,
    });
    cluster.addTo(map);
    mapRef.current = map;
    clusterRef.current = cluster;

    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      if (batchTimerRef.current) window.clearTimeout(batchTimerRef.current);
      try {
        cluster.clearLayers();
        map.remove();
      } catch {
        // no-op
      }
      mapRef.current = null;
      clusterRef.current = null;
      markersRef.current.clear();
      currentIdsRef.current.clear();
    };
  }, []);

  // Sync visible markers via a debounced diff; clustering handles zoom-based grouping.
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      const targetIds = new Set(visibleIds);
      [...route, focusId].forEach((id) => {
        if (id && placesById.has(id)) targetIds.add(id);
      });

      const current = currentIdsRef.current;
      const toAdd: L.Marker[] = [];
      const toRemove: L.Marker[] = [];
      targetIds.forEach((id) => {
        if (!current.has(id)) {
          const place = placesById.get(id);
          if (place) toAdd.push(createMarker(place));
        }
      });
      current.forEach((id) => {
        if (!targetIds.has(id)) {
          const m = markersRef.current.get(id);
          if (m) toRemove.push(m);
        }
      });

      if (toRemove.length) {
        cluster.removeLayers(toRemove);
        toRemove.forEach((m) => {
          const entry = [...markersRef.current.entries()].find(([, v]) => v === m);
          if (entry) current.delete(entry[0]);
        });
      }

      if (batchTimerRef.current) window.clearTimeout(batchTimerRef.current);
      let i = 0;
      const addChunk = () => {
        const slice = toAdd.slice(i, i + ADD_BATCH);
        if (slice.length) {
          cluster.addLayers(slice);
          slice.forEach((m) => {
            const entry = [...markersRef.current.entries()].find(([, v]) => v === m);
            if (entry) current.add(entry[0]);
          });
          i += ADD_BATCH;
          setMarkerProgress({ done: current.size, total: targetIds.size });
          if (i < toAdd.length) {
            batchTimerRef.current = window.setTimeout(addChunk, 16);
            return;
          }
        }
        setMarkerProgress({ done: targetIds.size, total: targetIds.size });
      };
      setMarkerProgress({ done: current.size, total: targetIds.size });
      addChunk();
    }, 120);

    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [visibleIds, route, focusId, placesById]);

  // Fly to focused place with padding so it isn't hidden by UI.
  useEffect(() => {
    if (!focusId || !mapRef.current) return;
    const p = placesById.get(focusId);
    if (!p) return;
    const cluster = clusterRef.current;
    let m = markersRef.current.get(focusId);
    if (!m && cluster) {
      m = createMarker(p);
      cluster.addLayer(m);
      currentIdsRef.current.add(p.id);
    }
    const map = mapRef.current;
    const isMobile = window.innerWidth < 768;
    const paddingTopLeft: L.PointExpression = isMobile ? [20, 80] : [400, 40];
    const paddingBottomRight: L.PointExpression = isMobile ? [20, 260] : [60, 60];
    const targetZoom = Math.max(map.getZoom(), 13);
    map.flyTo([p.lat, p.lng], targetZoom, { duration: 0.9, paddingTopLeft, paddingBottomRight } as L.ZoomPanOptions);
    const marker = m;
    const openWhenReady = () => {
      if (!marker) return;
      const c = clusterRef.current;
      if (c && typeof (c as unknown as { zoomToShowLayer: (m: L.Marker, cb: () => void) => void }).zoomToShowLayer === "function") {
        (c as unknown as { zoomToShowLayer: (m: L.Marker, cb: () => void) => void }).zoomToShowLayer(marker, () => marker.openPopup());
      } else {
        marker.openPopup();
      }
    };
    map.once("moveend", openWhenReady);
    setTimeout(() => {
      map.off("moveend", openWhenReady);
      openWhenReady();
    }, 1200);
  }, [focusId, focusNonce, placesById]);

  // Route polyline + numbered badges.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
    if (route.length < 1) return;
    const pts: L.LatLngExpression[] = [];
    const layer = L.layerGroup();
    route.forEach((id, i) => {
      const p = placesById.get(id);
      if (!p) return;
      pts.push([p.lat, p.lng]);
      const badge = L.divIcon({
        html: `<div style="background:var(--primary);color:var(--primary-foreground);width:26px;height:26px;border-radius:9999px;display:grid;place-items:center;font:600 12px 'Space Grotesk',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.35);border:2px solid white">${i + 1}</div>`,
        className: "",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([p.lat, p.lng], {
        icon: badge,
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(layer);
    });
    if (pts.length >= 2) {
      const primaryColor =
        typeof window !== "undefined"
          ? getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() ||
            "#0a0a0a"
          : "#0a0a0a";
      L.polyline(pts, { color: primaryColor, weight: 4, opacity: 0.85, dashArray: "8 6" }).addTo(layer);
    }
    layer.addTo(map);
    routeLayerRef.current = layer;
  }, [route, placesById]);

  const tilesDone = tileProgress.finished;
  const markersDone = markerProgress.total === 0 || markerProgress.done >= markerProgress.total;
  const loading = !tilesDone || !markersDone;
  const tilePct = tileProgress.total
    ? Math.min(100, Math.round((tileProgress.done / tileProgress.total) * 100))
    : 0;
  const markerPct = markerProgress.total
    ? Math.round((markerProgress.done / markerProgress.total) * 100)
    : 0;
  const overallPct = Math.round((tilePct + markerPct) / 2);

  return (
    <div ref={wrapperRef} className="relative h-full w-full bg-background">
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? "Vollbild beenden" : "Karte im Vollbild anzeigen"}
        title={isFullscreen ? "Vollbild beenden" : "Vollbild (Mobil & Desktop)"}
        className="absolute right-3 top-14 z-[1000] flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-card/90 text-foreground shadow-md backdrop-blur transition hover:bg-accent active:scale-95 sm:top-3"
      >
        {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>
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
