import Anthropic from '@anthropic-ai/sdk';
import type { Logger } from '@gambit/common';
import type { FetchedItem, ParsedSignal, SourceConfig } from '../pipeline/types';

const DEFAULT_MODEL = 'claude-haiku-4-5';
const DEFAULT_MAX_INPUT_CHARS = 50_000;

/** Truncation marker appended when input exceeds maxChars */
const TRUNCATION_MARKER = '[TRUNCATED]';

/**
 * Renders a Mustache-style prompt template by substituting {{variable}} placeholders.
 * Missing variables are replaced with an empty string.
 */
export function renderPrompt(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Sanitizes raw input text for safe inclusion in LLM prompts:
 * - Strips XML processing instructions (<?...?>)
 * - Strips DOCTYPE declarations (<!DOCTYPE...>)
 * - Truncates to maxChars and appends [TRUNCATED] marker if needed
 */
export function sanitizeInput(text: string, maxChars: number = DEFAULT_MAX_INPUT_CHARS): string {
  let sanitized = text
    // Strip XML processing instructions: <?xml ...?> etc.
    .replace(/<\?[^>]*\?>/g, '')
    // Strip DOCTYPE declarations
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .trim();

  if (sanitized.length > maxChars) {
    sanitized = sanitized.slice(0, maxChars - TRUNCATION_MARKER.length) + TRUNCATION_MARKER;
  }

  return sanitized;
}

/** Result returned by AgentParser.parse */
export interface AgentParseResult {
  signals: ParsedSignal[];
  tokensIn: number;
  tokensOut: number;
}

/** Default system prompt used when source has no parserPrompt configured */
const DEFAULT_SYSTEM_PROMPT = `You are a geopolitical intelligence analyst. Extract structured signals from the provided documents.

For each document, output a JSON array of signal objects. Each object must conform to this schema:
{
  "headline": "string — concise title of the event or development",
  "body": "string — brief summary (optional)",
  "url": "string — source URL if available (optional)",
  "publishedAt": "ISO 8601 datetime string",
  "category": "string — e.g. news-article, regulatory-filing, patent, earnings-report",
  "entityNames": ["string array — primary organizations or people"],
  "secondaryEntityNames": ["string array — secondary entities (optional)"],
  "domains": ["string array — relevant domains e.g. semiconductor, energy, defense"],
  "intensity": "number 0-1 — signal strength",
  "confidence": "number 0-1 — extraction confidence",
  "claims": [{ "subject": "string", "predicate": "string", "object": "string", "confidence": 0.8 }],
  "tags": ["optional string tags"],
  "language": "ISO 639-1 language code (optional)"
}

Respond ONLY with a valid JSON array. No markdown fences, no explanation.`;

export class AgentParser {
  private client: Anthropic;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.client = new Anthropic();
  }

  /**
   * Parses a batch of FetchedItems using the Anthropic API.
   * Items are batched into a single prompt for efficiency.
   */
  async parse(
    items: FetchedItem[],
    source: SourceConfig,
  ): Promise<AgentParseResult> {
    if (items.length === 0) {
      return { signals: [], tokensIn: 0, tokensOut: 0 };
    }

    const model = source.parserModel ?? DEFAULT_MODEL;
    const maxInputChars = source.parserMaxInputTokens
      ? source.parserMaxInputTokens * 4 // rough chars-per-token estimate
      : DEFAULT_MAX_INPUT_CHARS;

    const systemPrompt = source.parserPrompt
      ? renderPrompt(source.parserPrompt, { source_category: source.category ?? '' })
      : DEFAULT_SYSTEM_PROMPT;

    // Build the document block: one section per item
    const documentText = items
      .map((item, idx) => {
        const raw = sanitizeInput(item.raw, Math.floor(maxInputChars / items.length));
        const url = item.url ? `URL: ${item.url}\n` : '';
        const ts = item.publishedAt ? `PublishedAt: ${item.publishedAt}\n` : '';
        return `--- Document ${idx + 1} ---\n${url}${ts}${raw}`;
      })
      .join('\n\n');

    this.logger.debug({ sourceId: source.id, itemCount: items.length, model }, 'AgentParser: sending batch');

    let tokensIn = 0;
    let tokensOut = 0;
    let signals: ParsedSignal[] = [];

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: documentText,
          },
        ],
      });

      tokensIn = response.usage.input_tokens;
      tokensOut = response.usage.output_tokens;

      const rawText = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      signals = this.parseJsonResponse(rawText, source.id);

      this.logger.info(
        { sourceId: source.id, signalCount: signals.length, tokensIn, tokensOut },
        'AgentParser: batch complete',
      );
    } catch (err) {
      this.logger.error({ sourceId: source.id, err }, 'AgentParser: API call failed');
      throw err;
    }

    return { signals, tokensIn, tokensOut };
  }

  private parseJsonResponse(raw: string, sourceId: string): ParsedSignal[] {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      this.logger.warn({ sourceId, raw: cleaned.slice(0, 200) }, 'AgentParser: JSON parse failed');
      return [];
    }

    if (!Array.isArray(parsed)) {
      this.logger.warn({ sourceId }, 'AgentParser: response is not a JSON array');
      return [];
    }

    const signals: ParsedSignal[] = [];
    for (const item of parsed) {
      if (typeof item !== 'object' || item === null) continue;
      const obj = item as Record<string, unknown>;

      // Require at minimum a headline
      if (typeof obj.headline !== 'string' || !obj.headline) continue;

      signals.push({
        headline: obj.headline,
        body: typeof obj.body === 'string' ? obj.body : undefined,
        url: typeof obj.url === 'string' ? obj.url : undefined,
        publishedAt: typeof obj.publishedAt === 'string' ? obj.publishedAt : new Date().toISOString(),
        category: typeof obj.category === 'string' ? obj.category : 'uncategorized',
        entityNames: Array.isArray(obj.entityNames)
          ? (obj.entityNames as unknown[]).filter((e): e is string => typeof e === 'string')
          : [],
        secondaryEntityNames: Array.isArray(obj.secondaryEntityNames)
          ? (obj.secondaryEntityNames as unknown[]).filter((e): e is string => typeof e === 'string')
          : undefined,
        domains: Array.isArray(obj.domains)
          ? (obj.domains as unknown[]).filter((d): d is string => typeof d === 'string')
          : [],
        intensity: typeof obj.intensity === 'number' ? obj.intensity : 0.5,
        confidence: typeof obj.confidence === 'number' ? obj.confidence : 0.5,
        claims: Array.isArray(obj.claims) ? (obj.claims as ParsedSignal['claims']) : [],
        tags: Array.isArray(obj.tags)
          ? (obj.tags as unknown[]).filter((t): t is string => typeof t === 'string')
          : undefined,
        language: typeof obj.language === 'string' ? obj.language : undefined,
      });
    }

    return signals;
  }
}
