import { useEffect, useState } from "react";
import { ExternalLink, ImageOff } from "lucide-react";
import { lookupPlaceImage, type WikiImage } from "@/lib/wikipedia";

export default function PlaceImage({
  name,
  aliases,
  category,
  color,
}: {
  name: string;
  aliases?: string[];
  category: string;
  color: string;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ok"; image: WikiImage } | { status: "empty" }
  >({ status: "loading" });

  const aliasesKey = aliases ? aliases.join(",") : "";

  useEffect(() => {
    let alive = true;
    setState({ status: "loading" });
    lookupPlaceImage(name, aliases).then((hit) => {
      if (!alive) return;
      setState(hit ? { status: "ok", image: hit } : { status: "empty" });
    });
    return () => {
      alive = false;
    };
  }, [name, aliasesKey]);

  if (state.status === "loading") {
    return (
      <div
        className="relative h-full w-full animate-pulse"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
        }}
        aria-busy="true"
        aria-label="Bild wird gesucht"
      />
    );
  }

  if (state.status === "empty") {
    return (
      <div
        className="relative flex h-full w-full flex-col items-center justify-center gap-2 text-white/80"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 50%, black) 100%)`,
        }}
      >
        <ImageOff className="h-8 w-8" />
        <div className="text-center text-xs">
          <div className="font-medium text-white">Kein freies Bild gefunden</div>
          <div className="text-white/70">{category}</div>
        </div>
      </div>
    );
  }

  const { image } = state;
  return (
    <div className="relative h-full w-full">
      <img
        src={image.original}
        alt={image.title}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0) 100%)",
        }}
      />
      <a
        href={image.pageUrl}
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
        title={`Bildquelle: ${image.lang === "commons" ? "Wikimedia Commons" : "Wikipedia"} (CC-BY-SA / Public Domain)`}
      >
        {image.lang === "commons" ? "Wikimedia Commons" : "Wikipedia"}
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
