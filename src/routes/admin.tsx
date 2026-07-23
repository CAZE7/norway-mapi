import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LABEL,
  CUSTOM_PLACES,
  CUSTOM_STORAGE_KEY,
  PLACES,
  TIER_LABEL,
  type Place,
  type Tier,
} from "@/data/places";

import { useAppStore } from "@/lib/store";

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
const PIN_STORAGE_KEY = "steder-admin-pin";
const SESSION_TOKEN_KEY = "steder-admin-token";

// We use a fixed salt to deter basic rainbow table attacks while allowing client-side verification
const PIN_SALT = "steder-norge-v1-salt-";

async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(PIN_SALT + pin);
  // crypto.subtle is only available in secure contexts (HTTPS/localhost).
  // Fallback to a simpler, synchronous hash if unavailable to prevent crashing.
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  } else {
    // Basic fallback for non-secure contexts (HTTP)
    let hash = 0;
    const str = PIN_SALT + pin;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, "0");
  }
}

function getStoredPin(): string {
  if (typeof window === "undefined") return "1234";
  return window.localStorage.getItem(PIN_STORAGE_KEY) || "1234";
}

function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function AdminPage() {
  const categories = useMemo(() => Object.keys(CATEGORY_LABEL).sort(), []);
  const custom = useAppStore((s) => s.customPlaces);
  const addCustomPlace = useAppStore((s) => s.addCustomPlace);
  const removeCustomPlace = useAppStore((s) => s.removeCustomPlace);
  const setCustomPlaces = useAppStore((s) => s.setCustomPlaces);

  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;

    // In a completely static site without a backend, a spoof-proof client-side session persistence
    // is impossible. An attacker can always extract the hashed PIN from localStorage and
    // inject it into sessionStorage. We use the hashed PIN in sessionStorage to persist the unlocked state
    // across refreshes for convenience, accepting the inherent limitations of client-side-only auth.
    const sessionHash = window.sessionStorage.getItem(SESSION_TOKEN_KEY);
    const storedPin = getStoredPin();
    if (sessionHash && sessionHash === storedPin && sessionHash.length === 64) {
      return true;
    }

    if (sessionHash && sessionHash === storedPin && sessionHash.length < 64) {
      return true;
    }
    return false;
  });
  const [pinInput, setPinInput] = useState("");
  const [newPinInput, setNewPinInput] = useState("");
  const [showChangePin, setShowChangePin] = useState(false);

  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState<string>(categories[0] ?? "viewpoint");
  const [tier, setTier] = useState<Tier>("geheimtipp");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    const correctPin = getStoredPin();
    const input = pinInput.trim();

    let isMatch = false;

    // Migration logic for old plaintext PINs (including the default '1234')
    if (correctPin.length < 64) {
      if (input === correctPin) {
        isMatch = true;
        if (typeof window !== "undefined") {
          const newHash = await hashPin(input);
          window.localStorage.setItem(PIN_STORAGE_KEY, newHash);
        }
      }
    } else {
      // Hashed PIN comparison
      const hashedInput = await hashPin(input);
      if (hashedInput === correctPin) {
        isMatch = true;
      }
    }

    if (isMatch) {
      if (typeof window !== "undefined") {
        const hashToStore = correctPin.length < 64 ? await hashPin(input) : correctPin;
        window.sessionStorage.setItem(SESSION_TOKEN_KEY, hashToStore);
      }
      setUnlocked(true);
      toast.success("Admin-Zugang freigeschaltet");
    } else {
      toast.error("Falscher PIN / Passwort", { description: "Bitte versuche es erneut." });
      setPinInput("");
    }
  }

  function handleLock() {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
    setUnlocked(false);
    toast.info("Admin-Sitzung beendet");
  }

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    const input = newPinInput.trim();
    if (!input || input.length < 4) {
      return toast.error("PIN muss mindestens 4 Zeichen lang sein");
    }
    if (typeof window !== "undefined") {
      const hashedPin = await hashPin(input);
      window.localStorage.setItem(PIN_STORAGE_KEY, hashedPin);
    }
    toast.success("Neuer Admin-PIN gespeichert");
    setNewPinInput("");
    setShowChangePin(false);
  }

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
    if (!Number.isFinite(latN) || !Number.isFinite(lngN))
      return toast.error("Ungültige Koordinaten");
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
    addCustomPlace(p);
    toast.success("Ort gespeichert");
    reset();
  }

  function remove(id: string) {
    removeCustomPlace(id);
    toast.success("Ort entfernt");
  }

  function importJson(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Place[];
        if (!Array.isArray(parsed)) throw new Error("Kein Array");
        const merged = [...custom];
        let importedCount = 0;
        for (const p of parsed) {
          if (
            !p.id ||
            !p.name ||
            typeof p.lat !== "number" ||
            typeof p.lng !== "number" ||
            !p.region ||
            !p.category ||
            !p.tier
          )
            continue;
          if (!merged.find((x) => x.id === p.id)) {
            merged.push(p);
            importedCount++;
          }
        }
        setCustomPlaces(merged);
        toast.success(`${importedCount} Orte importiert`);
      } catch (err) {
        toast.error("Import fehlgeschlagen – ungültiges JSON");
      }
    });
    e.target.value = "";
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border/50 bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> Zurück zur Karte
            </Link>
            <div className="font-display text-sm font-semibold">Admin – Geschützter Bereich</div>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-border/80 bg-card p-6 shadow-xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Admin-Zugang geschützt</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gib den PIN ein, um Orte verwalten und exportieren zu können.
                <br />
                (Standard-PIN: <code className="font-mono font-semibold text-foreground">1234</code>
                )
              </p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div className="space-y-2">
                <Label htmlFor="pin">PIN / Passwort</Label>
                <Input
                  id="pin"
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN eingeben…"
                  autoFocus
                  className="text-center text-lg tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full">
                Freischalten
              </Button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-border/50 sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück zur Karte
          </Link>
          <div className="font-display text-sm font-semibold">Admin – Orte verwalten</div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChangePin((v) => !v)}
              className="text-xs"
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> PIN ändern
            </Button>
            <Button variant="outline" size="sm" onClick={handleLock} className="text-xs">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sperren
            </Button>
          </div>
        </div>
        {showChangePin && (
          <div className="border-t border-border/60 bg-muted/40 p-3">
            <form onSubmit={handleChangePin} className="mx-auto flex max-w-5xl items-center gap-2">
              <Input
                type="password"
                placeholder="Neuer PIN (min. 4 Zeichen)…"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                className="h-8 max-w-xs text-xs"
              />
              <Button type="submit" size="sm" className="h-8 text-xs">
                Speichern
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowChangePin(false)}
              >
                Abbrechen
              </Button>
            </form>
          </div>
        )}
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
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Skjeggedal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="z. B. Vestland"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABEL[c] ?? c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIER_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="lat">Breite (lat) *</Label>
                <Input
                  id="lat"
                  inputMode="decimal"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="60.1234"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lng">Länge (lng) *</Label>
                <Input
                  id="lng"
                  inputMode="decimal"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="6.7890"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desc">Beschreibung</Label>
              <Textarea
                id="desc"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Kurze, individuelle Beschreibung des Ortes…"
              />
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
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={importJson}
                />
                <span className="border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-9 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium">
                  <Upload className="mr-2 h-4 w-4" /> Importieren
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display mb-3 text-lg font-semibold">
              Meine Orte{" "}
              <span className="text-muted-foreground text-sm font-normal">({custom.length})</span>
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
                        {p.region} · {CATEGORY_LABEL[p.category] ?? p.category} · {p.lat.toFixed(3)}
                        , {p.lng.toFixed(3)}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(p.id)}
                      aria-label="Entfernen"
                    >
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
