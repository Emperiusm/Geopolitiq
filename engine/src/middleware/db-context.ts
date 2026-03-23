import { createMiddleware } from 'hono/factory';
import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../db/transaction';

export function dbContext(db: DrizzleClient) {
  return createMiddleware(async (c, next) => {
    const teamId = c.get('teamId') as string | undefined;

    await db.transaction(async (tx) => {
      // Set RLS context for the transaction if team ID is available
      if (teamId) {
        await tx.execute(sql`SET LOCAL app.team_id = ${teamId}`);
      }

      // Expose transaction-scoped DB handle
      c.set('txDb', tx);

      await next();
    });
  });
}
