package com.karsaaz.studyloop.billing.infra;

import com.karsaaz.studyloop.billing.domain.PaymentProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.UUID;

/** Deterministic provider used when Stripe secret is not configured. */
public class FakePaymentProvider implements PaymentProvider {
  private final ObjectMapper mapper = new ObjectMapper();

  @Override
  public CustomerResult ensureCustomer(UUID accountId, String email) {
    return new CustomerResult("cus_fake_" + accountId.toString().replace("-", "").substring(0, 16));
  }

  @Override
  public SetupIntentResult createSetupIntent(String customerId) {
    String id = "seti_fake_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    return new SetupIntentResult(id, id + "_secret_fake");
  }

  @Override
  public SubscriptionResult createTrialSubscription(
      String customerId, String priceHint, int trialDays, Map<String, String> metadata) {
    String id = "sub_fake_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    return new SubscriptionResult(id, "trialing", null);
  }

  @Override
  public void cancelAtPeriodEnd(String subscriptionId) {}

  @Override
  public void reactivate(String subscriptionId) {}

  @Override
  public boolean verifyWebhookSignature(String payload, String signatureHeader) {
    return signatureHeader == null || signatureHeader.startsWith("t=") || "fake".equals(signatureHeader);
  }

  @Override
  @SuppressWarnings("unchecked")
  public Map<String, Object> parseWebhookEvent(String payload) {
    try {
      return mapper.readValue(payload, Map.class);
    } catch (Exception e) {
      return Map.of("id", "evt_fake", "type", "ping", "data", Map.of());
    }
  }
}
