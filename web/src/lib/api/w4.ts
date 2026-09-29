import { z } from "zod";
import { apiFetch } from "./client";

const Any = z.any();
const token = () =>
  typeof window !== "undefined"
    ? sessionStorage.getItem("accessToken") ?? localStorage.getItem("accessToken") ?? undefined
    : undefined;

export function listLibraryResources() {
  return apiFetch("/marketing/resources", {
    method: "GET",
    schema: z.object({ items: z.array(Any) }),
  });
}

export function getAccessibility(studentId: string) {
  return apiFetch(`/students/${studentId}/accessibility`, {
    method: "GET",
    token: token(),
    schema: Any,
  });
}

export function putAccessibility(studentId: string, body: Record<string, unknown>) {
  return apiFetch(`/students/${studentId}/accessibility`, {
    method: "PUT",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function createMicroSub(body: Record<string, unknown>) {
  return apiFetch("/billing/micro-subscriptions", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function getReferral() {
  return apiFetch("/billing/referral", { method: "GET", token: token(), schema: Any });
}

export function inviteReferral(email: string) {
  return apiFetch("/billing/referral/invite", {
    method: "POST",
    token: token(),
    body: JSON.stringify({ email }),
    schema: Any,
  });
}

export function startEntrance(body: Record<string, unknown>) {
  return apiFetch("/entrance-tests", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function entranceNext(runId: string) {
  return apiFetch(`/entrance-tests/${runId}/next`, { method: "GET", token: token(), schema: Any });
}

export function entranceAnswer(runId: string, body: Record<string, unknown>) {
  return apiFetch(`/entrance-tests/${runId}/answers`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function entranceResult(runId: string) {
  return apiFetch(`/entrance-tests/${runId}/result`, { method: "GET", token: token(), schema: Any });
}

export function startKeepGoing(body: Record<string, unknown>) {
  return apiFetch("/practice/sessions", {
    method: "POST",
    token: token(),
    body: JSON.stringify({ ...body, mode: "TARGET_GRADE" }),
    schema: Any,
  });
}

export function practiceNext(sessionId: string) {
  return apiFetch(`/practice/sessions/${sessionId}/next`, { method: "GET", token: token(), schema: Any });
}

export function practiceAnswer(sessionId: string, body: Record<string, unknown>) {
  return apiFetch(`/practice/sessions/${sessionId}/answers`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function setPracticeMode(sessionId: string, body: Record<string, unknown>) {
  return apiFetch(`/practice/sessions/${sessionId}/mode`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function photoWalkthrough(body: Record<string, unknown>) {
  return apiFetch("/tutor/photo-walkthrough", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function getAlerts(studentId: string) {
  return apiFetch(`/students/${studentId}/alerts`, {
    method: "GET",
    token: token(),
    schema: z.object({ items: z.array(Any) }),
  });
}

export function ackAlert(alertId: string) {
  return apiFetch(`/alerts/${alertId}/ack`, {
    method: "POST",
    token: token(),
    body: "{}",
    schema: Any,
  });
}

export function skillMap(studentId: string) {
  return apiFetch(`/students/${studentId}/skill-map`, { method: "GET", token: token(), schema: Any });
}

export function cohortBenchmark(studentId: string) {
  return apiFetch(`/students/${studentId}/cohort-benchmark`, { method: "GET", token: token(), schema: Any });
}

export function listDecks() {
  return apiFetch("/revision/decks", {
    method: "GET",
    token: token(),
    schema: z.object({ items: z.array(Any) }),
  });
}

export function shareDeck(deckId: string, body: Record<string, unknown> = {}) {
  return apiFetch(`/revision/decks/${deckId}/share`, {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function openShared(shareCode: string) {
  return apiFetch(`/revision/shared/${shareCode}`, { method: "GET", token: token(), schema: Any });
}

export function revokeShare(shareCode: string) {
  return apiFetch(`/revision/shares/${shareCode}`, {
    method: "DELETE",
    token: token(),
    schema: Any,
  });
}

export function startDiscussionVoice(body: Record<string, unknown> = {}) {
  return apiFetch("/voice/sessions", {
    method: "POST",
    token: token(),
    body: JSON.stringify({ ...body, mode: "DISCUSSION" }),
    schema: Any,
  });
}

export function endVoice(voiceSessionId: string) {
  return apiFetch(`/voice/sessions/${voiceSessionId}/end`, {
    method: "POST",
    token: token(),
    body: "{}",
    schema: Any,
  });
}

export function putDailyGoal(studentId: string, body: Record<string, unknown>) {
  return apiFetch(`/students/${studentId}/daily-goal`, {
    method: "PUT",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function getAiControls(studentId: string) {
  return apiFetch(`/students/${studentId}/ai-controls`, { method: "GET", token: token(), schema: Any });
}

export function putAiControls(studentId: string, body: Record<string, unknown>) {
  return apiFetch(`/students/${studentId}/ai-controls`, {
    method: "PUT",
    token: token(),
    body: JSON.stringify(body),
    schema: Any,
  });
}

export function setupIntent() {
  return apiFetch("/billing/setup-intent", { method: "POST", token: token(), schema: Any });
}
