import { z } from "zod";
import { apiFetch } from "./client";
import { requireToken } from "./auth-extra";

const ItemList = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

export function listQcExceptions() {
  return apiFetch("/internal/qc/exceptions", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function approveQc(questionId: string | number) {
  return apiFetch(`/internal/qc/exceptions/${questionId}/approve`, {
    method: "POST",
    token: requireToken(),
    schema: z.void().or(z.undefined()).or(z.null()),
  });
}

export function rejectQc(questionId: string | number) {
  return apiFetch(`/internal/qc/exceptions/${questionId}/reject`, {
    method: "POST",
    token: requireToken(),
    schema: z.void().or(z.undefined()).or(z.null()),
  });
}

export function listInternalQuestions(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch(`/internal/questions${qs}`, {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function createQuestion(body: Record<string, unknown>) {
  return apiFetch("/internal/questions", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function listPastPapers() {
  return apiFetch("/internal/past-papers", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function registerPastPaper(body: Record<string, unknown>) {
  return apiFetch("/internal/past-papers", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function ingestPastPaper(paperId: string | number) {
  return apiFetch(`/internal/past-papers/${paperId}/ingest`, {
    method: "POST",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function patchLicence(paperId: string | number, licenceStatus: string) {
  return apiFetch(`/internal/past-papers/${paperId}/licence`, {
    method: "PATCH",
    token: requireToken(),
    body: JSON.stringify({ licenceStatus }),
    schema: z.record(z.unknown()),
  });
}

export function approvePastPaperItem(itemId: string | number) {
  return apiFetch(`/internal/past-paper-items/${itemId}/approve`, {
    method: "POST",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function listSpecs() {
  return apiFetch("/internal/specs", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function getSpecTree(specificationId: string | number) {
  return apiFetch(`/internal/specs/${specificationId}/tree`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      specificationId: z.union([z.string(), z.number()]),
      topics: z.array(z.record(z.unknown())),
    }),
  });
}

export function taggingProgress() {
  return apiFetch("/internal/specs/tagging-progress", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function listStyleProfiles() {
  return apiFetch("/internal/style-profiles", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function putStyleProfile(specificationId: string | number, body: Record<string, unknown>) {
  return apiFetch(`/internal/style-profiles/${specificationId}`, {
    method: "PUT",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}

export function evalSummary() {
  return apiFetch("/internal/ai/eval/summary", {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function runEval() {
  return apiFetch("/internal/ai/eval/runs", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({}),
    schema: z.record(z.unknown()),
  });
}

export function listGold() {
  return apiFetch("/internal/ai/gold-set", {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      items: z.array(z.record(z.unknown())),
      total: z.number(),
      targetSize: z.number(),
    }),
  });
}

export function gatewayLog() {
  return apiFetch("/internal/ai/gateway-log", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function boundaryAttestation() {
  return apiFetch("/internal/ai/boundary-attestation", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function listPrompts() {
  return apiFetch("/internal/ai/prompts", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function modelRouting() {
  return apiFetch("/internal/ai/model-routing", {
    method: "GET",
    token: requireToken(),
    schema: ItemList(z.record(z.unknown())),
  });
}

export function generationCoverage() {
  return apiFetch("/internal/generation/coverage", {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function createGenerationRun() {
  return apiFetch("/internal/generation/runs", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ kind: "MANUAL" }),
    schema: z.record(z.unknown()),
  });
}
