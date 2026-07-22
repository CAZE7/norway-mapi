// Multi-stop route helpers: haversine distance, nearest-neighbor + 2-opt
// optimization, and total distance / time estimation.

export type Stop = { id: string; lat: number; lng: number };

const R = 6371; // km

export function haversine(a: Stop, b: Stop): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function totalDistance(order: Stop[]): number {
  let sum = 0;
  for (let i = 1; i < order.length; i++) sum += haversine(order[i - 1], order[i]);
  return sum;
}

// Nearest neighbor starting from index 0, then 2-opt refinement.
export function optimizeOrder(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return stops.slice();
  // Nearest neighbor from first stop (kept as anchor).
  const remaining = stops.slice(1);
  const path: Stop[] = [stops[0]];
  while (remaining.length) {
    const last = path[path.length - 1];
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last, remaining[i]);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    path.push(remaining.splice(bestIdx, 1)[0]);
  }
  return twoOpt(path);
}

function twoOpt(route: Stop[]): Stop[] {
  const n = route.length;
  if (n < 4) return route;
  let best = route.slice();

  const matrix: number[][] = Array.from({ length: n }, () => new Array<number>(n));
  const updateMatrix = () => {
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const d = haversine(best[i], best[j]);
        matrix[i][j] = d;
        matrix[j][i] = d;
      }
    }
  };
  updateMatrix();

  let improved = true;
  let guard = 0;
  while (improved && guard < 40) {
    improved = false;
    guard++;
    for (let i = 1; i < n - 2; i++) {
      for (let k = i + 1; k < n - 1; k++) {
        const delta =
          matrix[i - 1][k] + matrix[i][k + 1] - matrix[i - 1][i] - matrix[k][k + 1];
        if (delta < -1e-9) {
          const sub = best.slice(i, k + 1).reverse();
          best.splice(i, sub.length, ...sub);
          updateMatrix();
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  return best;
}

// Rough travel-time estimate. Norway roads: assume 65 km/h average car speed
// (mix of highway + fjord-slow sections), walking 4.8 km/h.
// Distance is straight-line haversine, so add a 1.3 routing factor.
const ROUTING_FACTOR = 1.3;
const CAR_KMH = 65;
const WALK_KMH = 4.8;

export function estimateTimes(distanceKm: number) {
  const road = distanceKm * ROUTING_FACTOR;
  return {
    roadKm: road,
    driveMinutes: (road / CAR_KMH) * 60,
    walkMinutes: (road / WALK_KMH) * 60,
  };
}

export function formatKm(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString("de-DE")} km`;
}

export function formatDuration(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "–";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h < 24) return m ? `${h} h ${m} min` : `${h} h`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${d} T ${hh} h` : `${d} T`;
}
