export class GambitError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'GambitError';
  }
}

export class EntityNotFoundError extends GambitError {
  constructor(id: string) {
    super('ENTITY_NOT_FOUND', `Entity ${id} not found`, 404, { id });
  }
}

export class ValidationError extends GambitError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, context);
  }
}

export class DuplicateEntityError extends GambitError {
  constructor(id: string) {
    super('DUPLICATE_ENTITY', `Entity ${id} already exists`, 409, { id });
  }
}

export class UnauthorizedError extends GambitError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends GambitError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class ServiceUnavailableError extends GambitError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', `${service} is not available`, 503, { service });
  }
}
