import { compress } from "hono/compress";

export const compression = compress({ encoding: "gzip" });
