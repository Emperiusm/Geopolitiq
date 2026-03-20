import { writeTx, readTx } from "./neo4j";
import { embed } from "./ollama";
import { publishEvent } from "./sse";
import { resolutionScore } from "../agents/confidence";
import type { ClaimNode, ClaimResolution, GraphBatchEvent } from "../agents/types";
import type { SourceTier } from "../types";

/**
 * Writes a batch of claims to Neo4j and publishes SSE events for graph mutations.
 *
 * For each claim:
 * 1. Fingerprint dedup — if exists, increment sourceCount + add SOURCED_FROM edge
 * 2. Write new claim node
 * 3. Belief resolution — create/supersede/corroborate CURRENT_BELIEF
 * 4. Publish SSE events
 */
export async function writeClaimBatch(
  claims: ClaimNode[],
  articleIds: string[],
  agentId: string,
  sourceTier: SourceTier,
): Promise<ClaimResolution[]> {
  const resolutions: ClaimResolution[] = [];
  const batchEvent: GraphBatchEvent = {
    agentId,
    entities: [],
    claims: [],
    edges: [],
    beliefChanges: [],
  };

  for (const claim of claims) {
    // Embed claim content (returns null if Ollama unavailable)
    const embedding = await embed(claim.content);
    claim.embedding = embedding;

    // Step 1: Fingerprint dedup check
    const existing = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (c:Claim {fingerprint: $fp}) RETURN c.id AS id, c.sourceCount AS sourceCount`,
        { fp: claim.fingerprint },
      );
      if (res.records.length === 0) return null;
      return {
        id: res.records[0].get("id") as string,
        sourceCount: (res.records[0].get("sourceCount") as number) ?? 1,
      };
    });

    if (existing) {
      // Merge: increment sourceCount and add SOURCED_FROM edges
      await writeTx(async (tx) => {
        await tx.run(
          `MATCH (c:Claim {id: $id})
           SET c.sourceCount = $count, c.lastUpdated = datetime()`,
          { id: existing.id, count: existing.sourceCount + articleIds.length },
        );
        for (const articleId of articleIds) {
          await tx.run(
            `MATCH (c:Claim {id: $claimId})
             MERGE (a:Article {id: $articleId})
             MERGE (c)-[:SOURCED_FROM]->(a)`,
            { claimId: existing.id, articleId },
          );
        }
      });

      resolutions.push({
        action: "merged",
        claimId: existing.id,
        aboutEntity: claim.aboutEntity,
        topic: claim.topic,
      });

      batchEvent.claims.push({
        id: existing.id,
        topic: claim.topic,
        aboutEntity: claim.aboutEntity,
        status: "active",
        action: "merged",
      });

      continue;
    }

    // Step 2: Write new claim node
    await writeTx(async (tx) => {
      await tx.run(
        `CREATE (c:Claim {
           id: $id, fingerprint: $fp, content: $content, topic: $topic,
           confidence: $confidence, status: $status, sourceCount: $sourceCount,
           embedding: $embedding, extractedAt: datetime($extractedAt),
           agentId: $agentId, aboutEntity: $aboutEntity,
           createdAt: datetime(), lastUpdated: datetime()
         })`,
        {
          id: claim.id,
          fp: claim.fingerprint,
          content: claim.content,
          topic: claim.topic,
          confidence: claim.confidence,
          status: claim.status,
          sourceCount: claim.sourceCount,
          embedding: embedding,
          extractedAt: claim.extractedAt,
          agentId: claim.agentId,
          aboutEntity: claim.aboutEntity,
        },
      );
      // Link claim to its entity
      await tx.run(
        `MATCH (e:Entity {label: $entity})
         MATCH (c:Claim {id: $claimId})
         MERGE (c)-[:ABOUT]->(e)`,
        { entity: claim.aboutEntity, claimId: claim.id },
      );
      // Link claim to source articles
      for (const articleId of articleIds) {
        await tx.run(
          `MATCH (c:Claim {id: $claimId})
           MERGE (a:Article {id: $articleId})
           MERGE (c)-[:SOURCED_FROM]->(a)`,
          { claimId: claim.id, articleId },
        );
      }
    });

    batchEvent.claims.push({
      id: claim.id,
      topic: claim.topic,
      aboutEntity: claim.aboutEntity,
      status: claim.status,
      action: "created",
    });

    // Step 3: Belief resolution — check CURRENT_BELIEF for same entity + topic
    const currentBelief = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {label: $entity})-[:CURRENT_BELIEF]->(c:Claim {topic: $topic})
         RETURN c.id AS id, c.confidence AS confidence, c.sourceCount AS sourceCount,
                e.id AS entityId, e.type AS entityType, e.label AS entityLabel,
                e.lat AS lat, e.lng AS lng`,
        { entity: claim.aboutEntity, topic: claim.topic },
      );
      if (res.records.length === 0) return null;
      const r = res.records[0];
      return {
        id: r.get("id") as string,
        confidence: r.get("confidence") as number,
        sourceCount: (r.get("sourceCount") as number) ?? 1,
        entityId: r.get("entityId") as string,
        entityType: r.get("entityType") as string,
        entityLabel: r.get("entityLabel") as string,
        lat: r.get("lat") as number | null,
        lng: r.get("lng") as number | null,
      };
    });

    if (!currentBelief) {
      // No existing belief — this claim becomes current
      await writeTx(async (tx) => {
        await tx.run(
          `MATCH (e:Entity {label: $entity})
           MATCH (c:Claim {id: $claimId})
           MERGE (e)-[:CURRENT_BELIEF]->(c)`,
          { entity: claim.aboutEntity, claimId: claim.id },
        );
      });

      resolutions.push({
        action: "created",
        claimId: claim.id,
        aboutEntity: claim.aboutEntity,
        topic: claim.topic,
      });

      // Look up entity info for SSE event
      const entityInfo = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {label: $entity})
           RETURN e.id AS entityId, e.type AS entityType, e.lat AS lat, e.lng AS lng`,
          { entity: claim.aboutEntity },
        );
        if (res.records.length === 0) return null;
        const r = res.records[0];
        return {
          entityId: r.get("entityId") as string,
          entityType: r.get("entityType") as string,
          lat: r.get("lat") as number | null,
          lng: r.get("lng") as number | null,
        };
      });

      batchEvent.beliefChanges.push({
        entityId: entityInfo?.entityId ?? claim.aboutEntity,
        topic: claim.topic,
        newClaimId: claim.id,
      });

      await publishEvent("graph:belief-updated", {
        entityId: entityInfo?.entityId ?? claim.aboutEntity,
        entityLabel: claim.aboutEntity,
        entityType: entityInfo?.entityType ?? "unknown",
        lat: entityInfo?.lat ?? null,
        lng: entityInfo?.lng ?? null,
        topic: claim.topic,
        newClaimId: claim.id,
        action: "created",
      });
    } else {
      const newScore = resolutionScore(claim.confidence, sourceTier, claim.sourceCount);
      const oldScore = resolutionScore(currentBelief.confidence, sourceTier, currentBelief.sourceCount);

      if (newScore > oldScore) {
        // Supersede: move CURRENT_BELIEF, mark old as superseded, create SUPERSEDES edge
        await writeTx(async (tx) => {
          // Remove old CURRENT_BELIEF
          await tx.run(
            `MATCH (e:Entity {label: $entity})-[r:CURRENT_BELIEF]->(c:Claim {id: $oldId})
             DELETE r`,
            { entity: claim.aboutEntity, oldId: currentBelief.id },
          );
          // Mark old claim as superseded
          await tx.run(
            `MATCH (c:Claim {id: $oldId})
             SET c.status = "superseded", c.lastUpdated = datetime()`,
            { oldId: currentBelief.id },
          );
          // Create SUPERSEDES edge
          await tx.run(
            `MATCH (newC:Claim {id: $newId})
             MATCH (oldC:Claim {id: $oldId})
             MERGE (newC)-[:SUPERSEDES]->(oldC)`,
            { newId: claim.id, oldId: currentBelief.id },
          );
          // Set new CURRENT_BELIEF
          await tx.run(
            `MATCH (e:Entity {label: $entity})
             MATCH (c:Claim {id: $newId})
             MERGE (e)-[:CURRENT_BELIEF]->(c)`,
            { entity: claim.aboutEntity, newId: claim.id },
          );
        });

        resolutions.push({
          action: "superseded",
          claimId: claim.id,
          aboutEntity: claim.aboutEntity,
          topic: claim.topic,
          oldClaimId: currentBelief.id,
        });

        batchEvent.beliefChanges.push({
          entityId: currentBelief.entityId,
          topic: claim.topic,
          oldClaimId: currentBelief.id,
          newClaimId: claim.id,
        });

        await publishEvent("graph:belief-updated", {
          entityId: currentBelief.entityId,
          entityLabel: currentBelief.entityLabel,
          entityType: currentBelief.entityType,
          lat: currentBelief.lat,
          lng: currentBelief.lng,
          topic: claim.topic,
          oldClaimId: currentBelief.id,
          newClaimId: claim.id,
          action: "superseded",
        });
      } else {
        // Corroborate: create SUPPORTS edge
        await writeTx(async (tx) => {
          await tx.run(
            `MATCH (newC:Claim {id: $newId})
             MATCH (oldC:Claim {id: $oldId})
             MERGE (newC)-[:SUPPORTS]->(oldC)`,
            { newId: claim.id, oldId: currentBelief.id },
          );
        });

        resolutions.push({
          action: "corroborated",
          claimId: claim.id,
          aboutEntity: claim.aboutEntity,
          topic: claim.topic,
          oldClaimId: currentBelief.id,
        });

        batchEvent.edges.push({
          from: claim.id,
          to: currentBelief.id,
          relation: "SUPPORTS",
          action: "created",
        });
      }
    }
  }

  // Publish batch event for all mutations
  if (batchEvent.claims.length > 0 || batchEvent.beliefChanges.length > 0) {
    await publishEvent("graph:batch", batchEvent);
  }

  return resolutions;
}
