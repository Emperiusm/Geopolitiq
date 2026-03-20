/** Closed taxonomy of claim topics. Haiku extraction is constrained to this list. */
export const CLAIM_TOPICS = [
  "risk", "leadership", "status", "casualties", "population", "gdp",
  "situation", "situation_cause", "situation_forecast",
  "alliance", "hostility", "sanctions_status",
  "enrichment", "nuclear_capability", "military_activity",
  "trade_volume", "oil_volume", "gas_volume", "traffic",
  "strength", "ideology", "territory", "revenue", "funding", "activities",
  "election_result", "strategic_assessment",
  "attribution", "severity",
] as const;

export type ClaimTopic = (typeof CLAIM_TOPICS)[number];
