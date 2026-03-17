// api/src/modules/reference/ports.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams } from "../../helpers/query";
import { paginated } from "../../helpers/response";

export const portsRouter = new Hono();
const CACHE_TTL = 3600;

portsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset } = parseListParams(searchParams);

  const cacheKey = `gambit:ports:all:${limit}:${offset}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("ports");
    const [data, total] = await Promise.all([
      col.find({}).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
