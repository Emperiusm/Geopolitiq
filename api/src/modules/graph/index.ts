// api/src/modules/graph/index.ts — Mount all graph query sub-routers
import { Hono } from "hono";
import type { AppVariables } from "../../types/auth";
import { entityRouter } from "./entity";
import { connectionsRouter } from "./connections";
import { claimsRouter } from "./claims";
import { pathsRouter } from "./paths";
import { graphSearchRouter } from "./search";
import { graphViewportRouter } from "./viewport";
import { statsRouter } from "./stats";
import { disputedRouter } from "./disputed";

export const graphApiRouter = new Hono<{ Variables: AppVariables }>();

graphApiRouter.route("/entity", entityRouter);
graphApiRouter.route("/connections", connectionsRouter);
graphApiRouter.route("/claims", claimsRouter);
graphApiRouter.route("/paths", pathsRouter);
graphApiRouter.route("/search", graphSearchRouter);
graphApiRouter.route("/viewport", graphViewportRouter);
graphApiRouter.route("/stats", statsRouter);
graphApiRouter.route("/disputed", disputedRouter);
