import { GeoJsonLayer } from '@deck.gl/layers';
import type { Country, RiskLevel } from '../state/store';
import { getRiskColorRGB } from './risk-heatmap';

/**
 * Natural Earth low-res country GeoJSON (110m simplified).
 * Public domain, ~200KB. Loaded once and cached.
 */
const GEOJSON_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

let geoJsonCache: any = null;
let loadPromise: Promise<any> | null = null;

/**
 * Load TopoJSON and convert to GeoJSON features.
 * world-atlas ships TopoJSON — we need to convert to GeoJSON.
 * We use the topojson-client inline since it's small.
 */
async function loadCountryGeoJson(): Promise<any[]> {
  if (geoJsonCache) return geoJsonCache;

  if (!loadPromise) {
    loadPromise = (async () => {
      const res = await fetch(GEOJSON_URL);
      const topo = await res.json();

      // Inline TopoJSON → GeoJSON conversion (avoids extra dependency)
      const geometries = topo.objects.countries.geometries;
      const { arcs, transform } = topo;

      // Use topojson-client feature function equivalent
      const features = geometries.map((geom: any) => ({
        type: 'Feature' as const,
        id: geom.id,
        properties: { ...geom.properties, id: geom.id },
        geometry: topoGeomToGeoJson(geom, arcs, transform),
      }));

      geoJsonCache = features;
      return features;
    })();
  }

  return loadPromise;
}

// Minimal TopoJSON arc decoding
function decodeArc(arc: number[][], transform?: any): number[][] {
  if (!transform) return arc;
  const { scale, translate } = transform;
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
}

function resolveArcs(indices: any, arcs: number[][][], transform?: any): number[][][] {
  if (typeof indices[0] === 'number') {
    // Ring of arc indices
    const coords: number[][] = [];
    for (const idx of indices) {
      const arcIdx = idx < 0 ? ~idx : idx;
      let decoded = decodeArc(arcs[arcIdx], transform);
      if (idx < 0) decoded = decoded.slice().reverse();
      coords.push(...(coords.length > 0 ? decoded.slice(1) : decoded));
    }
    return [coords];
  }
  // Array of rings
  return indices.map((ring: any) => resolveArcs(ring, arcs, transform)[0]);
}

function topoGeomToGeoJson(geom: any, arcs: number[][][], transform?: any): any {
  if (geom.type === 'Polygon') {
    const rings = geom.arcs.map((ring: number[]) => {
      return resolveArcs(ring, arcs, transform)[0];
    });
    return { type: 'Polygon', coordinates: rings };
  }
  if (geom.type === 'MultiPolygon') {
    const polygons = geom.arcs.map((polygon: number[][]) => {
      return polygon.map((ring: number[]) => resolveArcs(ring, arcs, transform)[0]);
    });
    return { type: 'MultiPolygon', coordinates: polygons };
  }
  return { type: geom.type, coordinates: [] };
}

/**
 * Build an ISO numeric → risk color lookup from bootstrap countries.
 * Natural Earth uses ISO 3166-1 numeric IDs.
 */
function buildRiskLookup(countries: Country[]): Map<string, RiskLevel> {
  const lookup = new Map<string, RiskLevel>();
  for (const c of countries) {
    // Match by ISO2 code stored in country data
    lookup.set(c.iso2, c.risk);
  }
  return lookup;
}

// ISO numeric → ISO2 mapping isn't in the GeoJSON, so we match by ID.
// We'll pass the risk lookup to the layer's accessor instead.

let cachedFeatures: any[] | null = null;

/**
 * Risk polygon fill layer for both globe and flat map modes.
 * Renders semi-transparent country polygons colored by risk level.
 */
export function createRiskPolygonLayer(
  countries: Country[],
  visible: boolean,
  opacity: number = 0.4,
) {
  const riskLookup = buildRiskLookup(countries);

  // Kick off async load (layer will render empty until loaded)
  if (!cachedFeatures) {
    loadCountryGeoJson().then(features => {
      cachedFeatures = features;
    });
  }

  return new GeoJsonLayer({
    id: 'risk-polygons',
    data: cachedFeatures ?? [],
    visible,
    opacity,
    pickable: false,
    filled: true,
    stroked: false,
    getFillColor: (f: any) => {
      // Try to match feature to a country by properties
      const props = f.properties || {};
      const name = props.name;
      // Fallback: try matching by country name
      const country = countries.find(c =>
        c.name === name || c.iso2 === props.iso_a2
      );
      if (country) {
        const rgb = getRiskColorRGB(country.risk);
        return [...rgb, 160] as [number, number, number, number];
      }
      // Neutral land color for countries not in dataset — solid white/cream
      return [245, 242, 235, 255] as [number, number, number, number];
    },
    getLineColor: [140, 150, 170, 200],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    updateTriggers: {
      getFillColor: [countries.map(c => `${c._id}:${c.risk}`).join(',')],
    },
  });
}
