import { PLACES, normalize } from "./src/data/places.js";

const start = performance.now();
for (let i = 0; i < 10; i++) {
  for (const place of PLACES) {
    normalize(place.name);
    normalize(place.region);
    normalize(place.category);
    normalize(place.description);
  }
}
const end = performance.now();
console.log(`Without cache: ${end - start} ms`);
