import { z } from "zod";
import { apiFetch } from "./client";
import { requireToken } from "./auth-extra";

export const StudentSchema = z.object({
  studentId: z.string(),
  displayName: z.string(),
  yearGroup: z.string().nullable().optional(),
  ageBand: z.string(),
  visualTier: z.number().optional(),
  avatarKey: z.string().nullable().optional(),
  status: z.string(),
  requiresUnder13Consent: z.boolean().optional(),
  loginHandle: z.string().nullable().optional(),
  enrolments: z.array(z.record(z.unknown())).optional(),
  consentGates: z.record(z.unknown()).optional(),
});

export const EnrolmentSchema = z.object({
  enrolmentId: z.string(),
  specificationId: z.union([z.string(), z.number()]),
  specCode: z.string().optional(),
  board: z.string().optional(),
  subject: z.string().optional(),
  tier: z.string().nullable().optional(),
  goalType: z.string().optional(),
  targetGrade: z.string().nullable().optional(),
  examDate: z.string().nullable().optional(),
  status: z.string().optional(),
});

export function listStudents() {
  return apiFetch("/students", {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(StudentSchema) }),
  });
}

export function createStudent(body: {
  displayName: string;
  yearGroup: string;
  birthMonth: string;
  avatarKey?: string;
}) {
  return apiFetch("/students", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.object({
      studentId: z.string(),
      ageBand: z.string(),
      visualTier: z.number().optional(),
      requiresUnder13Consent: z.boolean(),
    }),
  });
}

export function setPicturePin(studentId: string, pictureSequence: string[]) {
  return apiFetch(`/students/${studentId}/picture-pin`, {
    method: "PUT",
    token: requireToken(),
    body: JSON.stringify({ pictureSequence }),
    schema: z.object({ loginHandle: z.string() }),
  });
}

export function under13Consent(studentId: string, method = "CHECKBOX") {
  return apiFetch(`/students/${studentId}/consents/under13`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ method, granted: true, documentVersion: "v1" }),
    schema: z.object({
      consentId: z.string(),
      method: z.string(),
      verifiedAt: z.string().optional(),
    }),
  });
}

export function listEnrolments(studentId: string) {
  return apiFetch(`/students/${studentId}/enrolments`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({ items: z.array(EnrolmentSchema) }),
  });
}

export function createEnrolment(
  studentId: string,
  body: { specificationId: number | string; tier?: string; goalType?: string },
) {
  return apiFetch(`/students/${studentId}/enrolments`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: EnrolmentSchema.extend({ enrolmentId: z.string() }),
  });
}

export function studentHome(studentId: string) {
  return apiFetch(`/students/${studentId}/home`, {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function dailyGoal(studentId: string) {
  return apiFetch(`/students/${studentId}/daily-goal`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      targetQuestions: z.number(),
      enabled: z.boolean(),
      progressToday: z.object({ answered: z.number(), target: z.number() }).optional(),
    }),
  });
}
