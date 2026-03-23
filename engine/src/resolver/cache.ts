import type Redis from 'ioredis';

export interface CachedResolution {
  entityId: string;
  confidence: number;
}

export class ResolutionCache {
  private ttlSeconds = 3600;

  constructor(private redis: Redis) {}

  private normalize(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private key(name: string): string {
    return `resolve:${this.normalize(name)}`;
  }

  async get(name: string): Promise<CachedResolution | null> {
    const raw = await this.redis.get(this.key(name));
    return raw ? JSON.parse(raw) : null;
  }

  async set(name: string, entityId: string, confidence: number): Promise<void> {
    await this.redis.setex(
      this.key(name),
      this.ttlSeconds,
      JSON.stringify({ entityId, confidence }),
    );
  }

  async evict(name: string): Promise<void> {
    await this.redis.del(this.key(name));
  }

  async warmFromDb(db: any, limit: number = 1000): Promise<number> {
    const entities = await db.query.entities.findMany({
      orderBy: (e: any, { desc }: any) => [desc(e.signalCountBehavioral + e.signalCountDeclarative)],
      limit,
    });
    const pipeline = this.redis.pipeline();
    for (const entity of entities) {
      pipeline.setex(this.key(entity.name), this.ttlSeconds, JSON.stringify({ entityId: entity.id, confidence: 1.0 }));
      for (const alias of entity.aliases ?? []) {
        pipeline.setex(this.key(alias), this.ttlSeconds, JSON.stringify({ entityId: entity.id, confidence: 0.95 }));
      }
    }
    await pipeline.exec();
    return entities.length;
  }
}
