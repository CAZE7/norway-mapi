import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useState } from "react";
import {
  ArrowLeft,
  Check,
  Compass,
  Copy,
  Heart,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Share2,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL, PLACES, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { colorFor, distanceKm } from "@/lib/category-color";

const PlaceMiniMap = lazy(() => import("@/components/PlaceMiniMap"));

export const Route = createFileRoute("/place/$id")({
  loader: ({ params }) => {
    const place = PLACES.find((p) => p.id === params.id);
    if (!place) throw notFound();
    return { place };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Ort nicht gefunden" }, { name: "robots", content: "noindex" }] };
    }
    const { place } = loaderData;
    const title = `${place.name} – ${CATEGORY_LABEL[place.category]} in ${place.region}`;
    return {
      meta: [
        { title },
        { name: "description", content: place.description },
        { property: "og:title", content: title },
        { property: "og:description", content: place.description },
      ],
    };
  },
  component: PlaceDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Ort nicht gefunden</h1>
      <p className="text-muted-foreground mt-2 text-sm">Dieser Ort existiert nicht (mehr).</p>
      <Button asChild className="mt-4"><Link to="/">Zur Karte</Link></Button>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-xl p-8 text-center">
      <h1 className="font-display text-2xl font-semibold">Fehler</h1>
      <p className="text-muted-foreground mt-2 text-sm">{error.message}</p>
      <Button className="mt-4" onClick={reset}>Erneut versuchen</Button>
    </div>
  ),
});

function MiniMapFallback() {
  return (
    <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center text-sm">
      Karte lädt…
    </div>
  );
}

function PlaceDetail() {
  const { place } = Route.useLoaderData() as { place: Place };
  const favorites = useAppStore((s) => s.favorites);
  const route = useAppStore((s) => s.route);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const addToRoute = useAppStore((s) => s.addToRoute);
  const removeFromRoute = useAppStore((s) => s.removeFromRoute);
  const focus = useAppStore((s) => s.focus);

  const isFav = favorites.includes(place.id);
  const inRoute = route.includes(place.id);
  const [copied, setCopied] = useState(false);
  const [coordsCopied, setCoordsCopied] = useState(false);

  const color = colorFor(place.category);
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/place/${place.id}`
      : `/place/${place.id}`;
  const coordString = `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}`;

  async function handleShare() {
    const shareData = {
      title: place.name,
      text: `${place.name} – ${CATEGORY_LABEL[place.category]} in ${place.region}`,
      url: shareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link kopiert", { description: shareUrl });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen", { description: shareUrl });
    }
  }

  async function copyCoords() {
    try {
      await navigator.clipboard.writeText(coordString);
      setCoordsCopied(true);
      toast.success("Koordinaten kopiert", { description: coordString });
      setTimeout(() => setCoordsCopied(false), 2000);
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  const related = PLACES.filter(
    (p) => p.id !== place.id && (p.category === place.category || p.region === place.region),
  )
    .map((p) => ({ p, d: distanceKm(place, p) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky toolbar */}
      <header className="border-border bg-card/90 supports-[backdrop-filter]:bg-card/70 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 p-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Zurück zur Karte">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="font-display truncate text-base font-semibold">{place.name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {CATEGORY_LABEL[place.category]} · {place.region}
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="hidden sm:inline-flex"
            style={{ backgroundColor: color, color: "white" }}
          >
            <Link to="/" onClick={() => focus(place.id)}>
              <MapPin className="mr-1.5 h-4 w-4" /> Auf Karte
            </Link>
          </Button>
          <Button
            variant={isFav ? "default" : "outline"}
            size="icon"
            onClick={() => toggleFav(place.id)}
            aria-label={isFav ? "Favorit entfernen" : "Als Favorit merken"}
          >
            <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleShare}
            aria-label="Link teilen"
          >
            {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 55%, black) 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 40%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.35), transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-sm hover:bg-white/20">
              {CATEGORY_LABEL[place.category]}
            </Badge>
            <Badge className="bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-sm hover:bg-white/15">
              {place.region}
            </Badge>
            {place.quality === 3 && (
              <Badge className="gap-1 bg-white text-foreground shadow-sm">
                <Star className="h-3 w-3 fill-current" /> Highlight
              </Badge>
            )}
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight text-white md:text-5xl">
            {place.name}
          </h1>
          {place.aliases && place.aliases.length > 0 && (
            <p className="mt-2 text-sm text-white/80">
              auch: {place.aliases.join(", ")}
            </p>
          )}
          <div className="mt-4 flex items-center gap-1.5 text-sm text-white/85">
            <Compass className="h-4 w-4" />
            <span className="font-mono">{coordString}</span>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        {/* Overview: description + mini map */}
        <section className="grid gap-4 md:grid-cols-5">
          <div className="bg-card border-border rounded-xl border p-5 md:col-span-3">
            <h2 className="font-display mb-2 text-lg font-semibold">Über diesen Ort</h2>
            <p className="text-foreground/90 leading-relaxed">{place.description}</p>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Kategorie" value={CATEGORY_LABEL[place.category]} accent={color} />
              <Stat label="Region" value={place.region} />
              <Stat
                label="Wertung"
                value={place.quality === 3 ? "Top" : place.quality === 2 ? "Sehenswert" : "Standard"}
              />
            </div>
          </div>

          <div className="bg-card border-border overflow-hidden rounded-xl border md:col-span-2">
            <div className="h-64 w-full md:h-full md:min-h-[280px]">
              <ClientOnly fallback={<MiniMapFallback />}>
                <Suspense fallback={<MiniMapFallback />}>
                  <PlaceMiniMap
                    lat={place.lat}
                    lng={place.lng}
                    category={place.category}
                    name={place.name}
                  />
                </Suspense>
              </ClientOnly>
            </div>
          </div>
        </section>

        {/* Coordinates + actions */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-card border-border rounded-xl border p-5">
            <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-4 w-4" style={{ color }} /> Koordinaten
            </h2>
            <dl className="space-y-2 text-sm">
              <Row label="Breitengrad" value={`${place.lat.toFixed(5)}° N`} />
              <Row label="Längengrad" value={`${place.lng.toFixed(5)}° E`} />
              <Row label="Region" value={place.region} mono={false} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyCoords}>
                {coordsCopied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {coordsCopied ? "Kopiert" : "Koordinaten kopieren"}
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="mr-1.5 h-3.5 w-3.5" /> Google Maps
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=13/${place.lat}/${place.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap
                </a>
              </Button>
            </div>
          </div>

          <div className="bg-card border-border rounded-xl border p-5">
            <h2 className="font-display mb-3 text-lg font-semibold">Aktionen</h2>
            <div className="flex flex-col gap-2">
              <Button asChild style={{ backgroundColor: color, color: "white" }}>
                <Link to="/" onClick={() => focus(place.id)}>
                  <MapPin className="mr-2 h-4 w-4" /> Auf Karte anzeigen
                </Link>
              </Button>
              <Button variant={isFav ? "default" : "outline"} onClick={() => toggleFav(place.id)}>
                <Heart className={cn("mr-2 h-4 w-4", isFav && "fill-current")} />
                {isFav ? "Favorit entfernen" : "Als Favorit"}
              </Button>
              <Button
                variant={inRoute ? "secondary" : "outline"}
                onClick={() => (inRoute ? removeFromRoute(place.id) : addToRoute(place.id))}
              >
                <RouteIcon className="mr-2 h-4 w-4" />
                {inRoute ? "Aus Route entfernen" : "Zur Route hinzufügen"}
              </Button>
              <Button variant="outline" onClick={handleShare} aria-label="Link teilen">
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Share2 className="mr-2 h-4 w-4" />
                )}
                {copied ? "Link kopiert" : "Teilen"}
              </Button>
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold">In der Nähe</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {related.map(({ p, d }) => {
                const c = colorFor(p.category);
                return (
                  <li key={p.id}>
                    <Link
                      to="/place/$id"
                      params={{ id: p.id }}
                      className="bg-card border-border hover:bg-accent group flex items-center gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <span
                        aria-hidden
                        className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/60"
                        style={{ backgroundColor: c }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">{p.name}</div>
                          {p.quality === 3 && (
                            <Star className="text-accent h-3.5 w-3.5 shrink-0 fill-current" />
                          )}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {CATEGORY_LABEL[p.category]} · {p.region}
                        </div>
                      </div>
                      <div className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                        {d < 10 ? d.toFixed(1) : Math.round(d)} km
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
        {accent && (
          <span
            aria-hidden
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
        )}
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : ""}>{value}</dd>
    </div>
  );
}

// Keep Place type referenced for tree-shaking safety
export type _PlaceRef = Place;
