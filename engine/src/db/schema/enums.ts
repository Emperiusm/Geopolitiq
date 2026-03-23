import { pgEnum } from 'drizzle-orm/pg-core';

export const entityTypeEnum = pgEnum('entity_type', [
  'company', 'country', 'government', 'organization', 'person',
  'conflict', 'chokepoint', 'base', 'trade-route', 'port', 'nsa', 'election',
]);

export const entityStatusEnum = pgEnum('entity_status', [
  'active', 'acquired', 'dissolved', 'merged', 'inactive', 'unverified',
]);

export const polarityEnum = pgEnum('signal_polarity', [
  'declarative', 'behavioral',
]);

export const teamTierEnum = pgEnum('team_tier', ['free', 'pro', 'enterprise']);

export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'member', 'viewer']);

export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warning', 'critical']);

export const verificationEnum = pgEnum('verification_status', [
  'unverified', 'verified', 'disputed', 'retracted', 'needs-review',
]);

export const parserModeEnum = pgEnum('parser_mode', [
  'structured', 'agent', 'token', 'hybrid',
]);
