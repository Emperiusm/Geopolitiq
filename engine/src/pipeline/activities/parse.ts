import type { FetchedItem, ParsedSignal, SourceConfig } from '../types';

export interface ParseActivityResult {
  signals: ParsedSignal[];
  tokensIn: number;
  tokensOut: number;
}

/**
 * Parse activity — routes to structured parser, agent parser, or hybrid based on source.parserMode.
 * If source.parserRouting is present, items may be routed individually by routing key.
 */
export async function parseActivity(
  items: FetchedItem[],
  source: SourceConfig,
): Promise<ParseActivityResult> {
  const { createLogger } = await import('@gambit/common');
  const logger = createLogger('parse-activity');

  if (items.length === 0) {
    return { signals: [], tokensIn: 0, tokensOut: 0 };
  }

  const mode = source.parserMode;

  // Per-item routing: if parserRouting is present, split items by routing key
  if (source.parserRouting && Object.keys(source.parserRouting).length > 0) {
    return _routedParse(items, source, logger);
  }

  switch (mode) {
    case 'structured':
      return _structuredParse(items, source, logger);
    case 'agent':
      return _agentParse(items, source, logger);
    case 'hybrid':
      return _hybridParse(items, source, logger);
    default:
      logger.warn({ sourceId: source.id, mode }, 'Unknown parserMode, falling back to structured');
      return _structuredParse(items, source, logger);
  }
}

async function _structuredParse(
  items: FetchedItem[],
  source: SourceConfig,
  logger: any,
): Promise<ParseActivityResult> {
  const { ParserRegistry } = await import('../../parsers/registry');
  const { RssParser } = await import('../../parsers/rss-parser');

  const registry = new ParserRegistry();
  // Register built-in parsers
  const rssParser = new RssParser();
  registry.register('rss', rssParser);
  registry.register('rss-parser', rssParser);

  const ref = source.parserRef;
  if (!ref) {
    logger.warn({ sourceId: source.id }, 'parserMode=structured but no parserRef — falling back to rss');
  }

  const parserRef = ref && registry.has(ref) ? ref : 'rss';
  const parser = registry.get(parserRef);

  // Structured parsers expect a FetchResult-shaped object
  const fakeResult = {
    items,
    fetchState: source.fetcherState ?? {},
    metadata: { itemCount: items.length, httpStatus: 200 },
  };

  const signals = parser.parse(fakeResult);
  return { signals, tokensIn: 0, tokensOut: 0 };
}

async function _agentParse(
  items: FetchedItem[],
  source: SourceConfig,
  _logger: any,
): Promise<ParseActivityResult> {
  const { AgentParser } = await import('../../parsers/agent-parser');
  const { createLogger } = await import('@gambit/common');
  const agentLogger = createLogger('agent-parser');
  const parser = new AgentParser(agentLogger);
  const result = await parser.parse(items, source);
  return { signals: result.signals, tokensIn: result.tokensIn, tokensOut: result.tokensOut };
}

async function _hybridParse(
  items: FetchedItem[],
  source: SourceConfig,
  logger: any,
): Promise<ParseActivityResult> {
  // Try structured first; fall back to agent if no signals produced
  const structured = await _structuredParse(items, source, logger);
  if (structured.signals.length > 0) {
    return structured;
  }
  logger.info({ sourceId: source.id }, 'Hybrid: structured produced 0 signals, falling back to agent');
  return _agentParse(items, source, logger);
}

async function _routedParse(
  items: FetchedItem[],
  source: SourceConfig,
  logger: any,
): Promise<ParseActivityResult> {
  // Routing map: key → parser mode override
  const routing = source.parserRouting!;
  const allSignals: ParsedSignal[] = [];
  let totalTokensIn = 0;
  let totalTokensOut = 0;

  // Group items by routing key (derived from item.meta?.routingKey or default)
  const groups = new Map<string, FetchedItem[]>();
  for (const item of items) {
    const key = (item.meta?.routingKey as string | undefined) ?? 'default';
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  for (const [key, groupItems] of groups) {
    const modeOverride = (routing[key] as string | undefined) ?? source.parserMode;
    const routedSource = { ...source, parserMode: modeOverride };

    let result: ParseActivityResult;
    switch (modeOverride) {
      case 'agent':
        result = await _agentParse(groupItems, routedSource, logger);
        break;
      case 'hybrid':
        result = await _hybridParse(groupItems, routedSource, logger);
        break;
      default:
        result = await _structuredParse(groupItems, routedSource, logger);
    }

    allSignals.push(...result.signals);
    totalTokensIn += result.tokensIn;
    totalTokensOut += result.tokensOut;
  }

  return { signals: allSignals, tokensIn: totalTokensIn, tokensOut: totalTokensOut };
}
