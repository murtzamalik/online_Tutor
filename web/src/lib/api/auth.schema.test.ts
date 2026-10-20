import { describe, expect, it } from "vitest";
import { TokenResponseSchema } from "./auth";

describe("TokenResponseSchema (Jackson non_null)", () => {
  it("parses success login without mfaChallengeToken key", () => {
    const parsed = TokenResponseSchema.parse({
      accessToken: "access.jwt",
      refreshToken: "refresh.jwt",
      tokenType: "Bearer",
      expiresInSeconds: 900,
      mfaRequired: false,
    });
    expect(parsed.accessToken).toBe("access.jwt");
    expect(parsed.mfaChallengeToken).toBeUndefined();
  });

  it("parses MFA challenge without access/refresh tokens", () => {
    const parsed = TokenResponseSchema.parse({
      tokenType: "Bearer",
      expiresInSeconds: 0,
      mfaRequired: true,
      mfaChallengeToken: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(parsed.mfaRequired).toBe(true);
    expect(parsed.mfaChallengeToken).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed.accessToken).toBeUndefined();
  });

  it("parses explicit null token fields when backend sends them", () => {
    const parsed = TokenResponseSchema.parse({
      accessToken: null,
      refreshToken: null,
      tokenType: "Bearer",
      expiresInSeconds: 0,
      mfaRequired: true,
      mfaChallengeToken: "challenge",
    });
    expect(parsed.accessToken).toBeNull();
    expect(parsed.mfaChallengeToken).toBe("challenge");
  });
});
