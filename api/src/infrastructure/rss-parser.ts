export interface ParsedArticle {
  title: string;
  link: string;
  summary: string;
  publishedAt: Date;
  source: string;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainRe = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i');
  const match = xml.match(plainRe);
  return match ? decodeXmlEntities(match[1].trim()) : '';
}

/** Strip HTML tags from summary text */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

export function parseRssXml(xml: string, feedName: string, maxItems = 10): ParsedArticle[] {
  const items: ParsedArticle[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let matches = [...xml.matchAll(itemRegex)];
  const isAtom = matches.length === 0;
  if (isAtom) matches = [...xml.matchAll(entryRegex)];
  for (const match of matches.slice(0, maxItems)) {
    const block = match[1];
    const title = extractTag(block, 'title');
    if (!title) continue;
    const link = isAtom
      ? (block.match(/<link[^>]+href=["']([^"']+)["']/)?.[1] ?? '')
      : extractTag(block, 'link');
    const rawSummary = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
    const summary = stripHtml(rawSummary);
    const pubDateStr = isAtom
      ? (extractTag(block, 'published') || extractTag(block, 'updated'))
      : extractTag(block, 'pubDate');
    const parsedDate = pubDateStr ? new Date(pubDateStr) : new Date();
    items.push({
      title,
      link,
      summary,
      publishedAt: Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
      source: feedName,
    });
  }
  return items;
}

/** Fetch and parse a single feed. Returns articles or empty array on error. */
export async function fetchFeed(
  url: string,
  feedName: string,
  timeoutMs = 8000,
  maxItems = 10,
): Promise<ParsedArticle[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Gambit/1.0 (news aggregator)" },
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssXml(xml, feedName, maxItems);
  } catch {
    return [];
  }
}
