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
  const lenA = a.length;
  const lenB = b.length;
  if (!lenA) return lenB;
  if (!lenB) return lenA;
  if (Math.abs(lenA - lenB) > 2) return Math.max(lenA, lenB);

  const row = new Int32Array(lenA + 1);
  for (let j = 0; j <= lenA; j++) row[j] = j;

  for (let i = 1; i <= lenB; i++) {
    let prev = i;
    const charB = b.charCodeAt(i - 1);
    for (let j = 1; j <= lenA; j++) {
      const val = charB === a.charCodeAt(j - 1) ? row[j - 1] : Math.min(row[j - 1], row[j], prev) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[lenA] = prev;
  }
  return row[lenA];
}

export type SearchHit = { place: Place; score: number };

type NormalizedPlace = Place & {
  normName: string;
  normRegion: string;
  normCat: string;
  normDesc: string;
  normAliases: string[];
  normWords: string[];
};

const normCache = new WeakMap<Place, NormalizedPlace>();

function getNormalizedPlace(p: Place): NormalizedPlace {
  let cached = normCache.get(p);
  if (!cached) {
    const normName = normalize(p.name);
    cached = {
      ...p,
      normName,
      normRegion: normalize(p.region),
      normCat: normalize(CATEGORY_LABEL[p.category] ?? p.category),
      normDesc: normalize(p.description),
      normAliases: (p.aliases ?? []).map(normalize),
      normWords: normName.split(/\s+/).filter(Boolean),
    };
    normCache.set(p, cached);
  }
  return cached;
}

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

  const trimmed = query.trim();
  if (!trimmed) {
    return filtered.map((place) => ({ place, score: 0 }));
  }

  const q = normalize(trimmed);
  const hits: SearchHit[] = [];

  const normPlaces = filtered.map(getNormalizedPlace);

  for (const place of normPlaces) {
    let score = 0;
    if (place.normName === q) score = 100;
    else if (place.normName.startsWith(q)) score = 80;
    else if (place.normName.includes(q)) score = 60;
    else if (place.normAliases.some((a) => a.includes(q))) score = 50;
    else if (place.normRegion.includes(q) || place.normCat.includes(q)) score = 30;
    else if (place.normDesc.includes(q)) score = 15;
    if (score > 0) hits.push({ place, score });
  }

  // Levenshtein fuzzy search fallback if 0 exact/substring hits
  if (hits.length === 0 && q.length >= 3) {
    const maxDist = q.length <= 4 ? 1 : 2;
    for (const place of normPlaces) {
      let minD = Infinity;

      for (const word of [place.normName, ...place.normWords, ...place.normAliases]) {
        if (!word || Math.abs(q.length - word.length) > maxDist) continue;
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
