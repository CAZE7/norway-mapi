// GPX 1.1 and KML 2.2 exporters for the planned route. Both are standard
// XML formats supported by Google/Apple Maps, Komoot, Organic Maps, Garmin,
// Locus Map, Gaia GPS and most navigation software.

export type ExportStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description?: string;
  category?: string;
};

function escapeXml(s: string | undefined | null): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildGpx(stops: ExportStop[], routeName = "Steder i Norge – Route"): string {
  const now = new Date().toISOString();
  const wpts = stops
    .map(
      (s, i) => `  <wpt lat="${s.lat}" lon="${s.lng}">
    <name>${escapeXml(`${i + 1}. ${s.name}`)}</name>
    ${s.description ? `<desc>${escapeXml(s.description)}</desc>` : ""}
    ${s.category ? `<type>${escapeXml(s.category)}</type>` : ""}
  </wpt>`,
    )
    .join("\n");
  const rtepts = stops
    .map(
      (s) => `    <rtept lat="${s.lat}" lon="${s.lng}"><name>${escapeXml(s.name)}</name></rtept>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Steder i Norge" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <time>${now}</time>
  </metadata>
${wpts}
  <rte>
    <name>${escapeXml(routeName)}</name>
${rtepts}
  </rte>
</gpx>
`;
}

export function buildKml(stops: ExportStop[], routeName = "Steder i Norge – Route"): string {
  const placemarks = stops
    .map(
      (s, i) => `    <Placemark>
      <name>${escapeXml(`${i + 1}. ${s.name}`)}</name>
      ${s.description ? `<description>${escapeXml(s.description)}</description>` : ""}
      <Point><coordinates>${s.lng},${s.lat},0</coordinates></Point>
    </Placemark>`,
    )
    .join("\n");
  const line = stops.map((s) => `${s.lng},${s.lat},0`).join(" ");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${escapeXml(routeName)}</name>
${placemarks}
    <Placemark>
      <name>${escapeXml(routeName)}</name>
      <Style><LineStyle><color>ff2d5a3d</color><width>4</width></LineStyle></Style>
      <LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString>
    </Placemark>
  </Document>
</kml>
`;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  try {
    a.click();
  } finally {
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
