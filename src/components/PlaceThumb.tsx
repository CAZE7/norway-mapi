import { useEffect, useRef, useState } from "react";
import { lookupPlaceImage } from "@/lib/wikipedia";

// Lazy thumbnail: only fetches once the element is near the viewport.
export default function PlaceThumb({
  name,
  aliases,
  color,
  size = 56,
}: {
  name: string;
  aliases?: string[];
  color: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "empty">("idle");
  const [src, setSrc] = useState<string | null>(null);

  const aliasesKey = aliases ? aliases.join(",") : "";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            io.disconnect();
            setState("loading");
            lookupPlaceImage(name, aliases).then((hit) => {
              if (!alive) return;
              if (hit) {
                setSrc(hit.thumbnail);
                setState("ok");
              } else {
                setState("empty");
              }
            });
            break;
          }
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [name, aliasesKey]);

  return (
    <div
      ref={ref}
      className="relative shrink-0 overflow-hidden rounded-md ring-1 ring-black/5"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in oklab, ${color} 45%, black) 100%)`,
      }}
      aria-hidden
    >
      {src && state === "ok" && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
