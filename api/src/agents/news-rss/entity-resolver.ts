import { readTx, writeTx } from "../../infrastructure/neo4j";

export interface ResolvedEntity {
  id: string;
  label: string;
  isNew: boolean;
}

export async function resolveEntity(
  name: string,
  type: string,
  confidence: number,
  _agentId: string
): Promise<ResolvedEntity> {
  // Step 1: Exact alias lookup
  const aliasResult = await readTx(async (tx) => {
    const res = await tx.run(
      `MATCH (a:Alias {alias: $name}) RETURN a.canonical AS canonical`,
      { name }
    );
    return res.records[0]?.get("canonical") as string | undefined;
  });

  if (aliasResult) {
    const label = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $id}) RETURN e.label AS label`,
        { id: aliasResult }
      );
      return (res.records[0]?.get("label") as string) ?? name;
    });
    return { id: aliasResult, label, isNew: false };
  }

  // Step 2: Fuzzy label match (case-insensitive)
  const fuzzyResult = await readTx(async (tx) => {
    const res = await tx.run(
      `MATCH (e:Entity)
       WHERE toLower(e.label) = toLower($name)
       RETURN e.id AS id, e.label AS label
       LIMIT 1`,
      { name }
    );
    if (res.records.length === 0) return null;
    return {
      id: res.records[0].get("id") as string,
      label: res.records[0].get("label") as string,
    };
  });

  if (fuzzyResult) {
    await writeTx(async (tx) => {
      await tx.run(
        `MERGE (a:Alias {alias: $name}) ON CREATE SET a.canonical = $canonical`,
        { name, canonical: fuzzyResult.id }
      );
    });
    return { ...fuzzyResult, isNew: false };
  }

  // Step 3: Create new entity
  const labelMap: Record<string, string> = {
    country: "Country",
    person: "Person",
    organization: "Organization",
    event: "Event",
    sanction: "Sanction",
    treaty: "Treaty",
    military_base: "MilitaryBase",
  };
  const neoLabel = labelMap[type] ?? "Entity";
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const prefix = type === "organization" ? "org" : type;
  const id = `${prefix}:${slug}`;

  await writeTx(async (tx) => {
    await tx.run(
      `MERGE (e:${neoLabel}:Entity {id: $id})
       ON CREATE SET e.label = $label, e.type = $type, e.confidence = $confidence,
         e.source = "agent", e.firstSeen = datetime(), e.lastUpdated = datetime()`,
      { id, label: name, type, confidence }
    );
    await tx.run(
      `MERGE (a:Alias {alias: $name}) ON CREATE SET a.canonical = $id`,
      { name, id }
    );
  });

  return { id, label: name, isNew: true };
}
