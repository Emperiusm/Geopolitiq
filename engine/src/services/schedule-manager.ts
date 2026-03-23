import { createLogger } from '@gambit/common';
import type { Logger } from '@gambit/common';
import type { SourceConfig } from '../pipeline/types';

const logger: Logger = createLogger('schedule-manager');

/**
 * ScheduleManager — creates and updates Temporal Schedules for enabled sources.
 * Uses the Temporal Schedules API with SKIP overlap policy and 30s jitter.
 */
export class ScheduleManager {
  constructor(private temporalClient: any) {}

  /**
   * Iterates all enabled sources from DB and creates/updates their Temporal Schedules.
   */
  async syncAll(): Promise<void> {
    const { getDb } = await import('../infrastructure/postgres');
    const { sources } = await import('../db');
    const { eq } = await import('drizzle-orm');

    const db = getDb();
    const enabledSources: Array<{ id: string }> = await db
      .select({ id: sources.id })
      .from(sources)
      .where(eq(sources.enabled, true));

    const results = await Promise.allSettled(
      enabledSources.map((s) => this.sync(s.id)),
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      logger.warn({ failedCount: failed.length }, 'ScheduleManager.syncAll: some sources failed to sync');
    }

    logger.info(
      { total: enabledSources.length, failed: failed.length },
      'ScheduleManager.syncAll complete',
    );
  }

  /**
   * Creates or updates a single source's Temporal Schedule.
   */
  async sync(sourceId: string): Promise<void> {
    if (!this.temporalClient) {
      logger.warn({ sourceId }, 'ScheduleManager.sync: Temporal client not available');
      return;
    }

    const { getDb } = await import('../infrastructure/postgres');
    const { sources } = await import('../db');
    const { eq } = await import('drizzle-orm');

    const db = getDb();
    const rows = await db.select().from(sources).where(eq(sources.id, sourceId));
    if (!rows || rows.length === 0) {
      throw new Error(`ScheduleManager.sync: source not found: ${sourceId}`);
    }
    const row = rows[0];

    if (!row.enabled) {
      await this._pauseSchedule(sourceId);
      return;
    }

    const cronExpression = row.fetcherScheduleOptimized ?? row.fetcherSchedule ?? '0 */6 * * *';
    const scheduleId = `source-${sourceId}`;

    const scheduleSpec = {
      cronExpressions: [cronExpression],
      jitter: '30 seconds',
    };

    const scheduleAction = {
      type: 'startWorkflow' as const,
      workflowType: 'sourceIngestionWorkflow',
      args: [sourceId],
      taskQueue: 'fetch',
      workflowExecutionTimeout: '30 minutes',
    };

    const schedulePolicy = {
      overlap: 'SKIP' as const,
    };

    try {
      // Attempt to create the schedule
      await this.temporalClient.schedule.create({
        scheduleId,
        spec: scheduleSpec,
        action: scheduleAction,
        policies: schedulePolicy,
      });
      logger.info({ sourceId, scheduleId, cron: cronExpression }, 'Schedule created');
    } catch (err: any) {
      // If schedule already exists, update it
      if (err?.code === 6 || (err?.message as string | undefined)?.includes('already exists')) {
        const handle = this.temporalClient.schedule.getHandle(scheduleId);
        await handle.update((schedule: any) => ({
          ...schedule,
          spec: scheduleSpec,
          action: scheduleAction,
          policies: schedulePolicy,
        }));
        logger.info({ sourceId, scheduleId, cron: cronExpression }, 'Schedule updated');
      } else {
        logger.error({ sourceId, err }, 'ScheduleManager.sync: unexpected error');
        throw err;
      }
    }
  }

  private async _pauseSchedule(sourceId: string): Promise<void> {
    if (!this.temporalClient) return;

    const scheduleId = `source-${sourceId}`;
    try {
      const handle = this.temporalClient.schedule.getHandle(scheduleId);
      await handle.pause(`Source ${sourceId} disabled`);
      logger.info({ sourceId, scheduleId }, 'Schedule paused (source disabled)');
    } catch {
      // Schedule may not exist yet — that's fine
    }
  }
}
