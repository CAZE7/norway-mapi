import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Heart, MapPin, Navigation, Route as RouteIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL, PLACES, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

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

  const related = PLACES.filter(
    (p) => p.id !== place.id && (p.category === place.category || p.region === place.region),
  ).slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-border bg-card sticky top-0 z-10 border-b">
        <div className="mx-auto flex max-w-4xl items-center gap-3 p-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Zurück">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="font-display truncate text-lg font-semibold">{place.name}</div>
            <div className="text-muted-foreground truncate text-xs">
              {CATEGORY_LABEL[place.category]} · {place.region}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY_LABEL[place.category]}</Badge>
            <Badge variant="outline">{place.region}</Badge>
            {place.quality === 3 && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-current" /> Highlight
              </Badge>
            )}
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">{place.name}</h1>
          {place.aliases && place.aliases.length > 0 && (
            <p className="text-muted-foreground mt-1 text-sm">
              auch: {place.aliases.join(", ")}
            </p>
          )}
        </section>

        <section className="bg-card border-border rounded-xl border p-5">
          <h2 className="font-display mb-2 text-lg font-semibold">Beschreibung</h2>
          <p className="text-foreground/90 leading-relaxed">{place.description}</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="bg-card border-border rounded-xl border p-5">
            <h2 className="font-display mb-3 flex items-center gap-2 text-lg font-semibold">
              <MapPin className="h-4 w-4" /> Koordinaten
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Breitengrad</dt>
                <dd className="font-mono">{place.lat.toFixed(4)}° N</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Längengrad</dt>
                <dd className="font-mono">{place.lng.toFixed(4)}° E</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Region</dt>
                <dd>{place.region}</dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="mr-1 h-3.5 w-3.5" /> Google Maps
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
              <Button asChild>
                <Link to="/" onClick={() => focus(place.id)}>
                  <MapPin className="mr-2 h-4 w-4" /> Auf Karte zeigen
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
            </div>
          </div>
        </section>

        {related.length > 0 && (
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold">Ähnliche Orte</h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {related.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/place/$id"
                    params={{ id: p.id }}
                    className="bg-card border-border hover:bg-accent block rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{p.name}</div>
                        <div className="text-muted-foreground truncate text-xs">
                          {CATEGORY_LABEL[p.category]} · {p.region}
                        </div>
                      </div>
                      {p.quality === 3 && <Star className="text-accent h-3.5 w-3.5 shrink-0 fill-current" />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

// Keep Place type referenced for tree-shaking safety
export type _PlaceRef = Place;
