// Deep links to external navigation apps. All URLs are documented public
// schemes and do not require API keys.

export type NavLink = { label: string; href: string; hint?: string };

export function navLinksFor(lat: number, lng: number, name: string): NavLink[] {
  const q = encodeURIComponent(name);
  const ll = `${lat},${lng}`;
  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${ll}&destination_place_id=${q}`,
      hint: "Route in Google Maps",
    },
    {
      label: "Apple Maps",
      href: `https://maps.apple.com/?daddr=${ll}&q=${q}`,
      hint: "Route in Apple Maps (iOS/macOS)",
    },
    {
      label: "Waze",
      href: `https://www.waze.com/ul?ll=${ll}&navigate=yes`,
      hint: "In Waze öffnen",
    },
    {
      label: "Organic Maps",
      href: `https://omaps.app/?ll=${ll}&n=${q}`,
      hint: "Offline-Karten-App",
    },
    {
      label: "OpenStreetMap",
      href: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`,
    },
    {
      label: "geo:",
      href: `geo:${ll}?q=${ll}(${q})`,
      hint: "Standard-Karten-App auf Android",
    },
  ];
}

// Multi-stop Google Maps route URL. First stop = origin, last = destination,
// rest = waypoints (Google allows up to 9 waypoints in the free URL API).
export function googleMapsRoute(stops: Array<{ lat: number; lng: number; name?: string }>): string | null {
  if (stops.length < 2) return null;
  const origin = `${stops[0].lat},${stops[0].lng}`;
  const destination = `${stops[stops.length - 1].lat},${stops[stops.length - 1].lng}`;
  const middle = stops.slice(1, -1).slice(0, 9);
  const waypoints = middle.map((s) => `${s.lat},${s.lng}`).join("|");
  const params = new URLSearchParams({
    api: "1",
    travelmode: "driving",
    origin,
    destination,
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
