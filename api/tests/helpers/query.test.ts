// api/tests/helpers/query.test.ts
import { describe, it, expect } from "bun:test";
import { parseListParams, parseSparseFields } from "../../src/helpers/query";

describe("Query helpers", () => {
  it("parses pagination defaults", () => {
    const params = parseListParams(new URLSearchParams());
    expect(params.limit).toBe(50);
    expect(params.offset).toBe(0);
  });

  it("parses pagination from query", () => {
    const params = parseListParams(new URLSearchParams("limit=10&offset=20"));
    expect(params.limit).toBe(10);
    expect(params.offset).toBe(20);
  });

  it("caps limit at 200", () => {
    const params = parseListParams(new URLSearchParams("limit=999"));
    expect(params.limit).toBe(200);
  });

  it("parses sparse fields", () => {
    const fields = parseSparseFields("name,lat,lng,risk");
    expect(fields).toEqual({ name: 1, lat: 1, lng: 1, risk: 1 });
  });

  it("returns null for empty fields param", () => {
    const fields = parseSparseFields(undefined);
    expect(fields).toBeNull();
  });
});
