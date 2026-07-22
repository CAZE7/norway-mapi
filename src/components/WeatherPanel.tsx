import { useEffect, useState } from "react";
import { AlertCircle, CloudRain, Droplets, Sparkles, Wind } from "lucide-react";
import {
  auroraVisibleAt,
  fetchAurora,
  fetchWeather,
  symbolEmoji,
  type AuroraResult,
  type WeatherResult,
} from "@/lib/weather";

type Props = { lat: number; lng: number };

export default function WeatherPanel({ lat, lng }: Props) {
  const [weather, setWeather] = useState<WeatherResult | null>(null);
  const [aurora, setAurora] = useState<AuroraResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auroraError, setAuroraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAuroraError(null);
    Promise.allSettled([fetchWeather(lat, lng), fetchAurora()]).then((res) => {
      if (cancelled) return;
      const [w, a] = res;
      if (w.status === "fulfilled") setWeather(w.value);
      if (a.status === "fulfilled") setAurora(a.value);
      if (a.status === "rejected") {
        setAuroraError("Aurora-Daten derzeit nicht erreichbar.");
      }
      if (w.status === "rejected" && a.status === "rejected") {
        setError("Wetter- und Aurora-Daten sind gerade nicht erreichbar.");
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (loading) {
    return (
      <div className="bg-card border-border rounded-xl border p-5">
        <div className="text-muted-foreground text-sm">Wetter & Nordlicht werden geladen…</div>
      </div>
    );
  }

  if (error && !weather && !aurora) {
    return (
      <div className="bg-card border-border rounded-xl border p-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      </div>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {weather && (
        <div className="bg-card border-border rounded-xl border p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Wetter</h2>
            <div className="text-muted-foreground text-[11px]">MET Norway · aktuell</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-5xl leading-none">{symbolEmoji(weather.now.symbol)}</div>
            <div>
              <div className="font-display text-4xl font-bold">
                {Math.round(weather.now.tempC)}°C
              </div>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1">
                  <Wind className="h-3 w-3" /> {weather.now.wind.toFixed(1)} m/s
                </span>
                <span className="inline-flex items-center gap-1">
                  <Droplets className="h-3 w-3" /> {weather.now.cloud.toFixed(0)}%
                </span>
                <span className="inline-flex items-center gap-1">
                  <CloudRain className="h-3 w-3" /> {weather.now.precip.toFixed(1)} mm
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-5 gap-1.5">
            {weather.daily.map((d) => (
              <div
                key={d.date}
                className="bg-muted/40 flex flex-col items-center justify-between rounded-md px-1 py-2 text-center text-xs"
              >
                <div className="text-muted-foreground text-[10px] font-medium">
                  {new Date(d.date).toLocaleDateString("de-DE", { weekday: "short" })}
                </div>
                <div className="my-1 text-base sm:text-lg leading-none">
                  {symbolEmoji(d.symbol)}
                </div>
                <div className="flex flex-col items-center text-[11px] font-mono tabular-nums leading-tight">
                  <span className="font-semibold text-foreground">{Math.round(d.max)}°</span>
                  <span className="text-muted-foreground text-[10px]">{Math.round(d.min)}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aurora ? (
        <AuroraCard aurora={aurora} lat={lat} />
      ) : auroraError ? (
        <div className="bg-card border-border rounded-xl border p-5">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500" /> {auroraError}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AuroraCard({ aurora, lat }: { aurora: AuroraResult; lat: number }) {
  const nowVis = auroraVisibleAt(lat, aurora.currentKp);
  const peakVis = auroraVisibleAt(lat, aurora.maxNext24);
  const status =
    aurora.maxNext24 >= nowVis.needed
      ? aurora.currentKp >= nowVis.needed
        ? { label: "Sichtbar", tone: "good" as const }
        : { label: "Möglich in 24 h", tone: "medium" as const }
      : { label: "Unwahrscheinlich", tone: "low" as const };

  const toneClass =
    status.tone === "good"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : status.tone === "medium"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <div className="bg-card border-border rounded-xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-emerald-500" /> Nordlicht
        </h2>
        <div className="text-muted-foreground text-[11px]">NOAA SWPC</div>
      </div>
      <div className="flex items-center gap-4">
        <div>
          <div className="font-display text-4xl font-bold tabular-nums">
            Kp {aurora.currentKp.toFixed(1)}
          </div>
          <div className="text-muted-foreground text-xs">
            Max 24 h: Kp {aurora.maxNext24.toFixed(1)}
          </div>
        </div>
        <div className={`ml-auto rounded-full px-3 py-1 text-xs font-medium ${toneClass}`}>
          {status.label}
        </div>
      </div>
      <div className="text-muted-foreground mt-3 text-xs leading-relaxed">
        Für diesen Ort (Breite {lat.toFixed(1)}°) ist ein Kp-Wert von mindestens{" "}
        <span className="text-foreground font-semibold">{nowVis.needed.toFixed(1)}</span> nötig,
        damit das Polarlicht auf Horizonthöhe erscheint. Aktuell:{" "}
        {nowVis.visible ? "erreicht" : "noch nicht erreicht"}. Peak in 24 h:{" "}
        {peakVis.visible ? "erreicht" : "wahrscheinlich nicht"}.
      </div>
      {aurora.timeline.length > 0 && (
        <div className="mt-3 flex h-10 items-end gap-0.5">
          {aurora.timeline.map((t) => {
            const h = Math.max(6, (t.kp / 9) * 40);
            const color =
              t.kp >= 5 ? "hsl(155 60% 40%)" : t.kp >= 3 ? "hsl(45 90% 55%)" : "hsl(220 15% 65%)";
            return (
              <div
                key={t.time}
                title={`${new Date(t.time).toLocaleString("de-DE", { hour: "2-digit", day: "2-digit", month: "2-digit" })} · Kp ${t.kp.toFixed(1)}`}
                className="flex-1 rounded-t"
                style={{ height: `${h}px`, backgroundColor: color }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
