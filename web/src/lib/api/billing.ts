import { z } from "zod";
import { apiFetch } from "./client";

const token = () => (typeof window !== "undefined" ? localStorage.getItem("accessToken") ?? undefined : undefined);

export async function planPreview(body: Record<string, unknown>) {
  return apiFetch("/billing/checkout/plan-preview", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: z.object({
      totalPence: z.number(),
      subtotalPence: z.number(),
      vatPence: z.number(),
      siblingDiscountPence: z.number().optional(),
      currency: z.string(),
    }).passthrough(),
  });
}

export async function setupIntent() {
  return apiFetch("/billing/setup-intent", {
    method: "POST",
    token: token(),
    schema: z.object({ clientSecret: z.string(), setupIntentId: z.string() }).passthrough(),
  });
}

export async function createSubscription(body: Record<string, unknown>) {
  return apiFetch("/billing/subscriptions", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: z.object({ subscriptionId: z.string(), status: z.string() }).passthrough(),
  });
}

export async function getSubscription() {
  return apiFetch("/billing/subscription", {
    method: "GET",
    token: token(),
    schema: z.object({ subscription: z.any().nullable(), items: z.array(z.any()) }).passthrough(),
  });
}

export async function cancelPreview() {
  return apiFetch("/billing/subscription/cancel-preview", {
    method: "POST",
    token: token(),
    schema: z.object({ endsAt: z.any(), message: z.string() }).passthrough(),
  });
}

export async function cancelSubscription(reason?: string) {
  return apiFetch("/billing/subscription/cancel", {
    method: "POST",
    token: token(),
    body: JSON.stringify({ reason }),
    schema: z.object({ status: z.string() }).passthrough(),
  });
}

export async function reactivateSubscription() {
  return apiFetch("/billing/subscription/reactivate", {
    method: "POST",
    token: token(),
    schema: z.object({ status: z.string() }).passthrough(),
  });
}

export async function listInvoices() {
  return apiFetch("/billing/invoices", {
    method: "GET",
    token: token(),
    schema: z.object({ items: z.array(z.any()) }),
  });
}

export async function getDunning() {
  return apiFetch("/billing/dunning", {
    method: "GET",
    token: token(),
    schema: z.object({ dunning: z.any().nullable() }).passthrough(),
  });
}

export async function paymentMethodSetup() {
  return apiFetch("/billing/payment-method/setup", {
    method: "POST",
    token: token(),
    schema: z.object({ clientSecret: z.string() }).passthrough(),
  });
}

export async function paymentMethodConfirm(body: Record<string, unknown>) {
  return apiFetch("/billing/payment-method/confirm", {
    method: "POST",
    token: token(),
    body: JSON.stringify(body),
    schema: z.object({ status: z.string() }).passthrough(),
  });
}
