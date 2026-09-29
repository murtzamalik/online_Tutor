import { z } from "zod";
import { apiFetch } from "./client";

const ItemList = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item) });

export function listFaq() {
  return apiFetch("/marketing/faq", {
    method: "GET",
    schema: ItemList(
      z.object({
        faqId: z.union([z.string(), z.number()]),
        category: z.string(),
        question: z.string(),
        answerMd: z.string(),
        sortOrder: z.number().optional(),
      }),
    ),
  });
}

export function listResources() {
  return apiFetch("/marketing/resources", {
    method: "GET",
    schema: ItemList(
      z.object({
        resourceId: z.union([z.string(), z.number()]),
        title: z.string(),
        kind: z.string(),
        emailGated: z.boolean(),
        bodyMd: z.string().nullable().optional(),
        slug: z.string().optional(),
        fileKey: z.string().nullable().optional(),
      }),
    ),
  });
}

export function getMarketingPage(slug: string) {
  return apiFetch(`/marketing/pages/${encodeURIComponent(slug)}`, {
    method: "GET",
    schema: z.object({
      slug: z.string(),
      title: z.string(),
      heroMd: z.string().nullable().optional(),
      bodyMd: z.string(),
      ctaLabel: z.string().nullable().optional(),
      ctaHref: z.string().nullable().optional(),
    }),
  });
}

export function listOutcomes() {
  return apiFetch("/marketing/outcomes", {
    method: "GET",
    schema: ItemList(
      z.object({
        statId: z.union([z.string(), z.number()]),
        label: z.string(),
        valueText: z.string(),
        methodologyMd: z.string(),
        sampleSize: z.number().nullable().optional(),
        asOf: z.string().nullable().optional(),
      }),
    ),
  });
}

export function getSampleQuestion() {
  return apiFetch("/marketing/sample-question", {
    method: "GET",
    schema: z.object({
      questionId: z.union([z.string(), z.number()]),
      questionText: z.string(),
      questionType: z.string(),
      optionsJson: z.string().nullable().optional(),
      marksAvailable: z.number().optional(),
    }),
  });
}

export function answerSampleQuestion(questionId: string | number, answer: string) {
  return apiFetch(`/marketing/sample-question/${questionId}/answer`, {
    method: "POST",
    body: JSON.stringify({ answer }),
    schema: z.object({
      questionId: z.union([z.string(), z.number()]),
      correct: z.boolean(),
      correctKey: z.string().optional(),
    }),
  });
}

export function captureLead(body: {
  email: string;
  resourceId?: number | string;
  sourcePage?: string;
  marketingConsent?: boolean;
}) {
  return apiFetch("/marketing/leads", {
    method: "POST",
    body: JSON.stringify(body),
    schema: z.object({ leadId: z.string(), status: z.string() }),
  });
}

export function schoolDemoRequest(body: { email: string; marketingConsent?: boolean }) {
  return apiFetch("/marketing/school-demo-request", {
    method: "POST",
    body: JSON.stringify({ ...body, sourcePage: "home-school-demo" }),
    schema: z.object({ leadId: z.string(), status: z.string() }),
  });
}

export function postCookieConsent(categories: Record<string, boolean>, visitorId?: string) {
  return apiFetch("/cookie-consent", {
    method: "POST",
    body: JSON.stringify({ categories, visitorId, policyVersion: "1.0-w1" }),
    schema: z.object({
      cookieConsentId: z.string(),
      visitorId: z.string(),
    }),
  });
}

export function getLegal(slug: string) {
  return apiFetch(`/legal/${encodeURIComponent(slug)}`, {
    method: "GET",
    schema: z.object({
      slug: z.string(),
      version: z.string(),
      title: z.string(),
      bodyMd: z.string(),
      publishedAt: z.string().nullable().optional(),
    }),
  });
}

export function listExamDates(region?: string) {
  const qs = region ? `?region=${encodeURIComponent(region)}` : "";
  return apiFetch(`/catalog/exam-dates${qs}`, {
    method: "GET",
    schema: ItemList(
      z.object({
        examDateId: z.union([z.string(), z.number()]).optional(),
        qualificationId: z.union([z.string(), z.number()]).optional(),
        region: z.string(),
        examName: z.string(),
        examOn: z.string(),
        notes: z.string().nullable().optional(),
      }),
    ),
  });
}
