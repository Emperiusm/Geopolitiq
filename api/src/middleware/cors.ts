import { cors } from "hono/cors";

export function createCorsMiddleware() {
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  return cors({
    origin: origins,
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key", "Last-Event-Id"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });
}
