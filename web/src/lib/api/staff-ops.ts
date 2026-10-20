import { z } from "zod";
import { apiFetch } from "./client";
import { requireToken } from "./auth-extra";

/**
 * Staff console endpoints that already exist in core-api but had no web client yet
 * (eval runs list, exception / QC detail, review release, safety triage, support account tools).
 */

const Rec = z.record(z.unknown());
const ItemList = z.object({ items: z.array(Rec) });

/** GET /internal/ai/eval/runs — AIO-02 (AIE, OWN). */
export function listEvalRuns() {
  return apiFetch("/internal/ai/eval/runs", { method: "GET", token: requireToken(), schema: ItemList });
}

/** GET /internal/marking/exceptions/{id} — EXC-02 (OPS). */
export function getExceptionDetail(exceptionId: string) {
  return apiFetch(`/internal/marking/exceptions/${exceptionId}`, { method: "GET", token: requireToken(), schema: Rec });
}

/** GET /internal/qc/exceptions/{questionId} — CNT-02 (CNT). Question row plus qcChecks. */
export function getQcExceptionDetail(questionId: string | number) {
  return apiFetch(`/internal/qc/exceptions/${questionId}`, { method: "GET", token: requireToken(), schema: Rec });
}

/** POST /internal/reviews/{id}/release — REV-06 (REV). Returns a claimed review to the queue. */
export function releaseReview(reviewId: string, token?: string) {
  return apiFetch(`/internal/reviews/${reviewId}/release`, { method: "POST", body: "{}", schema: z.any(), token });
}

/** POST /internal/safety/flags/{id}/triage — SAF-04 (DSL). disposition: TRIAGED | DISMISSED | CLOSED. */
export function triageSafetyFlag(flagId: string, body: { disposition: string; note?: string }) {
  return apiFetch(`/internal/safety/flags/${flagId}/triage`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: Rec,
  });
}

/** POST /internal/safety/flags/{id}/escalate — SAF-05 (DSL). Opens a safeguarding disclosure. */
export function escalateSafetyFlag(flagId: string, body: { summary?: string }) {
  return apiFetch(`/internal/safety/flags/${flagId}/escalate`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: Rec,
  });
}

/** GET /internal/support/accounts/{id} — SUP-02 (SUP). */
export function supportAccountDetail(accountId: string) {
  return apiFetch(`/internal/support/accounts/${accountId}`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      account: Rec,
      children: z.array(Rec).optional().default([]),
      learningContent: z.string().optional(),
    }),
  });
}

/** POST /internal/support/accounts/{id}/password-reset — SUP-03 (SUP). */
export function supportPasswordReset(accountId: string) {
  return apiFetch(`/internal/support/accounts/${accountId}/password-reset`, {
    method: "POST",
    token: requireToken(),
    schema: Rec,
  });
}

/** POST /internal/support/accounts/{id}/notes — SUP-05 (SUP). */
export function supportAddNote(accountId: string, body: string) {
  return apiFetch(`/internal/support/accounts/${accountId}/notes`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ body }),
    schema: Rec,
  });
}

/** POST /internal/support/accounts/{id}/extend-trial — SUP-06 (SUP). Max 7 days. */
export function supportExtendTrial(accountId: string, days: number) {
  return apiFetch(`/internal/support/accounts/${accountId}/extend-trial`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ days }),
    schema: Rec,
  });
}

/** GET /internal/style-profiles/{specificationId} — STY-02 (CNT). Includes typicalPaperStructureNotes (not in the list). */
export function getStyleProfile(specificationId: string | number) {
  return apiFetch(`/internal/style-profiles/${specificationId}`, { method: "GET", token: requireToken(), schema: Rec });
}

/** GET /internal/safeguarding/disclosures/{id} — SAF-07 (DSL). Detail with action history. */
export function getDisclosure(disclosureId: string) {
  return apiFetch(`/internal/safeguarding/disclosures/${disclosureId}`, { method: "GET", token: requireToken(), schema: Rec });
}

/** POST /internal/safeguarding/disclosures/{id}/actions — SAF-08 (DSL). Log a contact, referral or note. */
export function logDisclosureAction(disclosureId: string, actionType: string, note: string) {
  return apiFetch(`/internal/safeguarding/disclosures/${disclosureId}/actions`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ actionType, note }),
    schema: Rec,
  });
}

/** POST /internal/safeguarding/disclosures/{id}/close — SAF-09 (DSL). Close with an outcome. */
export function closeDisclosure(disclosureId: string, referralTarget: string, note: string) {
  return apiFetch(`/internal/safeguarding/disclosures/${disclosureId}/close`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ referralTarget, note }),
    schema: Rec,
  });
}
