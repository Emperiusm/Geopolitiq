export interface PredicateConfig {
  subjectType: 'entity';
  objectType: 'entity' | 'concept';
}

export const PREDICATE_REGISTRY: Record<string, PredicateConfig> = {
  'filed-patent': { subjectType: 'entity', objectType: 'concept' },
  'filed-patent-for': { subjectType: 'entity', objectType: 'concept' },
  'cites-patent': { subjectType: 'entity', objectType: 'entity' },
  'builds-on-ip-of': { subjectType: 'entity', objectType: 'entity' },
  'acquired': { subjectType: 'entity', objectType: 'entity' },
  'partnered-with': { subjectType: 'entity', objectType: 'entity' },
  'invested-in': { subjectType: 'entity', objectType: 'entity' },
  'filed-with': { subjectType: 'entity', objectType: 'entity' },
  'lobbied-for': { subjectType: 'entity', objectType: 'concept' },
  'awarded-contract': { subjectType: 'entity', objectType: 'entity' },
  'hired': { subjectType: 'entity', objectType: 'entity' },
  'published-research': { subjectType: 'entity', objectType: 'concept' },
  'authorized-equipment': { subjectType: 'entity', objectType: 'concept' },
  'registered-trademark': { subjectType: 'entity', objectType: 'concept' },
  'insider-transaction': { subjectType: 'entity', objectType: 'entity' },
  'regulates': { subjectType: 'entity', objectType: 'entity' },
  'supplies': { subjectType: 'entity', objectType: 'entity' },
  'competes-with': { subjectType: 'entity', objectType: 'entity' },
};

export function getPredicateConfig(predicate: string): PredicateConfig {
  return PREDICATE_REGISTRY[predicate] ?? { subjectType: 'entity', objectType: 'entity' };
}
