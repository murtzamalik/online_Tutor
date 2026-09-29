import { z } from "zod";
import { apiFetch } from "./client";
import { requireToken } from "./auth-extra";

export const QuestionSchema = z.object({
  questionId: z.union([z.string(), z.number()]),
  questionText: z.string(),
  questionType: z.string(),
  marksAvailable: z.number(),
  optionsJson: z.unknown().nullable().optional(),
  answerFormat: z.string().optional(),
  answerSpecJson: z.unknown().nullable().optional(),
  commandWord: z.string().nullable().optional(),
});

export const NextQuestionSchema = z.object({
  sessionQuestionId: z.string().optional(),
  seq: z.number().optional(),
  question: QuestionSchema,
  selectionReason: z.unknown().optional(),
  done: z.boolean().optional(),
});

export function startPractice(body: {
  enrolmentId: string;
  mode: string;
  topicIds?: number[];
  plannedCount?: number;
}) {
  return apiFetch("/practice/sessions", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.object({
      sessionId: z.string(),
      status: z.string(),
      mode: z.string(),
      startedAt: z.string().optional(),
    }),
  });
}

export function nextQuestion(sessionId: string) {
  return apiFetch(`/practice/sessions/${sessionId}/next`, {
    method: "GET",
    token: requireToken(),
    schema: NextQuestionSchema,
  });
}

export function submitAnswer(
  sessionId: string,
  body: {
    questionId: number | string;
    answer: Record<string, unknown>;
    confidence?: string;
    telemetry?: Record<string, unknown>;
  },
  idempotencyKey: string,
) {
  return apiFetch(`/practice/sessions/${sessionId}/answers`, {
    method: "POST",
    token: requireToken(),
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    schema: z.object({
      responseId: z.string(),
      status: z.string(),
      resultUrl: z.string().optional(),
      sse: z.boolean().optional(),
    }),
  });
}

export function pollResult(responseId: string) {
  return apiFetch(`/practice/answers/${responseId}/result`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      status: z.string(),
      marks: z
        .object({
          awarded: z.number().nullable().optional(),
          available: z.number().nullable().optional(),
        })
        .optional(),
      points: z.array(z.record(z.unknown())).optional(),
      feedback: z.unknown().optional(),
      reveal: z.boolean().optional(),
      provisional: z.boolean().optional(),
      isCorrect: z.boolean().nullable().optional(),
    }),
  });
}

export function requestHint(sessionId: string, questionId?: number | string) {
  return apiFetch(`/practice/sessions/${sessionId}/hint`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(questionId != null ? { questionId } : {}),
    schema: z.object({ level: z.number(), hintText: z.string() }),
  });
}

export function endSession(sessionId: string) {
  return apiFetch(`/practice/sessions/${sessionId}/end`, {
    method: "POST",
    token: requireToken(),
    schema: z.object({
      sessionId: z.string(),
      status: z.string(),
      summary: z.record(z.unknown()).optional(),
    }),
  });
}

export function startDiagnostic(enrolmentId: string) {
  return apiFetch("/diagnostics", {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ enrolmentId }),
    schema: z.object({
      diagnosticId: z.string(),
      sessionId: z.string(),
      status: z.string(),
    }),
  });
}

export function diagnosticNext(diagnosticId: string) {
  return apiFetch(`/diagnostics/${diagnosticId}/next`, {
    method: "GET",
    token: requireToken(),
    schema: NextQuestionSchema,
  });
}

export function diagnosticAnswer(
  diagnosticId: string,
  body: { questionId: number | string; answer: Record<string, unknown> },
  idempotencyKey: string,
) {
  return apiFetch(`/diagnostics/${diagnosticId}/answers`, {
    method: "POST",
    token: requireToken(),
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    schema: z.object({
      responseId: z.string(),
      theta: z.number().nullable().optional(),
      status: z.string().optional(),
    }),
  });
}

export function diagnosticResult(diagnosticId: string) {
  return apiFetch(`/diagnostics/${diagnosticId}/result`, {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      theta: z.number().nullable().optional(),
      thetaSe: z.number().nullable().optional(),
      resultJson: z.unknown().optional(),
      completedAt: z.string().nullable().optional(),
      status: z.string().optional(),
    }),
  });
}

export function getMarking(responseId: string) {
  return apiFetch(`/answers/${responseId}/marking`, {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function getMarkScheme(questionId: string | number) {
  return apiFetch(`/questions/${questionId}/mark-scheme`, {
    method: "GET",
    token: requireToken(),
    schema: z.record(z.unknown()),
  });
}

export function disputeAnswer(responseId: string, reasonCode: string, reasonText?: string) {
  return apiFetch(`/answers/${responseId}/dispute`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify({ reasonCode, reasonText }),
    schema: z.object({
      disputeId: z.string(),
      exceptionId: z.string().optional(),
    }),
  });
}

export function listExceptions() {
  return apiFetch("/internal/marking/exceptions", {
    method: "GET",
    token: requireToken(),
    schema: z.object({
      items: z.array(
        z.object({
          exceptionId: z.string(),
          responseId: z.string(),
          trigger: z.string(),
          status: z.string(),
          slaDueAt: z.string().nullable().optional(),
        }),
      ),
    }),
  });
}

export function claimException(exceptionId: string) {
  return apiFetch(`/internal/marking/exceptions/${exceptionId}/claim`, {
    method: "POST",
    token: requireToken(),
    schema: z.object({
      exceptionId: z.string(),
      status: z.string(),
      assignedTo: z.string().optional(),
    }),
  });
}

export function resolveException(
  exceptionId: string,
  body: {
    finalMarks: number;
    resolution: string;
    resolutionNote?: string;
    addToGold?: boolean;
  },
) {
  return apiFetch(`/internal/marking/exceptions/${exceptionId}/resolve`, {
    method: "POST",
    token: requireToken(),
    body: JSON.stringify(body),
    schema: z.record(z.unknown()),
  });
}
