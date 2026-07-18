import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { PLACES, searchPlaces } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const NorwayMap = lazy(() => import("@/components/NorwayMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Steder i Norge – Karte, Suche & Reiseplanung" },
      {
        name: "description",
        content:
          "Interaktive Karte für Norwegen: Fjorde, Berge, Wasserfälle, Städte und Camper-Infrastruktur. Mit Suche, Filtern, Favoriten und Routenplanung.",
      },
      { property: "og:title", content: "Steder i Norge" },
      {
        property: "og:description",
        content: "Entdecke Norwegens schönste Orte auf einer interaktiven Karte.",
      },
    ],
  }),
  component: Home,
});

function MapFallback() {
  return <div className="bg-muted h-full w-full animate-pulse" />;
}

function Home() {
  const query = useAppStore((s) => s.query);
  const categories = useAppStore((s) => s.categories);
  const [mobileOpen, setMobileOpen] = useState(false);

  const results = useMemo(() => {
    const hits = searchPlaces(PLACES, query, new Set(categories));
    return hits.map((h) => h.place);
  }, [query, categories]);

  const visibleIds = useMemo(() => new Set(results.map((p) => p.id)), [results]);

  return (
    <div className="bg-background flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop / tablet sidebar */}
      <div className="border-sidebar-border hidden h-full w-[340px] shrink-0 border-r md:block lg:w-[380px]">
        <AppSidebar results={results} />
      </div>

      {/* Map */}
      <div className="relative min-w-0 flex-1">
        <ClientOnly fallback={<MapFallback />}>
          <Suspense fallback={<MapFallback />}>
            <NorwayMap visibleIds={visibleIds} />
          </Suspense>
        </ClientOnly>

        {/* Mobile floating button */}
        <div className="absolute left-3 top-3 z-[1000] md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="sm" className="shadow-lg">
                <Menu className="mr-2 h-4 w-4" /> Orte & Filter
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[92vw] max-w-[420px] p-0">
              <VisuallyHidden>
                <SheetTitle>Orte und Filter</SheetTitle>
              </VisuallyHidden>
              <AppSidebar results={results} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Result count chip */}
        <div className="bg-card/90 text-foreground pointer-events-none absolute right-3 top-3 z-[1000] rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
          {results.length} Orte
        </div>
      </div>
    </div>
  );
}
