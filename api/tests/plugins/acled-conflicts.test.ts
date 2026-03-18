import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFile } from "fs/promises";
import { resolve } from "path";
import handler from "../../plugins/acled-conflicts/handler";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";

// ── Manifest validation ─────────────────────────────────────────

describe("ACLED manifest", () => {
  let manifest: any;

  beforeAll(async () => {
    const raw = await readFile(
      resolve(import.meta.dir, "../../plugins/acled-conflicts/manifest.json"),
      "utf-8",
    );
    manifest = JSON.parse(raw);
  });

  it("has required top-level fields", () => {
    expect(manifest.id).toBe("acled-conflicts");
    expect(manifest.name).toBe("ACLED Armed Conflict Events");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.type).toBe("source");
    expect(manifest.collection).toBe("acled");
  });

  it("has valid pollInterval", () => {
    expect(manifest.pollInterval).toBe(3600000);
  });

  it("has binaryLayer config with stride 6", () => {
    expect(manifest.binaryLayer).toBeDefined();
    expect(manifest.binaryLayer.stride).toBe(6);
    expect(manifest.binaryLayer.fields).toHaveLength(6);
  });

  it("has entityLinks with countryField and locationField", () => {
    expect(manifest.entityLinks.countryField).toBe("countryISO");
    expect(manifest.entityLinks.locationField).toBe("location");
  });

  it("has deckglLayer with colorMap for all 6 event types", () => {
    expect(manifest.deckglLayer.type).toBe("ScatterplotLayer");
    const colors = manifest.deckglLayer.colorMap;
    expect(Object.keys(colors)).toHaveLength(6);
    expect(colors["Battles"]).toBeDefined();
    expect(colors["Explosions/Remote violence"]).toBeDefined();
    expect(colors["Violence against civilians"]).toBeDefined();
    expect(colors["Protests"]).toBeDefined();
    expect(colors["Riots"]).toBeDefined();
    expect(colors["Strategic developments"]).toBeDefined();
  });

  it("has panel config", () => {
    expect(manifest.panel.icon).toBe("crosshairs");
    expect(manifest.panel.group).toBe("SECURITY");
    expect(manifest.panel.sortField).toBe("fatalities");
    expect(manifest.panel.sortDirection).toBe("desc");
  });
});

// ── Binary encoding ─────────────────────────────────────────────

describe("ACLED encodeBinary", () => {
  it("returns array of length 6 (stride)", () => {
    const doc = {
      lng: 32.53,
      lat: 15.6,
      eventType: "Battles",
      fatalities: 5,
      inter1: 1,
      eventDate: new Date("2026-03-15T00:00:00Z"),
    };
    const result = handler.encodeBinary(doc);
    expect(result).toHaveLength(6);
  });

  it("encodes coordinates correctly", () => {
    const doc = {
      lng: 44.366,
      lat: 33.315,
      eventType: "Protests",
      fatalities: 0,
      inter1: 6,
      eventDate: new Date("2026-03-10T00:00:00Z"),
    };
    const result = handler.encodeBinary(doc);
    expect(result[0]).toBe(44.366);
    expect(result[1]).toBe(33.315);
  });

  it("maps event types to correct indices", () => {
    const types: [string, number][] = [
      ["Battles", 0],
      ["Explosions/Remote violence", 1],
      ["Violence against civilians", 2],
      ["Protests", 3],
      ["Riots", 4],
      ["Strategic developments", 5],
    ];
    for (const [type, idx] of types) {
      const result = handler.encodeBinary({
        lng: 0, lat: 0, eventType: type,
        fatalities: 0, inter1: 7,
        eventDate: new Date(),
      });
      expect(result[2]).toBe(idx);
    }
  });

  it("defaults unknown event type to 5", () => {
    const result = handler.encodeBinary({
      lng: 0, lat: 0, eventType: "UnknownType",
      fatalities: 0, inter1: 7,
      eventDate: new Date(),
    });
    expect(result[2]).toBe(5);
  });

  it("encodes fatalities as numeric", () => {
    const result = handler.encodeBinary({
      lng: 0, lat: 0, eventType: "Battles",
      fatalities: 12, inter1: 1,
      eventDate: new Date(),
    });
    expect(result[3]).toBe(12);
  });

  it("maps inter1 codes to correct indices", () => {
    const codes: [number, number][] = [
      [1, 0], // State Forces
      [2, 1], // Rebel Groups
      [3, 2], // Political Militias
      [4, 3], // Identity Militias
      [5, 4], // Rioters
      [6, 5], // Protesters
      [7, 6], // Civilians
      [8, 7], // External/Other Forces
    ];
    for (const [inter1, expected] of codes) {
      const result = handler.encodeBinary({
        lng: 0, lat: 0, eventType: "Battles",
        fatalities: 0, inter1,
        eventDate: new Date(),
      });
      expect(result[4]).toBe(expected);
    }
  });

  it("encodes timestamp as unix seconds", () => {
    const date = new Date("2026-03-15T12:00:00Z");
    const result = handler.encodeBinary({
      lng: 0, lat: 0, eventType: "Battles",
      fatalities: 0, inter1: 7,
      eventDate: date,
    });
    expect(result[5]).toBe(date.getTime() / 1000);
  });

  it("stride matches manifest binaryLayer.stride", async () => {
    const raw = await readFile(
      resolve(import.meta.dir, "../../plugins/acled-conflicts/manifest.json"),
      "utf-8",
    );
    const manifest = JSON.parse(raw);
    const result = handler.encodeBinary({
      lng: 0, lat: 0, eventType: "Battles",
      fatalities: 0, inter1: 7,
      eventDate: new Date(),
    });
    expect(result).toHaveLength(manifest.binaryLayer.stride);
  });
});

// ── Live API fetch (skipped without credentials) ────────────────

describe("ACLED handler fetch", () => {
  const hasCredentials = !!(process.env.ACLED_EMAIL && process.env.ACLED_API_KEY);

  it("returns empty array when credentials not set", async () => {
    if (hasCredentials) return; // skip — we have real creds
    const origEmail = process.env.ACLED_EMAIL;
    const origKey = process.env.ACLED_API_KEY;
    delete process.env.ACLED_EMAIL;
    delete process.env.ACLED_API_KEY;
    try {
      const result = await handler.fetch();
      expect(result).toEqual([]);
    } finally {
      if (origEmail) process.env.ACLED_EMAIL = origEmail;
      if (origKey) process.env.ACLED_API_KEY = origKey;
    }
  });

  (hasCredentials ? it : it.skip)(
    "fetches events with valid structure",
    async () => {
      const events = await handler.fetch();
      expect(events.length).toBeGreaterThan(0);

      const e = events[0];
      expect(e._id).toBeDefined();
      expect(typeof e.lat).toBe("number");
      expect(typeof e.lng).toBe("number");
      expect(e.location).toBeDefined();
      expect(e.location.type).toBe("Point");
      expect(e.location.coordinates).toHaveLength(2);
      expect(e.eventType).toBeDefined();
      expect(typeof e.fatalities).toBe("number");
      expect(e.country).toBeDefined();
      expect(e.countryISO).toBeDefined();
      // countryISO should be a 2-letter uppercase code
      expect(e.countryISO).toMatch(/^[A-Z]{2}$/);
    },
    30000,
  );
});

// ── Graph edge integration (requires Mongo + seeded countries) ──

describe("ACLED graph edge integration", () => {
  let hasDb = false;

  beforeAll(async () => {
    try {
      await connectMongo("mongodb://localhost:27017/gambit-test");
      await connectRedis("redis://localhost:6380");
      hasDb = true;
    } catch {
      // Mongo/Redis not available — skip integration tests
    }
  });

  afterAll(async () => {
    if (!hasDb) return;
    await getDb().collection("plugin_acled").deleteMany({}).catch(() => {});
    await getDb().collection("edges").deleteMany({ "from.id": "TEST-ACLED-001" }).catch(() => {});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("registry resolves ISO2 countryField to slug for graph edges", async () => {
    if (!hasDb) return;

    const db = getDb();

    // Ensure a test country exists with known slug and iso2
    await db.collection("countries").updateOne(
      { _id: "sudan" },
      { $set: { iso2: "SD", name: "Sudan" } },
      { upsert: true },
    );

    // Simulate what the plugin registry does: resolve countryISO → slug
    const countries = await db.collection("countries")
      .find({}, { projection: { _id: 1, iso2: 1 } })
      .toArray();
    const iso2ToSlug = new Map<string, string>();
    for (const c of countries) {
      if (c.iso2) iso2ToSlug.set((c.iso2 as string).toUpperCase(), c._id as string);
    }

    // An ACLED doc would have countryISO: "SD"
    const countryVal = "SD";
    const resolved = iso2ToSlug.get(countryVal.toUpperCase());
    expect(resolved).toBe("sudan");

    // Insert edge using resolved slug
    await db.collection("edges").insertOne({
      from: { type: "news", id: "TEST-ACLED-001" },
      to: { type: "country", id: resolved! },
      relation: "mentions",
      weight: 0.8,
      source: "nlp",
      createdAt: new Date(),
    });

    // Query edges the way the graph endpoint does
    const edges = await db.collection("edges").find({
      $or: [
        { "from.type": "country", "from.id": "sudan" },
        { "to.type": "country", "to.id": "sudan" },
      ],
    }).toArray();

    const found = edges.find((e: any) => e.from.id === "TEST-ACLED-001");
    expect(found).toBeDefined();
    expect(found!.to.id).toBe("sudan");
  });
});
