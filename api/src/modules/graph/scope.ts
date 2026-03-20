// api/src/modules/graph/scope.ts — Team-scoped query building for Neo4j

export interface TeamScope {
  entityTypes: string[] | "*";
  regions: string[] | "*";
}

export function buildScopeClause(scope: TeamScope, varName: string = "n"): string {
  const conditions: string[] = [];
  if (scope.entityTypes !== "*") {
    conditions.push(`${varName}.type IN $allowedTypes`);
  }
  if (scope.regions !== "*") {
    conditions.push(`${varName}.region IN $allowedRegions`);
  }
  return conditions.length > 0 ? conditions.join(" AND ") : "";
}

export function scopeParams(scope: TeamScope): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  if (scope.entityTypes !== "*") params.allowedTypes = scope.entityTypes;
  if (scope.regions !== "*") params.allowedRegions = scope.regions;
  return params;
}

export function defaultScope(): TeamScope {
  return { entityTypes: "*", regions: "*" };
}
