import type { ClaimTopic } from "../seed/claim-topics";

export interface ExtractionResult {
  entities: {
    type: "country" | "person" | "organization" | "event" |
          "sanction" | "treaty" | "military_base" | "vessel";
    name: string;
    role?: string;
    confidence: number;
  }[];
  claims: {
    content: string;
    topic: ClaimTopic;
    aboutEntity: string;
    confidence: number;
  }[];
  relationships: {
    from: string;
    to: string;
    relation: string;
    confidence: number;
  }[];
  eventSummary: string;
  escalationSignal: "escalating" | "de-escalating" | "stable";
}

export interface ClaimNode {
  id: string;
  fingerprint: string;
  content: string;
  topic: ClaimTopic;
  confidence: number;
  status: "active" | "superseded" | "disputed" | "retracted";
  sourceCount: number;
  embedding: number[] | null;
  extractedAt: string;
  agentId: string;
  aboutEntity: string;
}

export interface ClaimResolution {
  action: "created" | "merged" | "superseded" | "disputed" | "corroborated";
  claimId: string;
  aboutEntity: string;
  topic: ClaimTopic;
  oldClaimId?: string;
}

export interface GraphBatchEvent {
  agentId: string;
  entities: { id: string; type: string; label: string; action: "created" | "merged" }[];
  claims: { id: string; topic: string; aboutEntity: string; status: string; action: string }[];
  edges: { from: string; to: string; relation: string; action: "created" | "updated" }[];
  beliefChanges: { entityId: string; topic: string; oldClaimId?: string; newClaimId: string }[];
}
