export { recordId, parseRecordId, edgeId, type RecordId } from './record-id';
export { EDGE_MAPPINGS, type EdgeMapping } from './edges';
export { loadConfig, type GambitConfig } from './config';
export { GambitError, EntityNotFoundError, ValidationError, ServiceUnavailableError, DuplicateEntityError, UnauthorizedError, ForbiddenError } from './errors/base';
export { createLogger, type Logger } from './logger';
export type { AuthProvider, AuthUser, AuthApiKey, AuthSession, AuthTeam, AppVariables, UserRole, PlatformRole, TeamTier, ApiKeyScope, AuthMethod } from './types/auth';
export type { Entity, EntityType, EntityEdge, EntityStatus } from './types/entities';
export type { ApiMeta, ApiSuccess, ApiError } from './types/api';
export { entityListSchema, entityResolveSchema, entityBatchSchema, type EntityListParams, type EntityResolveParams, type EntityBatchParams } from './validation/entity';
