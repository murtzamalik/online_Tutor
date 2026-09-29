import { z } from "zod";
import { apiFetch } from "./client";

const token = () => (typeof window !== "undefined" ? localStorage.getItem("accessToken") ?? undefined : undefined);

export const getParentHome = () =>
  apiFetch("/parents/home", { method: "GET", token: token(), schema: z.object({ children: z.array(z.any()) }) });

export const getActionPlan = (studentId: string) =>
  apiFetch(`/students/${studentId}/action-plan`, { method: "GET", token: token(), schema: z.any() });

export const getAlerts = (studentId: string) =>
  apiFetch(`/students/${studentId}/alerts`, { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const getAiControls = (studentId: string) =>
  apiFetch(`/students/${studentId}/ai-controls`, { method: "GET", token: token(), schema: z.any() });

export const putAiControls = (studentId: string, body: Record<string, unknown>) =>
  apiFetch(`/students/${studentId}/ai-controls`, { method: "PUT", token: token(), body: JSON.stringify(body), schema: z.any() });

export const getPrivacy = (studentId: string) =>
  apiFetch(`/students/${studentId}/privacy`, { method: "GET", token: token(), schema: z.any() });

export const putPrivacy = (studentId: string, body: Record<string, unknown>) =>
  apiFetch(`/students/${studentId}/privacy`, { method: "PUT", token: token(), body: JSON.stringify(body), schema: z.any() });

export const getTranscripts = (studentId: string) =>
  apiFetch(`/students/${studentId}/ai-transcripts`, { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const grantVoiceConsent = (studentId: string) =>
  apiFetch(`/students/${studentId}/consents/voice`, {
    method: "POST",
    token: token(),
    body: JSON.stringify({ googleProcessingAcknowledged: true, textVersion: "voice-v1" }),
    schema: z.any(),
  });

export const under13Consent = (studentId: string) =>
  apiFetch(`/students/${studentId}/consents/under13`, {
    method: "POST",
    token: token(),
    body: JSON.stringify({ documentVersion: "under13-v1" }),
    schema: z.any(),
  });

export const ageStatus = () =>
  apiFetch("/age-assurance/status", { method: "GET", token: token(), schema: z.any() });

export const startAge = () =>
  apiFetch("/age-assurance/start", { method: "POST", token: token(), schema: z.any() });

export const completeAge = (recordId: string, pass: boolean) =>
  apiFetch(`/age-assurance/${recordId}/complete`, {
    method: "POST",
    token: token(),
    body: JSON.stringify({ pass }),
    schema: z.any(),
  });

export const connectivityCheck = () =>
  apiFetch("/voice/connectivity-check", { method: "POST", token: token(), schema: z.any() });

export const startVoice = () =>
  apiFetch("/voice/sessions", { method: "POST", token: token(), body: "{}", schema: z.any() });

export const endVoice = (id: string) =>
  apiFetch(`/voice/sessions/${id}/end`, { method: "POST", token: token(), body: "{}", schema: z.any() });

export const engagementEvents = (events: unknown[]) =>
  apiFetch("/engagement/events", {
    method: "POST",
    token: token(),
    body: JSON.stringify({ events }),
    schema: z.any(),
  });

export const respondNudge = (nudgeId: string, response: string) =>
  apiFetch(`/engagement/nudges/${nudgeId}/respond`, {
    method: "POST",
    token: token(),
    body: JSON.stringify({ response }),
    schema: z.any(),
  });

export const schoolGet = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}`, { method: "GET", token: token(), schema: z.any() });

export const schoolClasses = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}/classes`, { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const schoolDashboard = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}/dashboard`, { method: "GET", token: token(), schema: z.any() });

export const kcsiePack = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}/kcsie-pack`, { method: "GET", token: token(), schema: z.any() });

export const kcsieConfirm = (schoolId: string, body: Record<string, unknown>) =>
  apiFetch(`/schools/${schoolId}/kcsie-confirmation`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: z.any(),
  });

export const rosterImport = (schoolId: string, rows: unknown[]) =>
  apiFetch(`/schools/${schoolId}/roster-imports`, {
    method: "POST",
    token: token(),
    body: JSON.stringify({ rows }),
    schema: z.any(),
  });

export const getDpa = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}/dpa`, { method: "GET", token: token(), schema: z.any() });

export const signDpa = (schoolId: string, body: Record<string, unknown>) =>
  apiFetch(`/schools/${schoolId}/dpa/sign`, { method: "POST", token: token(), body: JSON.stringify(body), schema: z.any() });

export const schoolInvoices = (schoolId: string) =>
  apiFetch(`/schools/${schoolId}/invoices`, { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const classMastery = (classId: string) =>
  apiFetch(`/classes/${classId}/mastery`, { method: "GET", token: token(), schema: z.any() });

export const createAssignment = (classId: string, body: Record<string, unknown>) =>
  apiFetch(`/classes/${classId}/assignments`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: z.any(),
  });

export const safetyFlags = () =>
  apiFetch("/internal/safety/flags", { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const disclosures = () =>
  apiFetch("/internal/safeguarding/disclosures", { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const supportSearch = (q: string) =>
  apiFetch(`/internal/support/accounts?q=${encodeURIComponent(q)}`, {
    method: "GET",
    token: token(),
    schema: z.object({ items: z.array(z.any()) }),
  });

export const auditLog = () =>
  apiFetch("/internal/audit-log", { method: "GET", token: token(), schema: z.object({ items: z.array(z.any()) }) });

export const aiCost = () =>
  apiFetch("/internal/ai/cost", { method: "GET", token: token(), schema: z.any() });
