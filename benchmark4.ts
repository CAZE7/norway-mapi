import { normalize } from "./src/data/places.js";

const normalizeCache = new Map<string, string>();
function cachedNormalize(s: string): string {
  let res = normalizeCache.get(s);
  if (res !== undefined) return res;
  res = normalize(s);
  if (normalizeCache.size < 10000) normalizeCache.set(s, res);
  return res;
}

const start = performance.now();
for (let i = 0; i < 100000; i++) {
  normalize("Norway");
}
const end = performance.now();
console.log(`Without cache string: ${end - start} ms`);

const start2 = performance.now();
for (let i = 0; i < 100000; i++) {
  cachedNormalize("Norway");
}
const end2 = performance.now();
console.log(`With cache string: ${end2 - start2} ms`);
