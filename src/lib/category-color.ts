export const CATEGORY_COLOR: Record<string, string> = {
  // Natur
  fjord: "#2d8a9e",
  waterfall: "#3b82f6",
  lake: "#0ea5e9",
  beach: "#eab308",
  mountain_hike: "#2d5a3d",
  geology: "#78716c",
  lighthouse: "#f97316",
  viewpoint: "#f59e0b",
  glacier: "#93c5fd",
  wilderness: "#166534",
  nature_place: "#4d7c0f",
  scenic_road: "#a3742c",
  spring: "#22d3ee",
  dam: "#64748b",
  picnic: "#84cc16",
  // Kultur & Versorgung
  bakery: "#c2410c",
  cafe: "#b45309",
  culture: "#a855f7",
  shop_market: "#ef4444",
  // Camper
  camper_camping: "#a0522d",
  camper_motorhome: "#8b4513",
  camper_toilets: "#6b7280",
  camper_water: "#0891b2",
  camper_ferry: "#1e40af",
  camper_dump: "#4b5563",
};

export function colorFor(cat: string): string {
  return CATEGORY_COLOR[cat] ?? (cat.startsWith("camper_") ? "#a0522d" : "#2d5a3d");
}

// Haversine distance in km
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
