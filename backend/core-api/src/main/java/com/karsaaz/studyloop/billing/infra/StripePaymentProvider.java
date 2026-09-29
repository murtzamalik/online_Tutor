package com.karsaaz.studyloop.billing.infra;

import com.karsaaz.studyloop.billing.domain.PaymentProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Thin Stripe REST adapter (test mode). No PAN/CVV ever touches our servers —
 * only SetupIntent client_secret is returned to the browser Elements flow.
 */
public class StripePaymentProvider implements PaymentProvider {
  private final String secretKey;
  private final String webhookSecret;
  private final HttpClient http = HttpClient.newHttpClient();
  private final ObjectMapper mapper = new ObjectMapper();

  public StripePaymentProvider(String secretKey, String webhookSecret) {
    this.secretKey = secretKey;
    this.webhookSecret = webhookSecret == null ? "" : webhookSecret;
  }

  @Override
  public CustomerResult ensureCustomer(UUID accountId, String email) {
    Map<?, ?> body = formPost("/v1/customers", Map.of(
        "email", email == null ? "" : email,
        "metadata[account_id]", accountId.toString()));
    return new CustomerResult(String.valueOf(body.get("id")));
  }

  @Override
  public SetupIntentResult createSetupIntent(String customerId) {
    Map<?, ?> body = formPost("/v1/setup_intents", Map.of(
        "customer", customerId,
        "usage", "off_session",
        "payment_method_types[]", "card"));
    return new SetupIntentResult(String.valueOf(body.get("id")), String.valueOf(body.get("client_secret")));
  }

  @Override
  public SubscriptionResult createTrialSubscription(
      String customerId, String priceHint, int trialDays, Map<String, String> metadata) {
    var params = new LinkedHashMap<String, String>();
    params.put("customer", customerId);
    params.put("trial_period_days", String.valueOf(trialDays));
    params.put("payment_behavior", "default_incomplete");
    params.put("metadata[price_hint]", priceHint == null ? "" : priceHint);
    if (metadata != null) {
      metadata.forEach((k, v) -> params.put("metadata[" + k + "]", v));
    }
    if (priceHint != null && priceHint.startsWith("price_")) {
      params.put("items[0][price]", priceHint);
    }
    Map<?, ?> body = formPost("/v1/subscriptions", params);
    Object pending = body.get("pending_setup_intent");
    String clientSecret = null;
    if (pending instanceof Map<?, ?> m) {
      clientSecret = String.valueOf(m.get("client_secret"));
    }
    return new SubscriptionResult(
        String.valueOf(body.get("id")),
        String.valueOf(body.get("status")),
        clientSecret);
  }

  @Override
  public void cancelAtPeriodEnd(String subscriptionId) {
    formPost("/v1/subscriptions/" + subscriptionId, Map.of("cancel_at_period_end", "true"));
  }

  @Override
  public void reactivate(String subscriptionId) {
    formPost("/v1/subscriptions/" + subscriptionId, Map.of("cancel_at_period_end", "false"));
  }

  @Override
  public boolean verifyWebhookSignature(String payload, String signatureHeader) {
    if (webhookSecret.isBlank()) {
      return signatureHeader != null && !signatureHeader.isBlank();
    }
    return signatureHeader != null && signatureHeader.contains("v1=");
  }

  @Override
  @SuppressWarnings("unchecked")
  public Map<String, Object> parseWebhookEvent(String payload) {
    try {
      return mapper.readValue(payload, Map.class);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid Stripe webhook payload");
    }
  }

  @SuppressWarnings("unchecked")
  private Map<?, ?> formPost(String path, Map<String, String> form) {
    try {
      StringBuilder body = new StringBuilder();
      for (var e : form.entrySet()) {
        if (body.length() > 0) body.append('&');
        body.append(java.net.URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8))
            .append('=')
            .append(java.net.URLEncoder.encode(e.getValue() == null ? "" : e.getValue(), StandardCharsets.UTF_8));
      }
      HttpRequest req = HttpRequest.newBuilder()
          .uri(URI.create("https://api.stripe.com" + path))
          .header("Authorization", "Bearer " + secretKey)
          .header("Content-Type", "application/x-www-form-urlencoded")
          .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
          .build();
      HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
      if (res.statusCode() >= 400) {
        throw new IllegalStateException("Stripe error " + res.statusCode());
      }
      return mapper.readValue(res.body(), Map.class);
    } catch (Exception e) {
      throw new IllegalStateException("Stripe call failed: " + e.getMessage(), e);
    }
  }
}
