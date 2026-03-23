import type { FetchResult, ParsedSignal } from '../pipeline/types';

export interface Parser {
  sourceId: string;
  parse(raw: FetchResult): ParsedSignal[];
  validate?(signal: ParsedSignal): { valid: boolean; errors: string[] };
}

export class ParserRegistry {
  private parsers = new Map<string, Parser>();

  register(ref: string, parser: Parser): void {
    this.parsers.set(ref, parser);
  }

  get(ref: string): Parser {
    const parser = this.parsers.get(ref);
    if (!parser) throw new Error(`No parser registered for ref: ${ref}`);
    return parser;
  }

  has(ref: string): boolean {
    return this.parsers.has(ref);
  }
}
