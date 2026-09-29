import { z } from "zod";
import { apiFetch } from "./client";

export const TokenResponseSchema = z.object({
  accessToken: z.string().nullable(),
  refreshToken: z.string().nullable(),
  tokenType: z.string(),
  expiresInSeconds: z.number(),
  mfaRequired: z.boolean(),
  mfaChallengeToken: z.string().nullable(),
});

export const MeSchema = z.object({
  accountId: z.string().nullable(),
  email: z.string().nullable(),
  displayName: z.string(),
  kind: z.string(),
  status: z.string(),
  roles: z.array(z.string()),
  children: z.array(z.record(z.unknown())),
  entitlements: z.array(z.record(z.unknown())),
  featureFlags: z.record(z.boolean()),
  mfaSatisfied: z.boolean(),
  studentId: z.string().nullable().optional(),
});

export function login(email: string, password: string) {
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    schema: TokenResponseSchema,
  });
}

export function verifyMfa(mfaChallengeToken: string, code: string) {
  return apiFetch("/auth/mfa/verify", {
    method: "POST",
    body: JSON.stringify({ mfaChallengeToken, code }),
    schema: TokenResponseSchema,
  });
}

export function forgotPassword(email: string) {
  return apiFetch("/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
    schema: z.void().or(z.undefined()),
  });
}

export function getMe(token: string) {
  return apiFetch("/me", { method: "GET", token, schema: MeSchema });
}
