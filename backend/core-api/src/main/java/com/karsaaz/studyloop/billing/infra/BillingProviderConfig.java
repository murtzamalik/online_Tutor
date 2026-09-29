package com.karsaaz.studyloop.billing.infra;

import com.karsaaz.studyloop.billing.domain.PaymentProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class BillingProviderConfig {

  @Bean
  @Primary
  PaymentProvider paymentProvider(
      @Value("${studyloop.stripe.secret-key:}") String secretKey,
      @Value("${studyloop.stripe.webhook-secret:}") String webhookSecret) {
    if (secretKey == null || secretKey.isBlank()) {
      return new FakePaymentProvider();
    }
    return new StripePaymentProvider(secretKey, webhookSecret);
  }
}
