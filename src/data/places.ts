// Browser-safe data module — no leaflet imports here.
import raw from "./places.data.json";

export type Category = string;
export type Tier = "geheimtipp" | "touristisch" | "service";

export const TIER_LABEL: Record<Tier, string> = {
  geheimtipp: "Geheimtipp",
  touristisch: "Touristisch",
  service: "Service & Infrastruktur",
};

export type Place = {
  id: string;
  name: string;
  aliases?: string[];
  region: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  quality?: 1 | 2 | 3;
  tier: Tier;
};


type RawFile = {
  labels: Record<string, string>;
  places: Array<{
    id: string;
    name: string;
    aliases?: string[];
    region: string;
    category: string;
    description: string;
    lat: number;
    lng: number;
    quality?: number;
    tier?: string;
  }>;
};

const data = raw as RawFile;

export const CATEGORY_LABEL: Record<string, string> = data.labels;

export const CUSTOM_STORAGE_KEY = "steder-custom-places";

export function loadCustomPlaces(): Place[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Place[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const BASE_PLACES: Place[] = data.places.map((p) => ({
  ...p,
  quality: (p.quality as 1 | 2 | 3 | undefined) ?? undefined,
  tier: (p.tier as Tier | undefined) ?? "geheimtipp",
}));
export const CUSTOM_PLACES: Place[] = loadCustomPlaces();
export const PLACES: Place[] = [...BASE_PLACES, ...CUSTOM_PLACES];

export function getAllPlaces(customPlaces: Place[] = CUSTOM_PLACES): Place[] {
  return [...BASE_PLACES, ...customPlaces];
}

// Grouped category IDs so the UI can render "Natur" vs. "Camper & Service".
export const CAMPER_CATEGORIES: Category[] = Object.keys(CATEGORY_LABEL).filter((c) =>
  c.startsWith("camper_"),
);
export const NATURE_CATEGORIES: Category[] = Object.keys(CATEGORY_LABEL).filter(
  (c) => !c.startsWith("camper_"),
);

// Norwegian normalization: æ→ae, ø→oe, å→aa, plus umlauts/diacritics
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let i = 1; i <= b.length; i++) {
    let prev = i;
    for (let j = 1; j <= a.length; j++) {
      const val = b[i - 1] === a[j - 1] ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[a.length] = prev;
  }
  return row[a.length];
}

export type SearchHit = { place: Place; score: number };

export function searchPlaces(
  places: Place[],
  query: string,
  categories: Set<Category>,
  tiers?: Set<Tier>,
): SearchHit[] {
  let filtered = categories.size
    ? places.filter((p) => categories.has(p.category))
    : places;
  if (tiers && tiers.size) {
    filtered = filtered.filter((p) => tiers.has(p.tier));
  }
  if (!query.trim()) {
    return filtered.map((place) => ({ place, score: 0 }));
  }

  const q = normalize(query);
  const hits: SearchHit[] = [];
  for (const place of filtered) {
    const name = normalize(place.name);
    const aliases = (place.aliases ?? []).map(normalize);
    const region = normalize(place.region);
    const cat = normalize(CATEGORY_LABEL[place.category] ?? place.category);
    const desc = normalize(place.description);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (aliases.some((a) => a.includes(q))) score = 50;
    else if (region.includes(q) || cat.includes(q)) score = 30;
    else if (desc.includes(q)) score = 15;
    if (score > 0) hits.push({ place, score });
  }

  // Levenshtein fuzzy search fallback if 0 exact/substring hits
  if (hits.length === 0 && q.length >= 3) {
    const maxDist = q.length <= 4 ? 1 : 2;
    for (const place of filtered) {
      const name = normalize(place.name);
      const nameWords = name.split(/\s+/);
      const aliases = (place.aliases ?? []).map(normalize);
      let minD = Infinity;

      for (const word of [name, ...nameWords, ...aliases]) {
        if (!word) continue;
        const d = levenshtein(q, word);
        if (d < minD) minD = d;
      }

      if (minD <= maxDist) {
        hits.push({ place, score: 25 - minD * 5 });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  return hits;
}
