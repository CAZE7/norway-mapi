import { PLACES, searchPlaces, CATEGORY_LABEL } from "./src/data/places.js";

const categories = new Set<string>();
const tiers = new Set<"geheimtipp" | "touristisch" | "service">();

const start = performance.now();
for (let i = 0; i < 100; i++) {
  searchPlaces(PLACES, "test", categories, tiers);
}
const end = performance.now();
console.log(`Search 100 times: ${end - start} ms`);
