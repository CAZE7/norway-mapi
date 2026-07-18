import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, Info, MapPin, Route as RouteIcon, Search, Star, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORY_LABEL, PLACES, searchPlaces, type Category, type Place } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[];

export function AppSidebar({ results }: { results: Place[] }) {
  const { query, setQuery, categories, toggleCategory, clearCategories } = useAppStore();
  const favorites = useAppStore((s) => s.favorites);
  const route = useAppStore((s) => s.route);
  const focus = useAppStore((s) => s.focus);
  const toggleFav = useAppStore((s) => s.toggleFavorite);
  const removeFromRoute = useAppStore((s) => s.removeFromRoute);
  const clearRoute = useAppStore((s) => s.clearRoute);
  const addToRoute = useAppStore((s) => s.addToRoute);

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
          <div className="min-w-0">
            <div className="font-display truncate text-base font-semibold leading-tight">Steder i Norge</div>
            <div className="text-muted-foreground truncate text-xs">Orte, Natur & Camper</div>
          </div>
        </div>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche Orte, Region, Kategorie…"
            className="pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded p-1"
              aria-label="Suche leeren"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => {
            const active = categories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-sidebar-border bg-sidebar hover:bg-sidebar-accent",
                )}
              >
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
          {categories.length > 0 && (
            <button
              onClick={clearCategories}
              className="text-muted-foreground hover:text-foreground px-2 text-xs underline"
            >
              zurücksetzen
            </button>
          )}
        </div>
      </div>

      <Tabs defaultValue="results" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mx-3 mt-3 grid grid-cols-3">
          <TabsTrigger value="results">
            Ergebnisse
            <Badge variant="secondary" className="ml-2">{results.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="mr-1 h-3.5 w-3.5" /> {favorites.length}
          </TabsTrigger>
          <TabsTrigger value="route">
            <RouteIcon className="mr-1 h-3.5 w-3.5" /> {route.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-0 min-h-0 flex-1">
          <ScrollArea className="h-full">
            <ul className="divide-sidebar-border divide-y">
              {results.length === 0 && (
                <li className="text-muted-foreground p-6 text-center text-sm">
                  Keine Treffer. Filter oder Suche anpassen.
                </li>
              )}
              {results.map((p) => (
                <PlaceRow
                  key={p.id}
                  place={p}
                  isFav={favorites.includes(p.id)}
                  inRoute={route.includes(p.id)}
                  onSelect={() => focus(p.id)}
                  onFav={() => toggleFav(p.id)}
                  onAddRoute={() => addToRoute(p.id)}
                />
              ))}
            </ul>
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
                  <PlaceRow
                    key={id}
                    place={p}
                    isFav
                    inRoute={route.includes(id)}
                    onSelect={() => focus(id)}
                    onFav={() => toggleFav(id)}
                    onAddRoute={() => addToRoute(id)}
                  />
                );
              })}
            </ul>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="route" className="mt-0 flex min-h-0 flex-1 flex-col">
          <ScrollArea className="flex-1">
            <ol className="divide-sidebar-border divide-y">
              {route.length === 0 && (
                <li className="text-muted-foreground p-6 text-center text-sm">
                  Füge Orte zur Route hinzu.
                </li>
              )}
              {route.map((id, i) => {
                const p = byId.get(id);
                if (!p) return null;
                return (
                  <li key={id} className="flex items-start gap-3 p-3">
                    <div className="bg-primary text-primary-foreground grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold">
                      {i + 1}
                    </div>
                    <button className="min-w-0 flex-1 text-left" onClick={() => focus(id)}>
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {CATEGORY_LABEL[p.category]} · {p.region}
                      </div>
                    </button>
                    <Button size="icon" variant="ghost" onClick={() => removeFromRoute(id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ol>
          </ScrollArea>
          {route.length > 0 && (
            <div className="border-sidebar-border border-t p-3">
              <Button variant="outline" className="w-full" onClick={clearRoute}>
                <Trash2 className="mr-2 h-4 w-4" /> Route leeren
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function PlaceRow({
  place,
  isFav,
  inRoute,
  onSelect,
  onFav,
  onAddRoute,
}: {
  place: Place;
  isFav: boolean;
  inRoute: boolean;
  onSelect: () => void;
  onFav: () => void;
  onAddRoute: () => void;
}) {
  return (
    <li className="hover:bg-sidebar-accent group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 p-3 transition-colors">
      <button className="min-w-0 text-left" onClick={onSelect}>
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium">{place.name}</div>
          {place.quality === 3 && <Star className="text-accent h-3.5 w-3.5 shrink-0 fill-current" />}
        </div>
        <div className="text-muted-foreground mt-0.5 truncate text-xs">
          {CATEGORY_LABEL[place.category]} · {place.region}
        </div>
        <div className="text-muted-foreground/80 mt-1 line-clamp-2 text-xs">{place.description}</div>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <Button
          size="icon"
          variant={isFav ? "default" : "ghost"}
          onClick={onFav}
          aria-label="Favorit"
          className="h-7 w-7"
        >
          <Heart className={cn("h-3.5 w-3.5", isFav && "fill-current")} />
        </Button>
        <Button
          size="icon"
          variant={inRoute ? "default" : "ghost"}
          onClick={onAddRoute}
          aria-label="Zur Route"
          className="h-7 w-7"
          disabled={inRoute}
        >
          <RouteIcon className="h-3.5 w-3.5" />
        </Button>
        <Button asChild size="icon" variant="ghost" aria-label="Details" className="h-7 w-7">
          <Link to="/place/$id" params={{ id: place.id }}>
            <Info className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </li>
  );
}
