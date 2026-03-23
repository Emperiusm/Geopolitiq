import { recordId } from '@gambit/common';

export interface MongoEntityMapping {
  collection: string;
  entityType: string;
  transform: (doc: any) => {
    id: string;
    name: string;
    aliases: string[];
    lat?: string;
    lng?: string;
    risk?: string;
    ticker?: string;
    iso2?: string;
    tags: string[];
    meta: Record<string, any>;
  };
}

export const ENTITY_MAPPINGS: MongoEntityMapping[] = [
  {
    collection: 'countries',
    entityType: 'country',
    transform: (doc) => ({
      id: recordId('country', doc._id),
      name: doc.name,
      aliases: [doc.iso2, doc.name].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      risk: doc.risk,
      iso2: doc.iso2,
      tags: doc.tags ?? [],
      meta: {
        flag: doc.flag,
        region: doc.region,
        pop: doc.pop,
        gdp: doc.gdp,
        leader: doc.leader,
        title: doc.title,
        casualties: doc.casualties,
        analysis: doc.analysis,
      },
    }),
  },
  {
    collection: 'conflicts',
    entityType: 'conflict',
    transform: (doc) => ({
      id: recordId('conflict', doc._id),
      name: doc.title ?? doc._id,
      aliases: [doc.title].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      tags: doc.tags ?? [],
      meta: {
        startDate: doc.startDate,
        dayCount: doc.dayCount,
        status: doc.status,
        casualties: doc.casualties,
        latestUpdate: doc.latestUpdate,
        // relatedCountries excluded — goes to edges
      },
    }),
  },
  {
    collection: 'bases',
    entityType: 'base',
    transform: (doc) => ({
      id: recordId('base', doc._id),
      name: doc.name ?? doc._id,
      aliases: [doc.name].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      tags: [],
      meta: {
        branch: doc.branch,
        type: doc.type,
        flag: doc.flag,
        color: doc.color,
        personnel: doc.personnel,
        history: doc.history,
        significance: doc.significance,
        iranWarRole: doc.iranWarRole,
        // hostNation, operatingCountry excluded — goes to edges
      },
    }),
  },
  {
    collection: 'chokepoints',
    entityType: 'chokepoint',
    transform: (doc) => ({
      id: recordId('chokepoint', doc._id),
      name: doc.name ?? doc._id,
      aliases: [...(doc.searchTerms ?? []), doc.name].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      tags: [],
      meta: {
        type: doc.type,
        tooltipLine: doc.tooltipLine,
        summary: doc.summary,
        dailyVessels: doc.dailyVessels,
        oilVolume: doc.oilVolume,
        gasVolume: doc.gasVolume,
        status: doc.status,
        // dependentCountries excluded — goes to edges
      },
    }),
  },
  {
    collection: 'nonStateActors',
    entityType: 'nsa',
    transform: (doc) => ({
      id: recordId('nsa', doc._id),
      name: doc.name ?? doc._id,
      aliases: [...(doc.searchTerms ?? []), doc.name].filter(Boolean),
      tags: [],
      meta: {
        ideology: doc.ideology,
        status: doc.status,
        designation: doc.designation,
        founded: doc.founded,
        revenue: doc.revenue,
        strength: doc.strength,
        activities: doc.activities,
        territory: doc.territory,
        funding: doc.funding,
        leaders: doc.leaders,
        majorAttacks: doc.majorAttacks,
        zones: doc.zones,
        // allies, rivals excluded — goes to edges
      },
    }),
  },
  {
    collection: 'elections',
    entityType: 'election',
    transform: (doc) => ({
      id: recordId('election', doc._id),
      name: `${doc.country ?? ''} ${doc.type ?? ''} ${doc.date ?? ''}`.trim(),
      aliases: [doc.country, doc.type].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      iso2: doc.countryISO2,
      tags: [],
      meta: {
        flag: doc.flag,
        country: doc.country,
        dateISO: doc.dateISO,
        date: doc.date,
        type: doc.type,
        winner: doc.winner,
        result: doc.result,
        summary: doc.summary,
        // countryISO2 excluded — goes to edges
      },
    }),
  },
  {
    collection: 'tradeRoutes',
    entityType: 'trade-route',
    transform: (doc) => ({
      id: recordId('trade-route', doc._id),
      name: doc.name ?? doc._id,
      aliases: [doc.name].filter(Boolean),
      tags: [],
      meta: {
        category: doc.category,
        status: doc.status,
        volumeDesc: doc.volumeDesc,
        // from, to, waypoints excluded — goes to edges
      },
    }),
  },
  {
    collection: 'ports',
    entityType: 'port',
    transform: (doc) => ({
      id: recordId('port', doc._id),
      name: doc.name ?? doc._id,
      aliases: [doc.name].filter(Boolean),
      lat: doc.lat?.toString(),
      lng: doc.lng?.toString(),
      tags: [],
      meta: {
        // country excluded — goes to edges
      },
    }),
  },
];

export const AUTH_MAPPINGS = {
  teams: (doc: any) => ({
    id: doc._id as string,
    name: (doc.name ?? doc.slug) as string,
    slug: doc.slug as string,
    tier: (doc.plan === 'pro' ? 'pro' : 'free') as 'free' | 'pro' | 'enterprise',
    stripeCustomerId: (doc.stripeCustomerId ?? null) as string | null,
  }),
  users: (doc: any) => ({
    id: doc._id as string,
    email: doc.email as string,
    teamId: doc.teamId as string,
    role: (doc.role ?? 'member') as 'owner' | 'admin' | 'member' | 'viewer',
    platformRole: (doc.platformRole ?? 'user') as string,
    providers: (doc.providers ?? []) as any[],
    deletedAt: (doc.deletedAt ?? null) as Date | null,
  }),
  apiKeys: (doc: any) => ({
    id: doc._id as string,
    keyHash: doc.keyHash as string,
    teamId: doc.teamId as string,
    userId: doc.userId as string,
    name: (doc.name ?? 'default') as string,
    scopes: (doc.scope ? [doc.scope] : ['read']) as string[],
    lastUsedAt: (doc.lastUsedAt ?? null) as Date | null,
    expiresAt: (doc.expiresAt ?? null) as Date | null,
  }),
  sessions: (doc: any) => ({
    id: doc._id as string,
    userId: doc.userId as string,
    expiresAt: (doc.absoluteExpiresAt ?? doc.expiresAt ?? new Date(Date.now() + 86400000)) as Date,
  }),
};
