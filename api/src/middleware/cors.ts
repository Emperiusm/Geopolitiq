import { cors } from "hono/cors";

export function createCorsMiddleware() {
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";

  if (isDev) {
    return cors({
      origin: (origin) => (origin?.startsWith("http://localhost") ? origin : null),
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Impersonate-User", "Last-Event-Id"],
      exposeHeaders: [
        "X-Request-Id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
      ],
      maxAge: 86400,
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return cors({
    origin: frontendUrl,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Impersonate-User", "Last-Event-Id"],
    exposeHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
    maxAge: 86400,
  });
}
