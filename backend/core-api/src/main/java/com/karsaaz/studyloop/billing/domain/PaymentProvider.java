package com.karsaaz.studyloop.billing.domain;

import java.util.Map;
import java.util.UUID;

/** Port for Stripe (or deterministic fake when STRIPE_SECRET_KEY absent). Amounts always in pence. */
public interface PaymentProvider {
  record CustomerResult(String customerId) {}
  record SetupIntentResult(String setupIntentId, String clientSecret) {}
  record SubscriptionResult(String subscriptionId, String status, String clientSecret) {}

  CustomerResult ensureCustomer(UUID accountId, String email);
  SetupIntentResult createSetupIntent(String customerId);
  SubscriptionResult createTrialSubscription(String customerId, String priceHint, int trialDays, Map<String, String> metadata);
  void cancelAtPeriodEnd(String subscriptionId);
  void reactivate(String subscriptionId);
  boolean verifyWebhookSignature(String payload, String signatureHeader);
  Map<String, Object> parseWebhookEvent(String payload);
}
