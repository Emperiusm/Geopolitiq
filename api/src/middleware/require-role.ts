import type { MiddlewareHandler } from "hono";
import { roleLevel } from "../infrastructure/auth";
import type { UserRole } from "../types/auth";

export function requireRole(minimumRole: UserRole): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get("role") as UserRole;
    if (roleLevel(userRole) < roleLevel(minimumRole)) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `Requires ${minimumRole} role or higher`,
            action: "none",
          },
        },
        403,
      );
    }
    return next();
  };
}
