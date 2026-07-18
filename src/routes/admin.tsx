import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Download, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CATEGORY_LABEL,
  CUSTOM_PLACES,
  CUSTOM_STORAGE_KEY,
  PLACES,
  TIER_LABEL,
  type Place,
  type Tier,
} from "@/data/places";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin – Orte verwalten | Steder i Norge" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const TIERS: Tier[] = ["geheimtipp", "touristisch", "service"];

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function saveCustom(list: Place[]) {
  window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(list));
}

function AdminPage() {
  const categories = useMemo(() => Object.keys(CATEGORY_LABEL).sort(), []);
  const [custom, setCustom] = useState<Place[]>(() => [...CUSTOM_PLACES]);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<string>(categories[0] ?? "viewpoint");
  const [tier, setTier] = useState<Tier>("geheimtipp");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setName("");
    setRegion("");
    setLat("");
    setLng("");
    setDescription("");
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const latN = Number(lat.replace(",", "."));
    const lngN = Number(lng.replace(",", "."));
    if (!name.trim() || !region.trim()) return toast.error("Name und Region sind Pflicht");
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return toast.error("Ungültige Koordinaten");
    if (latN < 57 || latN > 72 || lngN < 3 || lngN > 32) {
      toast.warning("Koordinaten liegen außerhalb Norwegens – trotzdem gespeichert");
    }
    const id = `custom-${Date.now().toString(36)}`;
    const p: Place = {
      id,
      name: name.trim(),
      region: region.trim(),
      category,
      tier,
      lat: latN,
      lng: lngN,
      description: description.trim() || `${name.trim()} – ${region.trim()}.`,
    };
    const next = [...custom, p];
    setCustom(next);
    saveCustom(next);
    toast.success("Ort hinzugefügt – Seite lädt neu…");
    reset();
    setTimeout(() => window.location.reload(), 700);
  }

  function remove(id: string) {
    const next = custom.filter((p) => p.id !== id);
    setCustom(next);
    saveCustom(next);
    toast.success("Ort entfernt – Seite lädt neu…");
    setTimeout(() => window.location.reload(), 500);
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Place[];
        if (!Array.isArray(parsed)) throw new Error("Kein Array");
        const merged = [...custom];
        for (const p of parsed) {
          if (!p.id || !p.name || typeof p.lat !== "number") continue;
          if (!merged.find((x) => x.id === p.id)) merged.push(p);
        }
        setCustom(merged);
        saveCustom(merged);
        toast.success(`${parsed.length} Orte importiert – lädt neu…`);
        setTimeout(() => window.location.reload(), 700);
      } catch (err) {
        toast.error("Import fehlgeschlagen – ungültiges JSON");
      }
    });
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-border/50 sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="h-4 w-4" /> Zurück zur Karte
          </Link>
          <div className="font-display text-sm font-semibold">Admin – Orte verwalten</div>
        </div>
      </div>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-8 lg:grid-cols-2">
        <section>
          <h1 className="font-display mb-1 text-2xl font-bold">Neuen Ort hinzufügen</h1>
          <p className="text-muted-foreground mb-4 text-sm">
            Wird lokal in deinem Browser gespeichert und erscheint sofort auf Karte & in der Suche.
          </p>
          <form onSubmit={add} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Skjeggedal" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region *</Label>
              <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="z. B. Vestland" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>{TIER_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="lat">Breite (lat) *</Label>
                <Input id="lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="60.1234" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Länge (lng) *</Label>
                <Input id="lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="6.7890" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Beschreibung</Label>
              <Textarea id="desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurze, individuelle Beschreibung des Ortes…" />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Ort speichern
            </Button>
          </form>
        </section>

        <section className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display mb-2 text-lg font-semibold">Export</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Aktuell {PLACES.length} Orte gesamt · {custom.length} eigene.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => download("steder-alle.json", PLACES)}>
                <Download className="mr-2 h-4 w-4" /> Alle Orte
              </Button>
              <Button
                variant="outline"
                onClick={() => download("steder-eigene.json", custom)}
                disabled={custom.length === 0}
              >
                <Download className="mr-2 h-4 w-4" /> Nur eigene
              </Button>
              <label className="inline-flex">
                <input type="file" accept="application/json" className="hidden" onChange={importJson} />
                <span className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium">
                  <Upload className="mr-2 h-4 w-4" /> Importieren
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display mb-3 text-lg font-semibold">
              Meine Orte <span className="text-muted-foreground text-sm font-normal">({custom.length})</span>
            </h2>
            {custom.length === 0 ? (
              <p className="text-muted-foreground text-sm">Noch keine eigenen Orte.</p>
            ) : (
              <ul className="divide-border/60 divide-y">
                {custom.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{p.name}</div>
                      <div className="text-muted-foreground truncate text-xs">
                        {p.region} · {CATEGORY_LABEL[p.category] ?? p.category} · {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove(p.id)} aria-label="Entfernen">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
