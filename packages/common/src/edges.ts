export interface EdgeMapping {
  sourceCollection: string;
  sourceType: string;
  edges: {
    field: string;
    fieldType: 'string' | 'array';
    targetType: string;
    relation: string;
    weight: number;
    bidirectional?: boolean;
    reverseRelation?: string;
    targetResolver?: string;
  }[];
}

export const EDGE_MAPPINGS: EdgeMapping[] = [
  {
    sourceCollection: 'conflicts',
    sourceType: 'conflict',
    edges: [
      { field: 'relatedCountries', fieldType: 'array', targetType: 'country',
        relation: 'involves', weight: 1.0, bidirectional: true, reverseRelation: 'involved-in',
        targetResolver: 'iso2-or-name' },
    ],
  },
  {
    sourceCollection: 'bases',
    sourceType: 'base',
    edges: [
      { field: 'hostNation', fieldType: 'string', targetType: 'country',
        relation: 'hosted-by', weight: 1.0, targetResolver: 'country-name' },
      { field: 'operatingCountry', fieldType: 'string', targetType: 'country',
        relation: 'operated-by', weight: 1.0, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'chokepoints',
    sourceType: 'chokepoint',
    edges: [
      { field: 'dependentCountries', fieldType: 'array', targetType: 'country',
        relation: 'depends-on', weight: 0.8, bidirectional: true, reverseRelation: 'dependent-on',
        targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'nonStateActors',
    sourceType: 'nsa',
    edges: [
      { field: 'allies', fieldType: 'array', targetType: 'country',
        relation: 'ally-of', weight: 0.7, targetResolver: 'country-name' },
      { field: 'rivals', fieldType: 'array', targetType: 'country',
        relation: 'rival-of', weight: 0.7, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'tradeRoutes',
    sourceType: 'trade-route',
    edges: [
      { field: 'from', fieldType: 'string', targetType: 'port', relation: 'originates-at', weight: 1.0 },
      { field: 'to', fieldType: 'string', targetType: 'port', relation: 'terminates-at', weight: 1.0 },
      { field: 'waypoints', fieldType: 'array', targetType: 'chokepoint', relation: 'passes-through', weight: 0.9 },
    ],
  },
  {
    sourceCollection: 'ports',
    sourceType: 'port',
    edges: [
      { field: 'country', fieldType: 'string', targetType: 'country',
        relation: 'port-in', weight: 1.0, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'elections',
    sourceType: 'election',
    edges: [
      { field: 'countryISO2', fieldType: 'string', targetType: 'country',
        relation: 'election-in', weight: 1.0, targetResolver: 'iso2-or-name' },
    ],
  },
];
