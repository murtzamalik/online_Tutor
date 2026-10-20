import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { apiFetch, EmptyResponseSchema, SchemaParseError } from "./client";

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws SchemaParseError on 200 JSON that fails schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ unexpected: true }),
      }),
    );

    await expect(
      apiFetch("/test", {
        method: "GET",
        schema: z.object({ requiredField: z.string() }),
      }),
    ).rejects.toBeInstanceOf(SchemaParseError);
  });

  it("resolves empty 200 body with EmptyResponseSchema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "",
      }),
    );

    await expect(
      apiFetch("/test", { method: "POST", schema: EmptyResponseSchema }),
    ).resolves.toBeUndefined();
  });

  it("resolves 204 with EmptyResponseSchema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => "",
      }),
    );

    await expect(
      apiFetch("/auth/logout", { method: "POST", schema: EmptyResponseSchema }),
    ).resolves.toBeUndefined();
  });
});
