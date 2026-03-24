import { recordId, edgeId } from '@gambit/common';

let counter = 0;

function uniqueId() {
  return `test-${Date.now()}-${++counter}`;
}

export function createTestEntity(overrides: Record<string, any> = {}) {
  const id = uniqueId();
  return {
    id: recordId('company', id),
    type: 'company' as const,
    name: `Test Company ${id}`,
    aliases: [`TC-${id}`],
    status: 'active' as const,
    domains: [],
    tags: [],
    externalIds: {},
    meta: {},
    signalCountDeclarative: 0,
    signalCountBehavioral: 0,
    ...overrides,
  };
}

export function createTestCountry(overrides: Record<string, any> = {}) {
  const id = uniqueId();
  return {
    id: recordId('country', id),
    type: 'country' as const,
    name: `Test Country ${id}`,
    aliases: [`TC${counter}`],
    status: 'active' as const,
    iso2: `T${counter}`.slice(0, 2).toUpperCase(),
    risk: 'clear',
    domains: [],
    tags: [],
    externalIds: {},
    meta: { region: 'Test Region', flag: '🏳️' },
    signalCountDeclarative: 0,
    signalCountBehavioral: 0,
    ...overrides,
  };
}

export function createTestEdge(fromId: string, relation: string, toId: string, overrides: Record<string, any> = {}) {
  return {
    id: edgeId(fromId, relation, toId),
    fromId,
    toId,
    relation,
    weight: '1.0',
    source: 'test',
    meta: {},
    ...overrides,
  };
}

export function createTestTeam(overrides: Record<string, any> = {}) {
  const id = uniqueId();
  return {
    id: `team-${id}`,
    name: `Test Team ${id}`,
    slug: `test-team-${id}`,
    tier: 'free' as const,
    ...overrides,
  };
}

export function createTestUser(teamId: string, overrides: Record<string, any> = {}) {
  const id = uniqueId();
  return {
    id: `user-${id}`,
    email: `user-${id}@test.gambit.io`,
    teamId,
    role: 'member' as const,
    platformRole: 'user',
    providers: [],
    ...overrides,
  };
}
