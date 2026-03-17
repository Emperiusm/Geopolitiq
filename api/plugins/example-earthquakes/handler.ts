import type { PluginSourceHandler } from "../../src/types";

export default {
  async fetch(): Promise<any[]> {
    try {
      const res = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return [];
      const data = await res.json();

      return (data.features ?? []).map((f: any) => ({
        _id: f.id,
        title: f.properties.title,
        magnitude: f.properties.mag,
        depth: f.geometry.coordinates[2],
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        location: {
          type: "Point" as const,
          coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]],
        },
        place: f.properties.place,
        timestamp: new Date(f.properties.time),
        url: f.properties.url,
      }));
    } catch {
      return [];
    }
  },

  encodeBinary(doc: any): number[] {
    return [doc.lng, doc.lat, doc.magnitude ?? 0, doc.depth ?? 0];
  },
} satisfies PluginSourceHandler;
