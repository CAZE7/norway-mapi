import { PLACES, searchPlaces } from "./src/data/places.ts";
import { useAppStore } from "./src/lib/store.ts";

console.log("==========================================");
console.log("  DIAGNOSTIK-TEST: SUCHE & STATE-PERFORMANCE");
console.log("==========================================\n");

// TEST 1: Performance der Suchfunktion (searchPlaces)
console.log("--- TEST 1: Performance von searchPlaces ---");
const categories = new Set<string>();
const tiers = new Set<"geheimtipp" | "touristisch" | "service">(["geheimtipp", "touristisch"]);

const startSearch = performance.now();
const runs = 100;
for (let i = 0; i < runs; i++) {
  searchPlaces(PLACES, "oslo", categories, tiers);
}
const endSearch = performance.now();
const duration = endSearch - startSearch;
console.log(`✓ 100 Suchen nach 'oslo' über ${PLACES.length} Orte: ${duration.toFixed(2)} ms`);
console.log(`  Durchschnitt pro Suche: ${(duration / runs).toFixed(3)} ms`);

if (duration > 500) {
  console.warn("⚠️ WARNUNG: Suche dauert zu lange (> 500ms für 100 Runs). Main Thread könnte blockieren!");
} else {
  console.log("✓ PASSED: Such-Performance ist im grünen Bereich.\n");
}

// TEST 2: Marker-Set Diffing Simulation (NorwayMap Logik)
console.log("--- TEST 2: Simulation von Marker-Diffing (NorwayMap) ---");
let currentVisibleRef = new Set(PLACES.map((p) => p.id));
const results1 = searchPlaces(PLACES, "", categories, tiers).map((h) => h.place);
const visibleIds1 = new Set(results1.map((p) => p.id));

console.log(`Initial visible places count: ${visibleIds1.size}`);
console.log(`currentVisibleRef count: ${currentVisibleRef.size}`);

// Berechnung der Differenz-Sets wie in NorwayMap useEffect
const toAdd: string[] = [];
const toRemove: string[] = [];

visibleIds1.forEach((id) => {
  if (!currentVisibleRef.has(id)) toAdd.push(id);
});
currentVisibleRef.forEach((id) => {
  if (!visibleIds1.has(id)) toRemove.push(id);
});

console.log(`Differenz bei leerer Suche: toAdd=${toAdd.length}, toRemove=${toRemove.length}`);

// Wenn toRemove=0 und toAdd=0, wurde currentVisibleRef in NorwayMap BISHER NICHT AKTUALISIERT!
if (toRemove.length === 0 && toAdd.length === 0) {
  console.log("⚠️ BEFUND: if (toRemove.length || toAdd.length) war false!");
  console.log("  -> In NorwayMap wurde currentVisibleRef.current dadurch NICHT synchronisiert.");
} else {
  console.log("✓ Differenz erkannt.");
}

// Simuliere Suchbegriff-Wechsel zu "Bergen"
const results2 = searchPlaces(PLACES, "bergen", categories, tiers).map((h) => h.place);
const visibleIds2 = new Set(results2.map((p) => p.id));

const toAdd2: string[] = [];
const toRemove2: string[] = [];
visibleIds2.forEach((id) => {
  if (!currentVisibleRef.has(id)) toAdd2.push(id);
});
currentVisibleRef.forEach((id) => {
  if (!visibleIds2.has(id)) toRemove2.push(id);
});

console.log(`\nDiff bei Suche 'bergen': ${toRemove2.length} Marker zu entfernen, ${toAdd2.length} hinzuzufügen.`);
if (toRemove2.length > 2000) {
  console.log(`⚠️ HINWEIS: ${toRemove2.length} synchrone Marker-Entfernungen im DOM bei einem einzigen Tastendruck!`);
}
console.log("✓ PASSED: Marker-Diff Simulation abgeschlossen.\n");

// TEST 3: State-Koppelung (useAppStore setQuery)
console.log("--- TEST 3: Zustand Store Query Updates ---");
let queryState = useAppStore.getState().query;
console.log(`Initial Store Query: '${queryState}'`);

useAppStore.getState().setQuery("Oslo");
queryState = useAppStore.getState().query;
console.log(`Updated Store Query: '${queryState}'`);

if (queryState === "Oslo") {
  console.log("✓ PASSED: Zustand Store funktioniert korrekt.");
} else {
  console.error("❌ FAILED: Zustand Store Update fehlgeschlagen.");
}

// Reset store
useAppStore.getState().setQuery("");
console.log("\n==========================================");
console.log("  DIAGNOSTIK-TESTS ABGESCHLOSSEN");
console.log("==========================================");
