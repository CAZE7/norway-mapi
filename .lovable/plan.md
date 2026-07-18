Neubau der App "Steder i Norge" in Lovable (TanStack Start + React + Tailwind v4 + Leaflet). Fokus: Design, Suche, Karte und einheitlich gute Nutzung auf Mobile, Tablet und Desktop.

## Design-System

- Palette **Forest & Moss** (dunkelgrün #1a3c2a, waldgrün #2d5a3d, moos #5a8a5c, salbei #a0c49d), definiert als OKLCH-Tokens in `src/styles.css` (`--primary`, `--accent`, `--background`, `--muted`, …). Light- und Dark-Mode.
- Typografie **Space Grotesk** (Headlines) + **DM Sans** (Body), geladen per `<link>` im `__root.tsx`, als `--font-display` / `--font-sans` in `@theme`.
- shadcn-Komponenten (Button, Input, Sheet, Sidebar, Tabs, Badge, ScrollArea, Toggle, Tooltip, Card).

## Layout (Sidebar + Karte, responsiv)

```text
┌──────────────────────────────────────────┐
│ Header: Logo · Suche · Aktionen          │
├────────────┬─────────────────────────────┤
│ Sidebar    │                             │
│  Suche     │        Leaflet-Karte        │
│  Filter    │        (POIs, Camper,       │
│  Ergebnis- │         aktive Route)       │
│  Liste     │                             │
│  Favoriten │  Floating: Layer-Switch,    │
│  Route     │  Zoom, "Mein Standort"      │
└────────────┴─────────────────────────────┘
```

- **Desktop (≥1024px):** feste Sidebar links (~360 px), Karte füllt Rest.
- **Tablet (≥768px):** schmalere Sidebar (~300 px), gleiche Struktur.
- **Mobile (<768px):** Karte vollflächig, Sidebar als Bottom-Sheet (shadcn `Sheet`) mit Snap-Points (Handle, Suche + Kategorien, Ergebnisliste, Favoriten/Route via Tabs). Karten-FABs (Standort, Layer, Filter) unten rechts.

## Routen (TanStack Start)

- `/` – Karten-App (Sidebar + Leaflet)
- `/ort/$id` – Detailseite eines Ortes (Bilder mit Credits, Beschreibung, Karte, Aktionen: Favorit, zur Route hinzufügen, Navigation öffnen)
- `/favoriten` – Favoriten-Liste (Grid)
- `/route` – geplante Route (Reihenfolge per Drag, Distanzen, Export als GPX/GeoJSON)
- `/ueber` – kurze Info-Seite

Jede Route mit eigener `head()` (Titel, Description, og:title/og:description).

## Features

- **Karte:** Leaflet + OpenStreetMap-Basemap, optional Kartverket-WMTS (Topo, Fuß/Rad/Ski) als Overlay-Toggle. Marker-Clustering (`leaflet.markercluster`). Eigener Standort. Als React-Component, dynamisch importiert (`React.lazy` + `<ClientOnly>`), damit SSR nicht bricht.
- **Suche:** Volltext über Name, Alias, Region, Kategorie, Beschreibung. Umlaut-/Akzent-/ø/å/æ-Normalisierung. Gewichtung wie im Original (Exact → Prefix → Contains → Alias → Region/Kategorie → Beschreibung). Debounced, mit Highlight in Ergebnisliste. Ergebnis synchron mit sichtbaren Markern.
- **Filter:** Kategorie-Chips (Multi-Select), Sekundärfilter (z. B. Camper-Untertypen), "nur im Kartenausschnitt". Aktive Filter als entfernbare Chips.
- **Favoriten & Route:** Persistenz via `localStorage`. Route mit Reihenfolge (dnd-kit), Gesamtdistanz (Luftlinie), Kartendarstellung als Polyline, Export.
- **Detailseite:** Hero-Bild + Credits, Meta (Region, Kategorie, Qualität/Vertrauensscore), Beschreibung, Karte, Buttons "In Route", "Favorit", "Google/Apple Maps öffnen".
- **PWA:** `vite-plugin-pwa` mit Manifest + Service Worker (offline-fähige Basiskarte via Cache-First für Tiles der letzten Sitzung, App-Shell precache).
- **Barrierefreiheit:** Fokus-Stile, ARIA-Labels für Karten-Controls, Tastatur-Navigation in Ergebnisliste, hoher Kontrast.

## Daten

- POI- und Camper-Daten liegen im Repo als große JS-Files (`data/places-data.js`, `data/camper_layers.js`, laut README teils Platzhalter).
- Ich lege im neuen Projekt `src/data/places.json` und `src/data/camper.json` an. **Start-Datensatz:** kleiner kuratierter Seed (~30 bekannte Orte: Trolltunga, Preikestolen, Geirangerfjord, Lofoten-Highlights …), damit die App sofort läuft und getestet werden kann.
- Du kannst danach die echten Datendateien aus dem GitHub-Repo als JSON hier einfügen (oder ich baue einen Import-Helper), sobald die Grundstruktur steht.

## Technischer Rahmen

- Packages: `leaflet`, `react-leaflet`, `leaflet.markercluster`, `@dnd-kit/core`, `@dnd-kit/sortable`, `vite-plugin-pwa`, `zustand` (Filter-/Favoriten-Store).
- Leaflet-CSS wird per `<link>` in `__root.tsx` geladen (nicht `@import` in `styles.css`).
- Karte + alle Leaflet-Imports ausschließlich client-side (`<ClientOnly>` + `React.lazy`), sonst bricht SSR.
- Alles frontend – kein Backend/Cloud nötig.

## Reihenfolge der Umsetzung

1. Design-Tokens (Farben, Fonts) + Basis-Layout mit `SidebarProvider`.
2. Karten-Komponente (leer, Basemap) + Sidebar-Skelett (Suche/Filter/Liste, Tabs).
3. Seed-Daten + Suche + Filter-Logik + Marker mit Clustering.
4. Detailseite (`/ort/$id`) + Favoriten (`/favoriten`).
5. Route-Feature (`/route`) mit dnd-kit + GPX-Export.
6. Mobile Bottom-Sheet + FABs, Feinschliff Responsive.
7. PWA (Manifest + SW) + Meta/SEO pro Route.

## Offene Punkte / Annahmen

- Sprache der UI: **Deutsch** (README ist gemischt DE/NO – bitte kurz bestätigen, falls Norwegisch/Englisch gewünscht).
- Login/Sync über Geräte hinweg: **nicht enthalten** (Favoriten/Route nur lokal). Falls gewünscht, aktiviere ich später Lovable Cloud.
- Echte 1.393 Orte + 1.500 Camper-Punkte kommen in einem Folge-Schritt, sobald das Grundgerüst steht.
