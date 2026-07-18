// Browser-safe data module — no leaflet imports here.
export type Category =
  | "fjord"
  | "berg"
  | "wasserfall"
  | "strand"
  | "stadt"
  | "insel"
  | "wanderung"
  | "aussicht"
  | "camper";

export type Place = {
  id: string;
  name: string;
  aliases?: string[];
  region: string;
  category: Category;
  description: string;
  lat: number;
  lng: number;
  quality?: 1 | 2 | 3;
};

export const CATEGORY_LABEL: Record<Category, string> = {
  fjord: "Fjord",
  berg: "Berg",
  wasserfall: "Wasserfall",
  strand: "Strand",
  stadt: "Stadt",
  insel: "Insel",
  wanderung: "Wanderung",
  aussicht: "Aussicht",
  camper: "Camper",
};

export const PLACES: Place[] = [
  { id: "trolltunga", name: "Trolltunga", region: "Vestland", category: "wanderung", lat: 60.1241, lng: 6.7402, description: "Ikonische Felszunge über dem Ringedalsvatnet, ~28 km Wanderung.", quality: 3 },
  { id: "preikestolen", name: "Preikestolen", aliases: ["Pulpit Rock", "Predigtstuhl"], region: "Rogaland", category: "wanderung", lat: 58.9864, lng: 6.1904, description: "604 m hohe Felskanzel über dem Lysefjord.", quality: 3 },
  { id: "kjerag", name: "Kjeragbolten", region: "Rogaland", category: "aussicht", lat: 59.0342, lng: 6.5920, description: "Zwischen Felsen eingeklemmter Findling über 1000 m Abgrund.", quality: 3 },
  { id: "geirangerfjord", name: "Geirangerfjord", region: "Møre og Romsdal", category: "fjord", lat: 62.1010, lng: 7.0900, description: "UNESCO-Welterbe mit Sieben-Schwestern-Wasserfall.", quality: 3 },
  { id: "naeroyfjord", name: "Nærøyfjord", region: "Vestland", category: "fjord", lat: 60.8710, lng: 6.9250, description: "Schmaler Seitenarm des Sognefjords, UNESCO-Welterbe.", quality: 3 },
  { id: "sognefjord", name: "Sognefjord", region: "Vestland", category: "fjord", lat: 61.1400, lng: 6.5000, description: "Längster Fjord Norwegens.", quality: 2 },
  { id: "lofoten-reine", name: "Reine", aliases: ["Reinefjord"], region: "Nordland", category: "insel", lat: 67.9328, lng: 13.0870, description: "Fischerdorf mit roten Rorbuer vor Bergkulisse.", quality: 3 },
  { id: "lofoten-henningsvaer", name: "Henningsvær", region: "Nordland", category: "insel", lat: 68.1560, lng: 14.2020, description: "Kleine Inselgruppe mit legendärem Fußballfeld am Meer.", quality: 2 },
  { id: "lofoten-uttakleiv", name: "Uttakleiv", aliases: ["Uttakleivstranda"], region: "Nordland", category: "strand", lat: 68.2400, lng: 13.5300, description: "Wilder Strand mit gerundeten Felsen und Nordlicht-Blick.", quality: 2 },
  { id: "haukland", name: "Haukland Strand", region: "Nordland", category: "strand", lat: 68.2237, lng: 13.5580, description: "Weißer Sandstrand auf Vestvågøy.", quality: 2 },
  { id: "atlanterhavsvegen", name: "Atlantikstraße", aliases: ["Atlanterhavsvegen"], region: "Møre og Romsdal", category: "aussicht", lat: 63.0128, lng: 7.3540, description: "Kurvenreiche Küstenstraße mit acht Brücken.", quality: 3 },
  { id: "trollstigen", name: "Trollstigen", region: "Møre og Romsdal", category: "aussicht", lat: 62.4550, lng: 7.6710, description: "Serpentinenstraße mit Aussichtsplattform.", quality: 3 },
  { id: "voringsfossen", name: "Vøringsfossen", region: "Vestland", category: "wasserfall", lat: 60.4267, lng: 7.2500, description: "182 m hoher Wasserfall an der Hardangervidda.", quality: 3 },
  { id: "steinsdalsfossen", name: "Steinsdalsfossen", region: "Vestland", category: "wasserfall", lat: 60.3897, lng: 6.1930, description: "Wasserfall, hinter dem man trocken hindurchgehen kann.", quality: 2 },
  { id: "langfoss", name: "Langfoss", region: "Vestland", category: "wasserfall", lat: 59.7867, lng: 6.2820, description: "612 m langer Wasserfall direkt an der E134.", quality: 2 },
  { id: "bergen", name: "Bergen", aliases: ["Bryggen"], region: "Vestland", category: "stadt", lat: 60.3913, lng: 5.3221, description: "Hansestadt an der Westküste mit Bryggen (UNESCO).", quality: 3 },
  { id: "oslo", name: "Oslo", region: "Oslo", category: "stadt", lat: 59.9139, lng: 10.7522, description: "Hauptstadt mit Oper, Vigelandpark und Fjord.", quality: 3 },
  { id: "tromsoe", name: "Tromsø", region: "Troms", category: "stadt", lat: 69.6492, lng: 18.9553, description: "Nordlicht- und Mitternachtssonne-Metropole.", quality: 3 },
  { id: "aalesund", name: "Ålesund", region: "Møre og Romsdal", category: "stadt", lat: 62.4722, lng: 6.1495, description: "Jugendstil-Stadt zwischen den Fjorden.", quality: 2 },
  { id: "stavanger", name: "Stavanger", region: "Rogaland", category: "stadt", lat: 58.9700, lng: 5.7331, description: "Gamle Stavanger mit weißen Holzhäusern.", quality: 2 },
  { id: "nordkapp", name: "Nordkap", aliases: ["Nordkapp"], region: "Finnmark", category: "aussicht", lat: 71.1725, lng: 25.7842, description: "Nördlichster Punkt Europas per Straße.", quality: 3 },
  { id: "senja", name: "Senja", region: "Troms", category: "insel", lat: 69.3300, lng: 17.4000, description: "Dramatische Bergkulissen an der Nationalen Touristenstraße.", quality: 2 },
  { id: "vesteralen-bleik", name: "Bleik", region: "Nordland", category: "strand", lat: 69.2860, lng: 15.9930, description: "2,3 km weißer Sandstrand auf Andøya.", quality: 2 },
  { id: "hardangervidda", name: "Hardangervidda", region: "Vestland", category: "berg", lat: 60.3000, lng: 7.5000, description: "Größtes Hochplateau Europas.", quality: 2 },
  { id: "jotunheimen", name: "Jotunheimen", region: "Innlandet", category: "berg", lat: 61.6333, lng: 8.3000, description: "Nationalpark mit den höchsten Bergen Norwegens.", quality: 3 },
  { id: "besseggen", name: "Besseggen", region: "Innlandet", category: "wanderung", lat: 61.5000, lng: 8.7200, description: "Klassische Gratwanderung im Jotunheimen.", quality: 3 },
  { id: "galdhopiggen", name: "Galdhøpiggen", region: "Innlandet", category: "berg", lat: 61.6360, lng: 8.3130, description: "Höchster Berg Norwegens (2469 m).", quality: 2 },
  { id: "roros", name: "Røros", region: "Trøndelag", category: "stadt", lat: 62.5750, lng: 11.3833, description: "UNESCO-Bergbaustadt mit Holzhäusern.", quality: 2 },
  { id: "camper-oslo", name: "Bogstad Camping", region: "Oslo", category: "camper", lat: 59.9614, lng: 10.6383, description: "Stellplatz am See bei Oslo, ganzjährig.", quality: 2 },
  { id: "camper-lofoten", name: "Ramberg Gjestegård", region: "Nordland", category: "camper", lat: 68.0870, lng: 13.2360, description: "Camping direkt am Strand auf Flakstadøy.", quality: 2 },
];

// Norwegian normalization: æ→ae, ø→oe, å→aa, plus umlauts/diacritics
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export type SearchHit = { place: Place; score: number };

export function searchPlaces(
  places: Place[],
  query: string,
  categories: Set<Category>,
): SearchHit[] {
  const filtered = categories.size
    ? places.filter((p) => categories.has(p.category))
    : places;
  if (!query.trim()) {
    return filtered.map((place) => ({ place, score: 0 }));
  }
  const q = normalize(query);
  const hits: SearchHit[] = [];
  for (const place of filtered) {
    const name = normalize(place.name);
    const aliases = (place.aliases ?? []).map(normalize);
    const region = normalize(place.region);
    const cat = normalize(CATEGORY_LABEL[place.category]);
    const desc = normalize(place.description);
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (aliases.some((a) => a.includes(q))) score = 50;
    else if (region.includes(q) || cat.includes(q)) score = 30;
    else if (desc.includes(q)) score = 15;
    if (score > 0) hits.push({ place, score });
  }
  hits.sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));
  return hits;
}
