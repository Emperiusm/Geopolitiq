import type { MiddlewareHandler } from "hono";

export function requirePlatformAdmin(): MiddlewareHandler {
  return async (c, next) => {
    const platformRole = c.get("platformRole") as string;
    if (platformRole !== "admin") {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Platform admin access required",
            action: "none",
          },
        },
        403,
      );
    }
    return next();
  };
}
