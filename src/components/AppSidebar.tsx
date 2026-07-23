import React, { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Car,
  ChevronDown,
  Download,
  ExternalLink,
  FileCode,
  Footprints,
  Heart,
  Info,
  List,
  Lock,
  MapPin,
  Route as RouteIcon,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CATEGORY_LABEL,
  PLACES,
  TIER_LABEL,
  type Category,
  type Place,
  type Tier,
} from "@/data/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { colorFor } from "@/lib/category-color";
import PlaceThumb from "@/components/PlaceThumb";
import {
  estimateTimes,
  formatDuration,
  formatKm,
  optimizeOrder,
  totalDistance,
  type Stop,
} from "@/lib/route-optimize";
import { buildGpx, buildKml, downloadTextFile, slugify, type ExportStop } from "@/lib/export";
import { googleMapsRoute } from "@/lib/nav-links";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];
const COLLAPSED_CATEGORY_COUNT = 8;

export function AppSidebar({ results, onNavigate }: { results: Place[]; onNavigate?: () => void }) {
  const [showAllCats, setShowAllCats] = useState(false);
  const query = useAppStore((s) => s.query);
  const setQuery = useAppStore((s) => s.setQuery);
  const categories = useAppStore((s) => s.categories);
  const toggleCategory = useAppStore((s) => s.toggleCategory);
  const clearCategories = useAppStore((s) => s.clearCategories);
  const tiers = useAppStore((s) => s.tiers);
  const toggleTier = useAppStore((s) => s.toggleTier);
  const favorites = useAppStore((s) => s.favorites);
  const route = useAppStore((s) => s.route);
  const focus = useAppStore((s) => s.focus);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const removeFromRoute = useAppStore((s) => s.removeFromRoute);
  const clearRoute = useAppStore((s) => s.clearRoute);
  const addToRoute = useAppStore((s) => s.addToRoute);
  const setRoute = useAppStore((s) => s.setRoute);
  const moveRoute = useAppStore((s) => s.moveRoute);

  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery((prev) => (prev !== query ? query : prev));
  }, [query]);

  useEffect(() => {
    if (localQuery === query) return;
    const timer = setTimeout(() => {
      setQuery(localQuery);
    }, 120);
    return () => clearTimeout(timer);
  }, [localQuery, query, setQuery]);

  const byId = useMemo(() => {
    const m = new Map<string, Place>();
    PLACES.forEach((p) => m.set(p.id, p));
    return m;
  }, []);

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display truncate text-base font-semibold leading-tight">
              Steder i Norge
            </div>
            <div className="text-muted-foreground truncate text-xs">Orte, Natur & Camper</div>
          </div>
          <Link
            to="/admin"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 shrink-0 rounded-md border border-sidebar-border px-2 py-1 text-xs transition-colors"
            title="Geschützter Admin-Bereich"
          >
            <Lock className="h-3 w-3" /> Admin
          </Link>
        </div>

        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Suche Orte, Region, Kategorie…"
            className="pl-9"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            inputMode="search"
          />
          {localQuery && (
            <button
              onClick={() => {
                setLocalQuery("");
                setQuery("");
              }}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
              aria-label="Suche leeren"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3">
          <div className="text-muted-foreground mb-1.5 text-[11px] font-medium uppercase tracking-wide">
            Was möchtest du sehen?
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["geheimtipp", "touristisch", "service"] as Tier[]).map((t) => {
              const active = tiers.includes(t);
              const icon = t === "geheimtipp" ? "✨" : t === "touristisch" ? "★" : "⛽";
              return (
                <button
                  key={t}
                  onClick={() => toggleTier(t)}
                  className={cn(
                    "focus-visible:ring-ring inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
                    active
                      ? t === "geheimtipp"
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-sidebar-border bg-sidebar text-muted-foreground hover:bg-sidebar-accent",
                  )}
                  aria-pressed={active}
                >
                  <span aria-hidden>{icon}</span>
                  {TIER_LABEL[t]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {(showAllCats ? CATEGORIES : CATEGORIES.slice(0, COLLAPSED_CATEGORY_COUNT)).map((c) => {
              const active = categories.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCategory(c)}
                  className={cn(
                    "focus-visible:ring-ring rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-sidebar-border bg-sidebar hover:bg-sidebar-accent",
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={() => setShowAllCats((v) => !v)}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            >
              <ChevronDown
                className={cn("h-3.5 w-3.5 transition-transform", showAllCats && "rotate-180")}
              />
              {showAllCats ? "weniger" : `+${CATEGORIES.length - COLLAPSED_CATEGORY_COUNT} weitere`}
            </button>
            {categories.length > 0 && (
              <button
                onClick={clearCategories}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                zurücksetzen ({categories.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="results" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="results" className="min-w-0 gap-1.5">
            <List className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{results.length}</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="min-w-0 gap-1.5">
            <Heart className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{favorites.length}</span>
          </TabsTrigger>
          <TabsTrigger value="route" className="min-w-0 gap-1.5">
            <RouteIcon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{route.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <PagedResults
              results={results}
              favorites={favorites}
              route={route}
              onFocus={focus}
              onFav={toggleFav}
              onAddRoute={addToRoute}
              onNavigate={onNavigate}
            />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="favorites" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <ul className="divide-sidebar-border divide-y">
              {favorites.length === 0 && (
                <li className="text-muted-foreground p-6 text-center text-sm">
                  Noch keine Favoriten.
                </li>
              )}
              {favorites.map((id) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <MemoizedPlaceRow
                    key={id}
                    place={p}
                    isFav
                    inRoute={route.includes(id)}
                    onSelect={focus}
                    onFav={toggleFav}
                    onAddRoute={addToRoute}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="route" className="mt-0 flex min-h-0 flex-1 flex-col">
          <RoutePanel
            route={route}
            byId={byId}
            focus={focus}
            removeFromRoute={removeFromRoute}
            clearRoute={clearRoute}
            setRoute={setRoute}
            moveRoute={moveRoute}
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

const PAGE_SIZE = 60;

function PagedResults({
  results,
  favorites,
  route,
  onFocus,
  onFav,
  onAddRoute,
  onNavigate,
}: {
  results: Place[];
  favorites: string[];
  route: string[];
  onFocus: (id: string) => void;
  onFav: (id: string) => void;
  onAddRoute: (id: string) => void;
  onNavigate?: () => void;
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Reset the visible page whenever the underlying result set changes.
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [results]);

  const favSet = useMemo(() => new Set(favorites), [favorites]);
  const routeSet = useMemo(() => new Set(route), [route]);

  if (results.length === 0) {
    return (
      <ul className="divide-sidebar-border divide-y">
        <li className="text-muted-foreground p-6 text-center text-sm">
          Keine Treffer. Filter oder Suche anpassen.
        </li>
      </ul>
    );
  }

  const shown = results.slice(0, limit);
  const remaining = results.length - shown.length;

  return (
    <>
      <ul className="divide-sidebar-border divide-y">
        {shown.map((p) => (
          <MemoizedPlaceRow
            key={p.id}
            place={p}
            isFav={favSet.has(p.id)}
            inRoute={routeSet.has(p.id)}
            onSelect={onFocus}
            onFav={onFav}
            onAddRoute={onAddRoute}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
      {remaining > 0 && (
        <div className="p-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setLimit((l) => l + PAGE_SIZE * 2)}
          >
            Weitere {Math.min(remaining, PAGE_SIZE * 2).toLocaleString("de-DE")} von{" "}
            {remaining.toLocaleString("de-DE")} laden
          </Button>
        </div>
      )}
    </>
  );
}

const MemoizedPlaceRow = React.memo(function PlaceRow({
  place,
  isFav,
  inRoute,
  onSelect,
  onFav,
  onAddRoute,
  onNavigate,
}: {
  place: Place;
  isFav: boolean;
  inRoute: boolean;
  onSelect: (id: string) => void;
  onFav: (id: string) => void;
  onAddRoute: (id: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <li className="hover:bg-sidebar-accent group grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-3 transition-colors">
      <button
        className="focus-visible:ring-ring rounded-md focus-visible:outline-none focus-visible:ring-2"
        onClick={() => onSelect(place.id)}
        aria-label={`${place.name} auf Karte anzeigen`}
      >
        <PlaceThumb
          name={place.name}
          aliases={place.aliases}
          color={colorFor(place.category)}
          size={56}
        />
      </button>
      <button
        className="min-w-0 text-left focus-visible:outline-none"
        onClick={() => onSelect(place.id)}
      >
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{place.name}</div>
          {place.tier === "geheimtipp" && (
            <span className="bg-accent/15 text-accent shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Geheimtipp
            </span>
          )}
          {place.tier === "touristisch" && (
            <span className="bg-primary/10 text-primary shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Highlight
            </span>
          )}
          {place.quality === 3 && (
            <Star className="text-accent h-3.5 w-3.5 shrink-0 fill-current" />
          )}
        </div>

        <div className="text-muted-foreground mt-0.5 truncate text-xs">
          {CATEGORY_LABEL[place.category]} · {place.region}
        </div>
        <div className="text-muted-foreground/80 mt-1 line-clamp-2 text-xs">
          {place.description}
        </div>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          size="icon"
          variant={isFav ? "default" : "ghost"}
          onClick={() => onFav(place.id)}
          aria-label={isFav ? "Favorit entfernen" : "Als Favorit speichern"}
          className="h-9 w-9 sm:h-8 sm:w-8 active:scale-95 transition-transform"
        >
          <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
        </Button>
        <Button
          size="icon"
          variant={inRoute ? "default" : "ghost"}
          onClick={() => onAddRoute(place.id)}
          aria-label={inRoute ? "Bereits in Route" : "Zur Route hinzufügen"}
          className="h-9 w-9 sm:h-8 sm:w-8 active:scale-95 transition-transform"
          disabled={inRoute}
        >
          <RouteIcon className="h-4 w-4" />
        </Button>
        <Button
          asChild
          size="icon"
          variant="ghost"
          aria-label="Details ansehen"
          className="h-9 w-9 sm:h-8 sm:w-8 active:scale-95 transition-transform"
        >
          <Link to="/place/$id" params={{ id: place.id }} onClick={onNavigate}>
            <Info className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </li>
  );
});

function RoutePanel({
  route,
  byId,
  focus,
  removeFromRoute,
  clearRoute,
  setRoute,
  moveRoute,
}: {
  route: string[];
  byId: Map<string, Place>;
  focus: (id: string | null) => void;
  removeFromRoute: (id: string) => void;
  clearRoute: () => void;
  setRoute: (ids: string[]) => void;
  moveRoute: (from: number, to: number) => void;
}) {
  const stops: Stop[] = useMemo(
    () =>
      route
        .map((id) => byId.get(id))
        .filter((p): p is Place => !!p)
        .map((p) => ({ id: p.id, lat: p.lat, lng: p.lng })),
    [route, byId],
  );
  const distKm = useMemo(() => totalDistance(stops), [stops]);
  const times = useMemo(() => estimateTimes(distKm), [distKm]);

  const optimize = () => {
    if (stops.length < 3) return;
    const opt = optimizeOrder(stops);
    setRoute(opt.map((s) => s.id));
  };
  const reverse = () => setRoute(route.slice().reverse());

  const exportStops: ExportStop[] = useMemo(
    () =>
      route
        .map((id) => byId.get(id))
        .filter((p): p is Place => !!p)
        .map((p) => ({
          id: p.id,
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          description: p.description,
          category: CATEGORY_LABEL[p.category],
        })),
    [route, byId],
  );
  const exportGpx = () => {
    if (exportStops.length === 0) return;
    downloadTextFile(
      `steder-route-${slugify(exportStops[0].name)}.gpx`,
      buildGpx(exportStops),
      "application/gpx+xml",
    );
    toast.success("GPX exportiert", { description: `${exportStops.length} Stopps` });
  };
  const exportKml = () => {
    if (exportStops.length === 0) return;
    downloadTextFile(
      `steder-route-${slugify(exportStops[0].name)}.kml`,
      buildKml(exportStops),
      "application/vnd.google-earth.kml+xml",
    );
    toast.success("KML exportiert", { description: `${exportStops.length} Stopps` });
  };
  const openInGoogle = () => {
    if (exportStops.length > 11) {
      toast.warning(
        "Google Maps unterstützt maximal 11 Stopps (1 Start + 9 Zwischenstopps + 1 Ziel). Die ersten 11 Stopps werden geöffnet.",
      );
    }
    const url = googleMapsRoute(exportStops);
    if (!url) return;
    window.open(url, "_blank", "noopener");
  };

  if (route.length === 0) {
    return (
      <div className="text-muted-foreground p-6 text-center text-sm">
        Füge Orte zur Route hinzu, um Reihenfolge und Fahrzeit zu berechnen.
      </div>
    );
  }

  return (
    <>
      <div className="border-sidebar-border grid grid-cols-3 gap-1.5 border-b p-2.5">
        <Stat label="Strecke" value={formatKm(times.roadKm)} />
        <Stat
          label="Auto"
          value={formatDuration(times.driveMinutes)}
          icon={<Car className="h-3 w-3" />}
        />
        <Stat
          label="zu Fuß"
          value={formatDuration(times.walkMinutes)}
          icon={<Footprints className="h-3 w-3" />}
        />
      </div>
      <div className="border-sidebar-border flex gap-2 border-b p-3">
        <Button
          size="sm"
          className="flex-1"
          onClick={optimize}
          disabled={stops.length < 3}
          title={stops.length < 3 ? "Mindestens 3 Stopps nötig" : "Reihenfolge optimieren"}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Optimieren
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={reverse}
          disabled={route.length < 2}
          title="Reihenfolge umkehren"
          aria-label="Reihenfolge umkehren"
        >
          <ArrowUp className="h-3.5 w-3.5" />
          <ArrowDown className="-ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <ol className="divide-sidebar-border divide-y">
          {route.map((id, i) => {
            const p = byId.get(id);
            if (!p) return null;
            const leg = i > 0 ? haversineIds(byId, route[i - 1], id) : 0;
            return (
              <li key={id} className="flex items-start gap-2 p-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-primary text-primary-foreground grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                    {i + 1}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveRoute(i, i - 1)}
                      disabled={i === 0}
                      className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors active:scale-95 disabled:opacity-25"
                      aria-label="Nach oben"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveRoute(i, i + 1)}
                      disabled={i === route.length - 1}
                      className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-7 w-7 items-center justify-center rounded-md transition-colors active:scale-95 disabled:opacity-25"
                      aria-label="Nach unten"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button className="min-w-0 flex-1 text-left" onClick={() => focus(id)}>
                  <div className="truncate text-sm font-medium">{p.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {CATEGORY_LABEL[p.category]} · {p.region}
                  </div>
                  {i > 0 && (
                    <div className="text-muted-foreground/80 mt-1 text-[11px]">
                      + {formatKm(leg * 1.3)} von Stopp {i}
                    </div>
                  )}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => removeFromRoute(id)}
                  aria-label={`${p.name} aus Route entfernen`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
      <div className="border-sidebar-border space-y-2 border-t p-3">
        <div className="grid grid-cols-3 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportGpx}
            title="GPX für Komoot, Garmin, Organic Maps …"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" /> GPX
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={exportKml}
            title="KML für Google Earth, Maps.me …"
          >
            <FileCode className="mr-1.5 h-3.5 w-3.5" /> KML
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={openInGoogle}
            title="Route in Google Maps öffnen"
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Maps
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Trash2 className="mr-2 h-4 w-4" /> Route leeren
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Route leeren?</AlertDialogTitle>
              <AlertDialogDescription>
                Möchtest du wirklich alle Stopps aus deiner Route löschen? Diese Aktion kann nicht
                rückgängig gemacht werden.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={clearRoute}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Route leeren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}

function haversineIds(byId: Map<string, Place>, a: string, b: string): number {
  const pa = byId.get(a);
  const pb = byId.get(b);
  if (!pa || !pb) return 0;
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(pb.lat - pa.lat);
  const dLng = toRad(pb.lng - pa.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(pa.lat)) * Math.cos(toRad(pb.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-1.5 py-1.5">
      <div className="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 truncate text-xs font-semibold tabular-nums sm:text-sm">{value}</div>
    </div>
  );
}
