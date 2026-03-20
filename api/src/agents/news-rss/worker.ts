import Anthropic from "@anthropic-ai/sdk";
import { DelayedError } from "bullmq";
import type { Job } from "bullmq";
import { registerWorker } from "../../infrastructure/queue";
import { getDb } from "../../infrastructure/mongo";
import { publishEvent } from "../../infrastructure/sse";
import { writeClaimBatch } from "../../infrastructure/graph-writer";
import { buildSinglePrompt, buildClusterPrompt, buildEntityContext } from "./prompt";
import { generateClaims } from "./claim-generator";
import { resolveEntity, type ResolvedEntity } from "./entity-resolver";
import { regexExtract } from "./fallback";
import { adjustConfidence } from "../confidence";
import type { ExtractionResult } from "../types";
import type { SourceTier } from "../../types";

const MODEL = "claude-haiku-4-5-20251001";
const AGENT_ID = "news-rss";

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropic) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
    anthropic = new Anthropic({ apiKey });
  }
  return anthropic;
}

/** Load known entities from MongoDB for prompt context */
async function loadEntityContext(): Promise<string> {
  const db = getDb();
  const [countries, orgs, conflicts] = await Promise.all([
    db.collection("countries").find({}, { projection: { name: 1, iso2: 1 } }).toArray(),
    db.collection("nsa").find({}, { projection: { name: 1 } }).toArray(),
    db.collection("conflicts").find({}, { projection: { title: 1 } }).toArray(),
  ]);
  return buildEntityContext(
    countries.map((c) => ({ name: c.name as string, iso2: c.iso2 as string })),
    orgs.map((o) => ({ name: o.name as string })),
    conflicts.map((c) => ({ title: c.title as string })),
  );
}

/** Call Haiku to extract structured data from article(s) */
async function callHaiku(
  systemPrompt: string,
  userContent: string,
): Promise<ExtractionResult> {
  const client = getAnthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Haiku");
  }

  // Strip markdown fences if present
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr) as ExtractionResult;
}

/** Process a single job from the news extraction queue */
async function processJob(job: Job): Promise<void> {
  const { articles, sourceTier } = job.data as {
    articles: Array<{
      _id: string;
      title: string;
      summary: string;
      source?: string;
      relatedCountries: string[];
      relatedChokepoints: string[];
      relatedNSA: string[];
    }>;
    sourceTier: SourceTier;
  };

  const startTime = Date.now();
  const articleIds = articles.map((a) => a._id);
  const isCluster = articles.length > 1;

  let extraction: ExtractionResult;

  try {
    const entityContext = await loadEntityContext();
    const systemPrompt = isCluster
      ? buildClusterPrompt(entityContext)
      : buildSinglePrompt(entityContext);

    const userContent = isCluster
      ? articles.map((a, i) => `### Source ${i + 1}: ${a.source ?? "Unknown"}\nTitle: ${a.title}\n${a.summary}`).join("\n\n")
      : `Title: ${articles[0].title}\n${articles[0].summary}`;

    extraction = await callHaiku(systemPrompt, userContent);
  } catch (err: any) {
    // Handle 429 rate limit
    if (err?.status === 429 || err?.error?.type === "rate_limit_error") {
      const retryAfter = Number(err?.headers?.["retry-after"] ?? 30);
      console.warn(`[news-worker] Rate limited, delaying ${retryAfter}s`);
      await job.changeDelay(retryAfter * 1000);
      throw new DelayedError();
    }

    // Fallback to regex extraction
    console.warn(`[news-worker] Haiku call failed, falling back to regex:`, err?.message);
    const a = articles[0];
    extraction = regexExtract(
      a.title,
      a.summary,
      a.relatedCountries ?? [],
      a.relatedChokepoints ?? [],
      a.relatedNSA ?? [],
    );
  }

  // Adjust confidence by source tier
  for (const entity of extraction.entities) {
    entity.confidence = adjustConfidence(entity.confidence, sourceTier);
  }
  for (const claim of extraction.claims) {
    claim.confidence = adjustConfidence(claim.confidence, sourceTier);
  }
  for (const rel of extraction.relationships) {
    rel.confidence = adjustConfidence(rel.confidence, sourceTier);
  }

  // Resolve entities in Neo4j
  const resolvedEntities: ResolvedEntity[] = [];
  for (const entity of extraction.entities) {
    try {
      const resolved = await resolveEntity(
        entity.name,
        entity.type,
        entity.confidence,
        AGENT_ID,
      );
      resolvedEntities.push(resolved);
    } catch (err: any) {
      console.warn(`[news-worker] Entity resolution failed for "${entity.name}":`, err?.message);
    }
  }

  // Generate claims
  const claims = generateClaims(extraction, AGENT_ID, articleIds);

  // Write claims to Neo4j graph
  const resolutions = await writeClaimBatch(claims, articleIds, AGENT_ID, sourceTier);

  const latencyMs = Date.now() - startTime;

  // Publish agent extraction event
  await publishEvent("agent:extraction", {
    agentId: AGENT_ID,
    articleIds,
    entityCount: resolvedEntities.length,
    claimCount: claims.length,
    resolutions: resolutions.map((r) => r.action),
    escalationSignal: extraction.escalationSignal,
    latencyMs,
  });

  // Update agent metrics in MongoDB
  const db = getDb();
  await db.collection("agent_registry").updateOne(
    { id: AGENT_ID },
    {
      $inc: {
        "performance.totalProcessed": articles.length,
        "performance.claimsPerDoc": claims.length,
        "performance.entitiesPerDoc": resolvedEntities.length,
      },
      $set: {
        "performance.lastProcessedAt": new Date(),
        "performance.avgLatencyMs": latencyMs,
      },
    },
  );

  // Mark articles as processed
  await db.collection("news").updateMany(
    { _id: { $in: articleIds } },
    { $set: { agentProcessed: true, agentProcessedAt: new Date() } },
  );

  console.log(
    `[news-worker] Processed ${articles.length} article(s): ` +
    `${resolvedEntities.length} entities, ${claims.length} claims, ${latencyMs}ms`,
  );
}

/** Start the BullMQ worker for the news extraction queue */
export function startNewsWorker(): void {
  registerWorker("news-extraction", processJob, { concurrency: 1 });
  console.log("[news-worker] Worker started on queue 'news-extraction'");
}
