import { PLACES, CATEGORY_LABEL, normalize } from "./src/data/places.js";

const categories = new Set<string>();
const tiers = new Set<"geheimtipp" | "touristisch" | "service">();

const normalizeCache = new Map<string, string>();
function cachedNormalize(s: string): string {
  let res = normalizeCache.get(s);
  if (res !== undefined) return res;
  res = normalize(s);
  normalizeCache.set(s, res);
  return res;
}

const start = performance.now();
for (let i = 0; i < 100; i++) {
  const q = cachedNormalize("test");
  for (const place of PLACES) {
    const name = cachedNormalize(place.name);
    const aliases = (place.aliases ?? []).map(cachedNormalize);
    const region = cachedNormalize(place.region);
    const cat = cachedNormalize(CATEGORY_LABEL[place.category] ?? place.category);
    const desc = cachedNormalize(place.description);
  }
}
const end = performance.now();
console.log(`With cache: ${end - start} ms`);
