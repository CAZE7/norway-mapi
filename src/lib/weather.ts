// Weather + aurora fetchers.
//
// - Weather: MET Norway "Locationforecast 2.0" — free, no API key,
//   worldwide but best in Scandinavia. Attribution: MET Norway (CC BY 4.0).
//   Docs: https://api.met.no/weatherapi/locationforecast/2.0/documentation
// - Aurora: NOAA SWPC planetary K-index (nowcast + 3-day forecast). Public
//   domain. Docs: https://www.swpc.noaa.gov/products/planetary-k-index
//
// Both endpoints are CORS-enabled and can be fetched directly from the
// browser. We keep results in localStorage for 30 min to be gentle.

export type HourForecast = {
  time: string; // ISO
  tempC: number;
  wind: number; // m/s
  cloud: number; // %
  precip: number; // mm/1h
  symbol: string; // e.g. "partlycloudy_day"
};

export type WeatherResult = {
  updatedAt: string;
  now: HourForecast;
  next24: HourForecast[];
  daily: Array<{ date: string; min: number; max: number; symbol: string; precip: number }>;
};

export type KpEntry = { time: string; kp: number };

export type AuroraResult = {
  currentKp: number;
  maxNext24: number;
  timeline: KpEntry[];
  updatedAt: string;
};

const CACHE_PREFIX = "steder-weather:";
const AURORA_CACHE_KEY = "steder-aurora:v1";
const TTL_MS = 30 * 60 * 1000;

type Cached<T> = { at: number; data: T };

function readCache<T>(key: string): T | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached<T>;
    if (Date.now() - c.at > TTL_MS) return null;
    return c.data;
  } catch {
    return null;
  }
}
function writeCache<T>(key: string, data: T) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    /* quota — ignore */
  }
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherResult> {
  const key = `${CACHE_PREFIX}${lat.toFixed(3)},${lng.toFixed(3)}`;
  const cached = readCache<WeatherResult>(key);
  if (cached) return cached;

  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Wetter-API: ${res.status}`);
  const json = (await res.json()) as {
    properties: {
      meta: { updated_at: string };
      timeseries: Array<{
        time: string;
        data: {
          instant: { details: Record<string, number> };
          next_1_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number } };
          next_6_hours?: { summary: { symbol_code: string }; details?: { precipitation_amount?: number; air_temperature_min?: number; air_temperature_max?: number } };
        };
      }>;
    };
  };

  const series = json.properties.timeseries;
  const toHour = (t: (typeof series)[number]): HourForecast => {
    const d = t.data.instant.details;
    return {
      time: t.time,
      tempC: d.air_temperature ?? 0,
      wind: d.wind_speed ?? 0,
      cloud: d.cloud_area_fraction ?? 0,
      precip: t.data.next_1_hours?.details?.precipitation_amount ?? 0,
      symbol: t.data.next_1_hours?.summary.symbol_code ?? t.data.next_6_hours?.summary.symbol_code ?? "cloudy",
    };
  };

  const now = toHour(series[0]);
  const next24 = series.slice(0, 24).map(toHour);

  // Daily: group by yyyy-mm-dd, 5 days
  const byDay = new Map<string, HourForecast[]>();
  for (const s of series.slice(0, 24 * 6).map(toHour)) {
    const d = s.time.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(s);
  }
  const daily = Array.from(byDay.entries())
    .slice(0, 5)
    .map(([date, hours]) => ({
      date,
      min: Math.min(...hours.map((h) => h.tempC)),
      max: Math.max(...hours.map((h) => h.tempC)),
      precip: hours.reduce((a, h) => a + h.precip, 0),
      symbol: hours[Math.floor(hours.length / 2)].symbol,
    }));

  const data: WeatherResult = { updatedAt: json.properties.meta.updated_at, now, next24, daily };
  writeCache(key, data);
  return data;
}

export async function fetchAurora(): Promise<AuroraResult> {
  const cached = readCache<AuroraResult>(AURORA_CACHE_KEY);
  if (cached) return cached;

  // 3-day Kp forecast (JSON array-of-arrays: [time, kp, "observed|estimated|predicted"])
  const url = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Aurora-API: ${res.status}`);
  const rows = (await res.json()) as Array<[string, string, string]>;
  // First row is header
  const timeline: KpEntry[] = rows.slice(1).map((r) => ({
    time: r[0].replace(" ", "T") + "Z",
    kp: Number(r[1]),
  }));
  const now = Date.now();
  const past = timeline.filter((t) => new Date(t.time).getTime() <= now);
  const future24 = timeline.filter((t) => {
    const dt = new Date(t.time).getTime();
    return dt > now && dt <= now + 24 * 3600 * 1000;
  });
  const currentKp = past.length ? past[past.length - 1].kp : timeline[0].kp;
  const maxNext24 = future24.length ? Math.max(...future24.map((t) => t.kp)) : currentKp;

  const data: AuroraResult = {
    currentKp,
    maxNext24,
    timeline: timeline.slice(0, 24),
    updatedAt: new Date().toISOString(),
  };
  writeCache(AURORA_CACHE_KEY, data);
  return data;
}

// Rough aurora visibility. The auroral oval sits around geomagnetic latitude
// ~67° at Kp 0 and expands ~2° south per Kp point.
export function auroraVisibleAt(lat: number, kp: number): { visible: boolean; needed: number } {
  const needed = lat >= 67 ? 0.5 : (67 - lat) / 2;
  return { visible: kp >= needed, needed };
}

export function symbolEmoji(symbol: string): string {
  const s = symbol.toLowerCase();
  if (s.includes("thunder")) return "⛈️";
  if (s.includes("snow")) return "🌨️";
  if (s.includes("sleet")) return "🌨️";
  if (s.includes("rain")) return "🌧️";
  if (s.includes("fog")) return "🌫️";
  if (s.includes("clearsky")) return "☀️";
  if (s.includes("fair")) return "🌤️";
  if (s.includes("partlycloudy")) return "⛅";
  if (s.includes("cloudy")) return "☁️";
  return "🌡️";
}
