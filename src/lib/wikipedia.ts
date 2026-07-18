// Free Wikipedia / Wikimedia Commons image lookup.
// Uses the public REST summary API — no auth, CORS-enabled.
// Returned thumbnails are hosted on Wikimedia and licensed under CC-BY-SA
// or public domain; the API responds with `originalimage` + a page URL
// which we surface as attribution.

export type WikiImage = {
  thumbnail: string;
  original: string;
  pageUrl: string;
  title: string;
  extract: string;
  lang: "no" | "nb" | "de" | "en";
};

const CACHE_KEY = "wiki-image-cache-v1";
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

type CacheEntry = { at: number; value: WikiImage | null };

function readCache(): Record<string, CacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: Record<string, CacheEntry>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* quota */
  }
}

async function fetchLang(
  lang: "no" | "nb" | "de" | "en",
  title: string,
): Promise<WikiImage | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title,
  )}?redirect=true`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      type?: string;
      title?: string;
      extract?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    if (data.type === "disambiguation") return null;
    const thumb = data.thumbnail?.source;
    if (!thumb) return null;
    return {
      thumbnail: thumb,
      original: data.originalimage?.source || thumb,
      pageUrl:
        data.content_urls?.desktop?.page ||
        `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      title: data.title || title,
      extract: data.extract || "",
      lang,
    };
  } catch {
    return null;
  }
}

export async function lookupPlaceImage(
  name: string,
  aliases: string[] = [],
): Promise<WikiImage | null> {
  const cache = readCache();
  const cacheKey = name.toLowerCase();
  const cached = cache[cacheKey];
  if (cached) {
    if (cached.value) return cached.value;
    if (Date.now() - cached.at < NEGATIVE_TTL_MS) return null;
  }

  const candidates = [name, ...aliases].filter(Boolean);
  const langs: Array<"no" | "nb" | "de" | "en"> = ["no", "nb", "de", "en"];

  for (const candidate of candidates) {
    for (const lang of langs) {
      const hit = await fetchLang(lang, candidate);
      if (hit) {
        cache[cacheKey] = { at: Date.now(), value: hit };
        writeCache(cache);
        return hit;
      }
    }
  }

  cache[cacheKey] = { at: Date.now(), value: null };
  writeCache(cache);
  return null;
}
