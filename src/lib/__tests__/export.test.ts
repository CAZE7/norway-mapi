import { describe, it, expect } from "vitest";
import { buildGpx } from "../export";
import type { ExportStop } from "../export";

describe("buildGpx", () => {
  it("escapes special XML characters in name, description, and category", () => {
    const stops: ExportStop[] = [
      {
        id: "1",
        lat: 59.9139,
        lng: 10.7522,
        name: "Test & Name < > ' \"",
        description: "Test & Desc < > ' \"",
        category: "Test & Cat < > ' \"",
      },
    ];

    const gpx = buildGpx(stops);

    // Assert that the generated GPX contains the escaped entities
    // & -> &amp;
    // < -> &lt;
    // > -> &gt;
    // ' -> &apos;
    // " -> &quot;

    // name tag inside wpt
    expect(gpx).toContain("<name>1. Test &amp; Name &lt; &gt; &apos; &quot;</name>");

    // desc tag inside wpt
    expect(gpx).toContain("<desc>Test &amp; Desc &lt; &gt; &apos; &quot;</desc>");

    // type tag inside wpt
    expect(gpx).toContain("<type>Test &amp; Cat &lt; &gt; &apos; &quot;</type>");

    // name tag inside rtept
    expect(gpx).toContain("<name>Test &amp; Name &lt; &gt; &apos; &quot;</name>");
  });

  it("escapes special XML characters in routeName", () => {
    const stops: ExportStop[] = [
      {
        id: "1",
        lat: 59.9139,
        lng: 10.7522,
        name: "Oslo",
      },
    ];

    const routeName = "Route & < > ' \"";
    const gpx = buildGpx(stops, routeName);

    // name tag inside metadata and rte
    expect(gpx).toContain("<name>Route &amp; &lt; &gt; &apos; &quot;</name>");
  });

  it("handles empty description and category", () => {
    const stops: ExportStop[] = [
      {
        id: "1",
        lat: 59.9139,
        lng: 10.7522,
        name: "Oslo",
      },
    ];

    const gpx = buildGpx(stops);

    expect(gpx).toContain("<name>1. Oslo</name>");
    expect(gpx).not.toContain("<desc>");
    expect(gpx).not.toContain("<type>");
  });
});
