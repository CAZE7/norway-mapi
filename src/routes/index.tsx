import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { Suspense, lazy, useMemo, useState } from "react";
import { Menu } from "lucide-react";
import { getAllPlaces, searchPlaces } from "@/data/places";
import { useAppStore } from "@/lib/store";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

const NorwayMap = lazy(() => import("@/components/NorwayMap"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Steder i Norge – Geheimtipps & Highlights in Norwegen" },
      {
        name: "description",
        content:
          "Über 2.000 handverlesene Orte in Norwegen: echte Geheimtipps abseits der Touristenrouten, dazu die bekanntesten Highlights, Camper-Infrastruktur, Wetter & Nordlicht.",
      },
      { property: "og:title", content: "Steder i Norge – Geheimtipps" },
      {
        property: "og:description",
        content: "Geheimtipps und Highlights in Norwegen auf einer interaktiven Karte.",
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
  const tiers = useAppStore((s) => s.tiers);
  const customPlaces = useAppStore((s) => s.customPlaces);
  const [mobileOpen, setMobileOpen] = useState(false);

  const allPlaces = useMemo(() => getAllPlaces(customPlaces), [customPlaces]);

  const results = useMemo(() => {
    const hits = searchPlaces(allPlaces, query, new Set(categories), new Set(tiers));
    return hits.map((h) => h.place);
  }, [allPlaces, query, categories, tiers]);

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
              <AppSidebar results={results} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Result count chip */}
        <div className="bg-card/90 text-foreground pointer-events-none absolute right-3 top-3 z-[1000] rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
          {results.length.toLocaleString("de-DE")} Orte
        </div>
      </div>
    </div>
  );
}
