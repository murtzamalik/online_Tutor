import { z } from "zod";
import { apiFetch, EmptyResponseSchema } from "./client";
import { TokenResponseSchema } from "./auth";

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
    schema: EmptyResponseSchema,
  });
}

export function resendVerificationEmail(email: string) {
  return apiFetch("/auth/verify-email/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
    schema: EmptyResponseSchema,
  });
}

export function resetPassword(token: string, newPassword: string) {
  return apiFetch("/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
    schema: EmptyResponseSchema,
  });
}

export function picturePinLogin(loginHandle: string, pictureSequence: string[]) {
  return apiFetch("/auth/student/picture-pin", {
    method: "POST",
    body: JSON.stringify({ loginHandle, pictureSequence }),
    schema: TokenResponseSchema,
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
