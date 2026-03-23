export interface ResolverContext {
  countriesByIso2: Map<string, string>;
  countriesByName: Map<string, string>;
}

export function buildResolverContext(
  entities: { id: string; type: string; iso2?: string | null; name: string }[],
): ResolverContext {
  const ctx: ResolverContext = {
    countriesByIso2: new Map(),
    countriesByName: new Map(),
  };
  for (const e of entities) {
    if (e.type === 'country') {
      if (e.iso2) ctx.countriesByIso2.set(e.iso2.toUpperCase(), e.id);
      ctx.countriesByName.set(e.name.toLowerCase(), e.id);
    }
  }
  return ctx;
}

export type TargetResolver = (value: string, ctx: ResolverContext) => string | null;

export const TARGET_RESOLVERS: Record<string, TargetResolver> = {
  'iso2-or-name': (value, ctx) => {
    return (
      ctx.countriesByIso2.get(value.toUpperCase()) ??
      ctx.countriesByName.get(value.toLowerCase()) ??
      null
    );
  },
  'country-name': (value, ctx) => {
    return (
      ctx.countriesByName.get(value.toLowerCase()) ??
      ctx.countriesByIso2.get(value.toUpperCase()) ??
      null
    );
  },
};
