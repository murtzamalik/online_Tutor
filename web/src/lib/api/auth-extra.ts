import { z } from "zod";
import { apiFetch } from "./client";

export function registerParent(body: {
  email: string;
  password: string;
  displayName: string;
  acceptTerms: boolean;
}) {
  return apiFetch("/auth/register-parent", {
    method: "POST",
    body: JSON.stringify(body),
    schema: z.object({ accountId: z.string(), status: z.string() }),
  });
}

export function verifyEmail(email: string, code: string) {
  return apiFetch("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email, code }),
    schema: z.void().or(z.undefined()).or(z.null()),
  });
}

export function picturePinLogin(loginHandle: string, pictureSequence: string[]) {
  return apiFetch("/auth/student/picture-pin", {
    method: "POST",
    body: JSON.stringify({ loginHandle, pictureSequence }),
    schema: z.object({
      accessToken: z.string().nullable(),
      refreshToken: z.string().nullable(),
      tokenType: z.string(),
      expiresInSeconds: z.number(),
      mfaRequired: z.boolean(),
      mfaChallengeToken: z.string().nullable(),
    }),
  });
}

export function token(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("accessToken");
}

export function requireToken(): string {
  const t = token();
  if (!t) throw new Error("Not signed in");
  return t;
}
