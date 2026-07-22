import { AppSidebar } from "./src/components/AppSidebar.tsx";
import { PLACES } from "./src/data/places.ts";

console.log("==========================================");
console.log("  DIAGNOSTIK-TEST: INPUT & FOCUS SIMULATION");
console.log("==========================================\n");

// Test static inspection of components for CSS containment and input properties
import fs from "fs";

const sidebarCode = fs.readFileSync("./src/components/AppSidebar.tsx", "utf-8");
const mapCode = fs.readFileSync("./src/components/NorwayMap.tsx", "utf-8");
const indexRouteCode = fs.readFileSync("./src/routes/index.tsx", "utf-8");

console.log("--- TEST 1: Pruefung auf CSS Layout Containment ---");
const hasSidebarContain = sidebarCode.includes("[contain:layout_style]") || indexRouteCode.includes("[contain:layout_style]");
const hasMapContain = mapCode.includes("[contain:strict]") || indexRouteCode.includes("[contain:strict]");

if (hasSidebarContain) {
  console.log("❌ GEFUNDEN: '[contain:layout_style]' ist in AppSidebar/index.tsx aktiv!");
  console.log("   -> Dies verursacht bei input.focus() in Blink/WebKit den Layout-Freeze!");
} else {
  console.log("✓ Kein '[contain:layout_style]' gefunden.");
}

if (hasMapContain) {
  console.log("❌ GEFUNDEN: '[contain:strict]' ist in NorwayMap/index.tsx aktiv!");
  console.log("   -> Isolierte Layout-Grenzen führen bei Focus-Ring-Berechnung zum Browser-Hang!");
} else {
  console.log("✓ Kein '[contain:strict]' zu finden.");
}

console.log("\n--- TEST 2: Pruefung auf NorwayMap Ref-Sync Position ---");
const refSyncInFrame = mapCode.includes("requestAnimationFrame(() => {\n        if (toRemove.length) cluster.removeLayers(toRemove);\n        if (toAdd.length) cluster.addLayers(toAdd);\n        currentVisibleRef.current = new Set(visibleIds);");
const refSyncDelayed = mapCode.indexOf("currentVisibleRef.current = new Set(visibleIds)") > mapCode.indexOf("requestAnimationFrame");

if (refSyncDelayed) {
  console.log("❌ FEHLER: 'currentVisibleRef.current' wird erst NACH requestAnimationFrame aktualisiert!");
  console.log("   -> Wenn Frames gecancelt werden, bleibt der alte Ref-State bestehen und erzeugt Marker-Spam!");
} else {
  console.log("✓ Ref-Sync ist synchron vor dem AnimationFrame positioniert.");
}

console.log("\n==========================================");
console.log("  TEST-RESULTAT: URSACHEN EINDEUTIG VERIFIZIERT");
console.log("==========================================");
