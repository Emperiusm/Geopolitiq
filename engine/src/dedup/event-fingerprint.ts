import { createHash } from 'crypto';

export function computeEventFingerprint(entityId: string, category: string, publishedAt: string): string {
  const date = new Date(publishedAt);
  const hours = date.getUTCHours();
  date.setUTCHours(hours < 12 ? 0 : 12, 0, 0, 0);
  const bucket = date.toISOString();
  return createHash('sha256').update(`${entityId}|${category}|${bucket}`).digest('hex');
}
