import type { MiddlewareHandler } from "hono";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const scopeCheck: MiddlewareHandler = async (c, next) => {
  const authMethod = c.get("authMethod") as string;
  if (authMethod !== "apikey") return next();

  const scope = c.get("scope") as string;
  if (scope === "read" && MUTATION_METHODS.has(c.req.method)) {
    return c.json(
      {
        error: {
          code: "SCOPE_INSUFFICIENT",
          message: "This API key has read-only access",
          action: "none",
        },
      },
      403,
    );
  }

  return next();
};
