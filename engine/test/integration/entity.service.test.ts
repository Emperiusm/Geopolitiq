import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb } from '../setup';
import { createTestContainer } from '../helpers/container';
import { createTestEntity, createTestCountry, createTestEdge } from '../helpers/fixtures';
import { resetDb } from '../helpers/db';
import { entities, entityEdges } from '../../src/db/schema/entities';
import { EntityNotFoundError } from '@gambit/common';
import type { ServiceContainer } from '../../src/services/container';
import type { DrizzleClient } from '../../src/db/transaction';

describe('EntityService', () => {
  let db: DrizzleClient;
  let container: ServiceContainer;

  beforeAll(async () => {
    const setup = await setupTestDb();
    db = setup.db;
    container = createTestContainer(db);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await resetDb(db);
  });

  it('findById returns an entity', async () => {
    const entity = createTestEntity();
    await db.insert(entities).values(entity);

    const found = await container.entityService.findById(entity.id);
    expect(found.id).toBe(entity.id);
    expect(found.name).toBe(entity.name);
  });

  it('findById throws EntityNotFoundError for missing entity', async () => {
    await expect(container.entityService.findById('company:nonexistent'))
      .rejects.toThrow(EntityNotFoundError);
  });

  it('list returns paginated results', async () => {
    const e1 = createTestEntity({ name: 'Alpha Corp' });
    const e2 = createTestEntity({ name: 'Beta Corp' });
    const e3 = createTestEntity({ name: 'Gamma Corp' });
    await db.insert(entities).values([e1, e2, e3]);

    const result = await container.entityService.list({ limit: 2, status: 'active', sortBy: 'name', sortDir: 'asc' });
    expect(result.data.length).toBe(2);
    expect(result.hasMore).toBe(true);
    expect(result.cursor).toBeTruthy();
  });

  it('list filters by type', async () => {
    const company = createTestEntity({ type: 'company' });
    const country = createTestCountry();
    await db.insert(entities).values([company, country]);

    const result = await container.entityService.list({ type: 'company', status: 'active', sortBy: 'updated_at', sortDir: 'desc', limit: 50 });
    expect(result.data.length).toBe(1);
    expect(result.data[0].type).toBe('company');
  });

  it('getEdges returns edges with connected entities', async () => {
    const e1 = createTestEntity({ id: 'company:test-a', name: 'Company A' });
    const e2 = createTestEntity({ id: 'company:test-b', name: 'Company B' });
    await db.insert(entities).values([e1, e2]);

    const edge = createTestEdge(e1.id, 'partner-of', e2.id);
    await db.insert(entityEdges).values(edge);

    const edges = await container.entityService.getEdges(e1.id);
    expect(edges.length).toBe(1);
    expect(edges[0].relation).toBe('partner-of');
  });

  it('findByIds returns multiple entities', async () => {
    const e1 = createTestEntity();
    const e2 = createTestEntity();
    await db.insert(entities).values([e1, e2]);

    const found = await container.entityService.findByIds([e1.id, e2.id]);
    expect(found.length).toBe(2);
  });

  it('resolve matches by iso2', async () => {
    const country = createTestCountry({ iso2: 'ZZ' });
    await db.insert(entities).values(country);

    const result = await container.entityService.resolve('ZZ');
    expect(result).toBeTruthy();
    expect(result!.entity.id).toBe(country.id);
    expect(result!.matchedOn).toBe('iso2');
  });
});
