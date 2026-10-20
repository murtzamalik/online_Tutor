import { z } from "zod";
import { apiFetch, EmptyResponseSchema } from "./client";
import { requireToken } from "./auth-extra";

export function patchMe(body: { displayName?: string; locale?: string; marketingOptIn?: boolean }) {
  return apiFetch("/me", {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiFetch("/me/password/change", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ currentPassword, newPassword }),
    schema: EmptyResponseSchema,
  });
}

export function listSessions() {
  return apiFetch("/me/sessions", {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(z.record(z.unknown())) }),
  });
}

export function revokeSession(sessionId: string) {
  return apiFetch(`/me/sessions/${sessionId}`, {
    method: "DELETE",
    token: requireToken(),
    schema: EmptyResponseSchema,
  });
}

export function getNotificationPreferences() {
  return apiFetch("/notification-preferences", {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(z.record(z.unknown())) }),
  });
}

export function putNotificationPreferences(items: { channel: string; kind: string; enabled: boolean }[]) {
  return apiFetch("/notification-preferences", {
    method: "PUT",
    token: requireToken(),
    body: JSON.stringify({ items }),
    schema: z.object({ items: z.array(z.record(z.unknown())) }),
  });
}

export function patchStudent(studentId: string, body: Record<string, unknown>) {
  return apiFetch(`/students/${studentId}`, {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function patchEnrolment(enrolmentId: string, body: Record<string, unknown>) {
  return apiFetch(`/enrolments/${enrolmentId}`, {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function putDailyGoal(studentId: string, targetQuestions: number, enabled = true) {
  return apiFetch(`/students/${studentId}/daily-goal`, {
    method: "PUT",
    token: requireToken(),
    body: JSON.stringify({ targetQuestions, enabled }),
    schema: z.record(z.unknown()),
  });
}

export function predictedGrades(studentId: string) {
  return apiFetch(`/students/${studentId}/predicted-grades`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(z.record(z.unknown())).optional() }).or(z.record(z.unknown())),
  });
}

export function listMockPapers(studentId: string) {
  return apiFetch(`/students/${studentId}/mock-papers`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(z.record(z.unknown())) }),
  });
}

export function createMockPaper() {
  return apiFetch("/mock-papers", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ sourceKind: "GENERATED" }),
    schema: z.record(z.unknown()),
  });
}

export function mockResults(mockId: string) {
  return apiFetch(`/mock-papers/${mockId}/results`, {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}
