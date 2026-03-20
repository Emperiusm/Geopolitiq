import type { ClaimTopic } from "./claim-topics";

type TemplateArgs = { entity: string; value: string; party?: string };

const templates: Record<ClaimTopic, (a: TemplateArgs) => string> = {
  risk: ({ entity, value }) => `${entity} risk level is ${value}`,
  leadership: ({ entity, value }) => `${value} is leader of ${entity}`,
  status: ({ entity, value }) => `${entity} status is ${value}`,
  casualties: ({ entity, value, party }) =>
    party ? `${entity}: ${party} casualties are ${value}` : `${entity} casualties: ${value}`,
  population: ({ entity, value }) => `${entity} population is ${value}`,
  gdp: ({ entity, value }) => `${entity} GDP is ${value}`,
  situation: ({ entity, value }) => `${entity} situation: ${value}`,
  situation_cause: ({ entity, value }) => `${entity} situation cause: ${value}`,
  situation_forecast: ({ entity, value }) => `${entity} forecast: ${value}`,
  alliance: ({ entity, value }) => `${entity} is allied with ${value}`,
  hostility: ({ entity, value }) => `${entity} is hostile to ${value}`,
  sanctions_status: ({ entity, value }) => `${entity} sanctions status: ${value}`,
  enrichment: ({ entity, value }) => `${entity} enrichment level: ${value}`,
  nuclear_capability: ({ entity, value }) => `${entity} nuclear capability: ${value}`,
  military_activity: ({ entity, value }) => `${entity} military activity: ${value}`,
  trade_volume: ({ entity, value }) => `${entity} trade volume: ${value}`,
  oil_volume: ({ entity, value }) => `${entity} oil volume: ${value}`,
  gas_volume: ({ entity, value }) => `${entity} gas volume: ${value}`,
  traffic: ({ entity, value }) => `${entity} traffic: ${value}`,
  strength: ({ entity, value }) => `${entity} strength: ${value}`,
  ideology: ({ entity, value }) => `${entity} ideology: ${value}`,
  territory: ({ entity, value }) => `${entity} territory: ${value}`,
  revenue: ({ entity, value }) => `${entity} revenue: ${value}`,
  funding: ({ entity, value }) => `${entity} funding: ${value}`,
  activities: ({ entity, value }) => `${entity} activities: ${value}`,
  election_result: ({ entity, value }) => `${entity} election result: ${value}`,
  strategic_assessment: ({ entity, value }) => `${entity} strategic assessment: ${value}`,
  attribution: ({ entity, value }) => `${entity} attribution: ${value}`,
  severity: ({ entity, value }) => `${entity} severity: ${value}`,
};

export function generateClaimContent(topic: ClaimTopic, args: TemplateArgs): string {
  const fn = templates[topic];
  return fn(args);
}

export function claimFingerprint(topic: string, content: string, aboutEntity: string): string {
  const normalized = content.toLowerCase().trim();
  const raw = `${topic}:${normalized}:${aboutEntity}`;
  return new Bun.CryptoHasher("sha256").update(raw).digest("hex").slice(0, 16);
}
