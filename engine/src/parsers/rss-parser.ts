import type { FetchResult, ParsedSignal } from '../pipeline/types';
import type { Parser } from './registry';

// Common English stop words to filter from entity name candidates
const STOP_WORDS = new Set([
  // Articles
  'The', 'A', 'An',
  // Days of week
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  // Months
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
  // Common prepositions / conjunctions capitalized at sentence start
  'From', 'With', 'For', 'And', 'But', 'Or', 'In', 'On', 'At', 'By', 'Of', 'To',
  'As', 'Is', 'Are', 'Was', 'Were', 'Has', 'Have', 'Had', 'Be', 'Been', 'Being',
  // Common verbs/adjectives that appear capitalized
  'New', 'First', 'Last', 'Next', 'This', 'That', 'These', 'Those',
  'Its', 'His', 'Her', 'Their', 'Our', 'Your',
  // Transition words
  'After', 'Before', 'Since', 'While', 'When', 'Where', 'How', 'What', 'Which', 'Who',
  'About', 'Above', 'Between', 'Into', 'Through', 'During', 'Without',
  // Numbers written out
  'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
]);

/**
 * Regex to match capitalized words (Title Case) — starts with uppercase, followed by lowercase
 */
const TITLE_CASE_WORD_RE = /\b([A-Z][a-z]+)\b/g;

/**
 * Regex to match uppercase acronyms of 3+ characters
 */
const ACRONYM_RE = /\b([A-Z]{3,})\b/g;

export class RssParser implements Parser {
  sourceId = 'rss';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const title = item.meta?.title as string | undefined;
      if (!title) continue;

      const description = (item.meta?.description ?? item.meta?.summary ?? '') as string;
      const textForEntities = `${title} ${description}`;

      const publishedAt = item.publishedAt ?? new Date().toISOString();

      const signal: ParsedSignal = {
        headline: title,
        body: description || undefined,
        url: item.url,
        publishedAt,
        category: 'news-article',
        entityNames: this.extractEntityNames(textForEntities),
        domains: [],
        intensity: 0.5,
        confidence: 0.7,
        claims: [],
        rawPayload: item.meta,
      };

      signals.push(signal);
    }

    return signals;
  }

  /**
   * Extracts candidate entity names from text.
   * Includes:
   *   - Title-cased words (e.g. "Nvidia")
   *   - Uppercase acronyms of 3+ characters (e.g. "TSMC")
   * Filters out common stop words.
   */
  extractEntityNames(text: string): string[] {
    const candidates = new Set<string>();

    // Extract title-case words
    for (const match of text.matchAll(TITLE_CASE_WORD_RE)) {
      const word = match[1];
      if (!STOP_WORDS.has(word)) {
        candidates.add(word);
      }
    }

    // Extract uppercase acronyms (3+ chars)
    for (const match of text.matchAll(ACRONYM_RE)) {
      candidates.add(match[1]);
    }

    return Array.from(candidates);
  }

  validate(signal: ParsedSignal): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!signal.headline) {
      errors.push('Missing required field: headline');
    }

    if (!signal.publishedAt) {
      errors.push('Missing required field: publishedAt');
    }

    return { valid: errors.length === 0, errors };
  }
}
