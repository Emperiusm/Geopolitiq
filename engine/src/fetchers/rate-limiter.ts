import type Redis from 'ioredis';

const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1]) or capacity
local lastRefill = tonumber(bucket[2]) or now

local elapsed = now - lastRefill
local refill = math.floor(elapsed * refillRate / 1000)
tokens = math.min(capacity, tokens + refill)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 300)
  return 1
else
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
  redis.call('EXPIRE', key, 300)
  return 0
end
`;

export class TokenBucketRateLimiter {
  constructor(
    private redis: Redis,
    private sourceId: string,
    private intervalMs: number,
    private capacity: number = 10,
  ) {}

  async acquire(priority: 'live' | 'backfill' = 'live'): Promise<boolean> {
    const key = `ratelimit:${this.sourceId}`;
    const refillRate = this.capacity / (this.intervalMs / 1000);
    const now = Date.now();
    const requested = priority === 'backfill' ? 2 : 1;
    const result = await this.redis.eval(TOKEN_BUCKET_SCRIPT, 1, key, this.capacity, refillRate, now, requested);
    return result === 1;
  }

  async waitForToken(priority: 'live' | 'backfill' = 'live', maxWaitMs: number = 30000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      if (await this.acquire(priority)) return true;
      await new Promise(r => setTimeout(r, Math.min(this.intervalMs / 2, 1000)));
    }
    return false;
  }
}
