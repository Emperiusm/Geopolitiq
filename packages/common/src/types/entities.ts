export type EntityType =
  | 'company' | 'country' | 'government' | 'organization' | 'person'
  | 'conflict' | 'chokepoint' | 'base' | 'trade-route' | 'port'
  | 'nsa' | 'election';

export type EntityStatus = 'active' | 'acquired' | 'dissolved' | 'merged' | 'inactive' | 'unverified';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];
  parentId?: string | null;
  status: EntityStatus;
  statusDetail?: string | null;
  statusAt?: Date | null;
  sector?: string | null;
  jurisdiction?: string | null;
  domains: string[];
  lat?: string | null;
  lng?: string | null;
  externalIds: Record<string, string>;
  tags: string[];
  risk?: string | null;
  ticker?: string | null;
  iso2?: string | null;
  meta: Record<string, any>;
  signalCountDeclarative: number;
  signalCountBehavioral: number;
  realityScore?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: string;
  weight: string;
  source: string;
  meta: Record<string, any>;
  createdAt: Date;
}
