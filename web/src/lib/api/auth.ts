import { z } from "zod";
import { apiFetch, EmptyResponseSchema } from "./client";

export const TokenResponseSchema = z.object({
  accessToken: z.string().nullish(),
  refreshToken: z.string().nullish(),
  tokenType: z.string().default("Bearer"),
  expiresInSeconds: z.coerce.number(),
  mfaRequired: z.boolean().default(false),
  mfaChallengeToken: z.string().nullish(),
});

export const MeSchema = z.object({
  accountId: z.string().nullish(),
  email: z.string().nullish(),
  displayName: z.string(),
  kind: z.string(),
  status: z.string(),
  roles: z.array(z.string()).default([]),
  children: z.array(z.record(z.unknown())).default([]),
  entitlements: z.array(z.record(z.unknown())).default([]),
  featureFlags: z.record(z.boolean()).default({}),
  mfaSatisfied: z.boolean().default(false),
  studentId: z.string().nullish(),
  schoolId: z.string().nullish(),
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
    schema: EmptyResponseSchema,
  });
}

export function refreshSession(refreshToken: string) {
  return apiFetch("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
    schema: TokenResponseSchema,
  });
}

export function logout(refreshToken?: string) {
  return apiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    schema: EmptyResponseSchema,
  });
}

export function getMe(token: string) {
  return apiFetch("/me", { method: "GET", token, schema: MeSchema });
}
