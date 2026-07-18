import { useEffect, useRef } from "react";
import L from "leaflet";
import { colorFor } from "@/lib/category-color";

function pinIcon(color: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='48' viewBox='0 0 30 40'>
    <path d='M15 0C6.7 0 0 6.7 0 15c0 11 15 25 15 25s15-14 15-25C30 6.7 23.3 0 15 0z' fill='${color}' stroke='white' stroke-width='2'/>
    <circle cx='15' cy='15' r='5' fill='white'/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [36, 48],
    iconAnchor: [18, 48],
  });
}

export default function PlaceMiniMap({
  lat,
  lng,
  category,
  name,
}: {
  lat: number;
  lng: number;
  category: string;
  name: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, {
      center: [lat, lng],
      zoom: 11,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 18,
    }).addTo(map);
    L.marker([lat, lng], { icon: pinIcon(colorFor(category)), title: name }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng, category, name]);

  return <div ref={ref} className="h-full w-full" aria-label={`Karte für ${name}`} />;
}
