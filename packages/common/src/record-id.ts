export type RecordId = `${string}:${string}`;

export function recordId(type: string, slug: string): RecordId {
  return `${type}:${slug}` as RecordId;
}

export function parseRecordId(id: RecordId | string): { type: string; slug: string } {
  const colonIdx = id.indexOf(':');
  if (colonIdx === -1) throw new Error(`Invalid record ID: ${id}`);
  return {
    type: id.slice(0, colonIdx),
    slug: id.slice(colonIdx + 1),
  };
}

export function edgeId(fromId: string, relation: string, toId: string): string {
  return `edge--${fromId}--${relation}--${toId}`;
}
