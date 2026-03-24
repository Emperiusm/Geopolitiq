import { recordId } from '@gambit/common';

export interface InferredEdge {
  fromId: string;
  toId: string;
  relation: string;
  weight: string;
  source: string;
}

export function inferNsaConflictEdges(nsaDocs: any[], conflictDocs: any[]): InferredEdge[] {
  const inferred: InferredEdge[] = [];
  for (const nsa of nsaDocs) {
    const nsaCountries = new Set([
      ...(nsa.allies ?? []).map((a: string) => a.toLowerCase()),
      ...(nsa.rivals ?? []).map((r: string) => r.toLowerCase()),
    ]);
    for (const conflict of conflictDocs) {
      const conflictCountries = new Set(
        (conflict.relatedCountries ?? []).map((c: string) => c.toLowerCase()),
      );
      const overlap = [...nsaCountries].filter((c) => conflictCountries.has(c));
      if (overlap.length > 0) {
        inferred.push({
          fromId: recordId('nsa', nsa._id),
          toId: recordId('conflict', conflict._id),
          relation: 'participates-in',
          weight: Math.min(0.3 + overlap.length * 0.2, 0.9).toString(),
          source: 'inferred',
        });
      }
    }
  }
  return inferred;
}

export function inferConflictChokepointEdges(
  conflictDocs: any[],
  chokepointDocs: any[],
): InferredEdge[] {
  const inferred: InferredEdge[] = [];
  for (const conflict of conflictDocs) {
    if (conflict.status === 'resolved') continue;
    const conflictCountries = new Set(
      (conflict.relatedCountries ?? []).map((c: string) => c.toLowerCase()),
    );
    for (const cp of chokepointDocs) {
      const cpCountries = new Set(
        (cp.dependentCountries ?? []).map((c: string) => c.toLowerCase()),
      );
      const overlap = [...conflictCountries].filter((c) => cpCountries.has(c));
      if (overlap.length > 0) {
        inferred.push({
          fromId: recordId('conflict', conflict._id),
          toId: recordId('chokepoint', cp._id),
          relation: 'disrupts',
          weight: (conflict.status === 'active' ? 0.8 : 0.4).toString(),
          source: 'inferred',
        });
      }
    }
  }
  return inferred;
}
