import { Hono } from "hono";
import { getSnapshotAt, getSnapshotRange } from "../../infrastructure/snapshots";
import { success, validationError } from "../../helpers/response";

export const timelineRouter = new Hono();

timelineRouter.get("/at", async (c) => {
  const t = c.req.query("t");
  if (!t) return validationError(c, "t is required (ISO 8601 datetime)");

  const at = new Date(t);
  if (isNaN(at.getTime())) return validationError(c, "t must be valid ISO 8601");

  const snapshot = await getSnapshotAt(at);
  if (!snapshot) {
    return success(c, null, { message: "No snapshots before requested time" } as any);
  }

  return success(c, snapshot, {
    requestedAt: t,
    snapshotAt: snapshot.timestamp.toISOString(),
  } as any);
});

timelineRouter.get("/range", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to") ?? new Date().toISOString();
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);

  if (!from) return validationError(c, "from is required (ISO 8601 datetime)");

  const fromDate = new Date(from);
  const toDate = new Date(to);

  if (isNaN(fromDate.getTime())) return validationError(c, "from must be valid ISO 8601");
  if (isNaN(toDate.getTime())) return validationError(c, "to must be valid ISO 8601");

  const snapshots = await getSnapshotRange(fromDate, toDate, limit);

  return success(c, snapshots, {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    count: snapshots.length,
  } as any);
});
