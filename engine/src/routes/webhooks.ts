import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import type { ServiceContainer } from '../services/container';
import { webhookEndpoints } from '../db';
import { recordId } from '@gambit/common';

const webhookCreateSchema = z.object({
  url: z.string().url(),
  eventTypes: z.array(z.string()).min(1),
});

export function webhookRoutes(container: ServiceContainer) {
  const app = new Hono();

  function getTeamId(c: any): string | null {
    return (c.get('teamId') as string | undefined) ?? null;
  }

  // GET / — list webhooks for the current team
  app.get('/', async (c) => {
    const teamId = getTeamId(c);
    if (!teamId) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Team context required' } }, 401 as any);
    }

    const data = await (container.db as any)
      .select()
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.teamId, teamId))
      .orderBy(webhookEndpoints.createdAt);

    // Mask the secret in responses — return only first 8 chars
    const masked = data.map((w: any) => ({
      ...w,
      secret: `${w.secret.slice(0, 8)}...`,
    }));

    return c.json({ data: masked, meta: { count: masked.length } });
  });

  // POST / — create webhook endpoint with auto-generated HMAC secret
  app.post('/', zValidator('json', webhookCreateSchema), async (c) => {
    const teamId = getTeamId(c);
    if (!teamId) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Team context required' } }, 401 as any);
    }

    const { url, eventTypes } = c.req.valid('json');

    // Generate a cryptographically secure HMAC secret
    const secret = `whsec_${randomBytes(32).toString('hex')}`;
    const id = recordId('wh', crypto.randomUUID());

    await (container.db as any).insert(webhookEndpoints).values({
      id,
      teamId,
      url,
      secret,
      eventTypes,
      active: true,
      failureCount: 0,
      createdAt: new Date(),
    });

    return c.json(
      {
        data: {
          id,
          teamId,
          url,
          eventTypes,
          active: true,
          // Return full secret ONCE at creation time — it will be masked in subsequent reads
          secret,
          createdAt: new Date().toISOString(),
        },
      },
      201 as any,
    );
  });

  // DELETE /:id — delete a webhook endpoint
  app.delete('/:id', async (c) => {
    const teamId = getTeamId(c);
    if (!teamId) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Team context required' } }, 401 as any);
    }

    const id = c.req.param('id');

    const result = await (container.db as any)
      .delete(webhookEndpoints)
      .where(
        and(
          eq(webhookEndpoints.id, id),
          eq(webhookEndpoints.teamId, teamId),
        ),
      )
      .returning({ id: webhookEndpoints.id });

    if (result.length === 0) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404 as any);
    }

    return c.json({ data: { deleted: true, id } });
  });

  return app;
}
