import { createHash } from 'crypto';

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function computeContentHash(title: string, url: string, publishedDate: string): string {
  const normalized = `${normalizeTitle(title)}|${url}|${publishedDate.split('T')[0]}`;
  return createHash('sha256').update(normalized).digest('hex');
}
