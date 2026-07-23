// Free Wikipedia / Wikimedia Commons image lookup.
// Uses local verified image cache from audit_places.py first.
// Uses the public REST summary API & Commons as fallback.

import imageCacheData from "@/data/image-cache.json";

export type WikiImage = {
  thumbnail: string;
  original: string;
  pageUrl: string;
  title: string;
  extract: string;
  lang: "no" | "nb" | "de" | "en" | "commons";
  license?: string;
  source?: string;
  attribution_required?: boolean;
  verified?: boolean;
};

type LocalImageCacheEntry = {
  name?: string;
  has_image?: boolean;
  verified?: boolean;
  verification_score?: number;
  source?: string;
  url?: string;
  thumbnail?: string;
  page?: string;
  license?: string;
  attribution_required?: boolean;
};

const localCacheIndex = new Map<string, LocalImageCacheEntry>();

function getLocalCacheEntry(cand: string): LocalImageCacheEntry | undefined {
  if (localCacheIndex.size === 0) {
    const raw = imageCacheData as Record<string, LocalImageCacheEntry>;
    for (const key in raw) {
      const val = raw[key];
      if (key) localCacheIndex.set(key.toLowerCase(), val);
      if (val.name) localCacheIndex.set(val.name.toLowerCase(), val);
    }
  }
  return localCacheIndex.get(cand.toLowerCase());
}

function checkLocalCache(
  name: string,
  aliases: string[] = [],
): { hit: boolean; value: WikiImage | null } {
  const candidates = [name, ...aliases].filter(Boolean);
  for (const cand of candidates) {
    const entry = getLocalCacheEntry(cand);
    if (entry) {
      if (!entry.has_image || !entry.verified) {
        // verified: false -> do not show image
        return { hit: true, value: null };
      }
      return {
        hit: true,
        value: {
          thumbnail: entry.thumbnail || entry.url || "",
          original: entry.url || entry.thumbnail || "",
          pageUrl: entry.page || "",
          title: entry.name || name,
          extract: "",
          lang: "commons",
          license: entry.license || "",
          source: entry.source || "commons",
          attribution_required: entry.attribution_required ?? true,
          verified: true,
        },
      };
    }
  }
  return { hit: false, value: null };
}

const CACHE_KEY = "wiki-image-cache-v2";
const NEGATIVE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

type CacheEntry = { at: number; value: WikiImage | null };

let memoryCache: Record<string, CacheEntry> | null = null;

function readCache(): Record<string, CacheEntry> {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return {};
  try {
    memoryCache = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
    return memoryCache!;
  } catch {
    memoryCache = {};
    return memoryCache;
  }
}

const MAX_CACHE_ENTRIES = 200;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function writeCache(cache: Record<string, CacheEntry>) {
  memoryCache = cache;
  if (typeof window === "undefined") return;
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!memoryCache) return;
      const keys = Object.keys(memoryCache);
      if (keys.length > MAX_CACHE_ENTRIES) {
        const sortedKeys = keys.sort((a, b) => memoryCache![a].at - memoryCache![b].at);
        const toRemove = sortedKeys.slice(0, keys.length - MAX_CACHE_ENTRIES);
        for (const k of toRemove) delete memoryCache[k];
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    } catch {
      /* quota */
    }
  }, 1000);
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
      attribution_required: true,
      verified: true,
    };
  } catch {
    return null;
  }
}

// Wikimedia Commons search: finds File: pages by keyword, returns the best
// image (thumburl + descriptionurl) via a single generator=search call.
async function fetchCommons(query: string): Promise<WikiImage | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: `${query} filemime:image/jpeg|image/png`,
    gsrnamespace: "6",
    gsrlimit: "1",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "1200",
  });
  const url = `https://commons.wikimedia.org/w/api.php?${params.toString()}`;
  try {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            title?: string;
            imageinfo?: Array<{
              url?: string;
              thumburl?: string;
              descriptionurl?: string;
              mime?: string;
              extmetadata?: {
                ImageDescription?: { value?: string };
                ObjectName?: { value?: string };
              };
            }>;
          }
        >;
      };
    };
    const pages = data.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0];
    const info = first?.imageinfo?.[0];
    if (!info?.url) return null;
    if (info.mime && !info.mime.startsWith("image/")) return null;
    const rawDesc = info.extmetadata?.ImageDescription?.value || "";
    // Strip HTML tags from the Commons description.
    const extract = rawDesc.replace(/<[^>]+>/g, "").trim();
    const title = (first.title || query).replace(/^File:/i, "");
    return {
      thumbnail: info.thumburl || info.url,
      original: info.url,
      pageUrl:
        info.descriptionurl ||
        `https://commons.wikimedia.org/wiki/${encodeURIComponent(first.title || "")}`,
      title,
      extract,
      lang: "commons",
      source: "commons_search",
      attribution_required: true,
      verified: true,
    };
  } catch {
    return null;
  }
}

export async function lookupPlaceImage(
  name: string,
  aliases: string[] = [],
): Promise<WikiImage | null> {
  // Phase 0: Check local verified cache from audit
  const local = checkLocalCache(name, aliases);
  if (local.hit) {
    return local.value;
  }

  const cache = readCache();
  const cacheKey = name.toLowerCase();
  const cached = cache[cacheKey];
  if (cached) {
    if (cached.value) return cached.value;
    if (Date.now() - cached.at < NEGATIVE_TTL_MS) return null;
  }

  const candidates = [name, ...aliases].filter(Boolean);
  const langs: Array<"no" | "nb" | "de" | "en"> = ["no", "nb", "de", "en"];

  // Phase 1: Wikipedia summary — richer text, tends to hit named landmarks.
  for (const candidate of candidates) {
    const hits = await Promise.all(langs.map((lang) => fetchLang(lang, candidate)));
    const hit = hits.find((h) => h !== null) ?? null;
    if (hit) {
      cache[cacheKey] = { at: Date.now(), value: hit };
      writeCache(cache);
      return hit;
    }
  }

  // Phase 2: Wikimedia Commons — catches campsites, viewpoints, minor spots
  // that don't have their own Wikipedia article but do have photos on Commons.
  for (const candidate of candidates) {
    const hit = await fetchCommons(candidate);
    if (hit) {
      cache[cacheKey] = { at: Date.now(), value: hit };
      writeCache(cache);
      return hit;
    }
  }

  cache[cacheKey] = { at: Date.now(), value: null };
  writeCache(cache);
  return null;
}
