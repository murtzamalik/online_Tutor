package com.karsaaz.studyloop.billing.api;

import com.karsaaz.studyloop.billing.application.BillingService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class BillingController {
  private final BillingService billing;

  public BillingController(BillingService billing) {
    this.billing = billing;
  }

  @PostMapping("/billing/setup-intent")
  @CatalogueRoles(id = "BIL-01", roles = "PAR")
  public Map<String, Object> setupIntent(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.setupIntent(principal);
  }

  @PostMapping("/billing/subscriptions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "BIL-02", roles = "PAR")
  public Map<String, Object> createSub(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return billing.createSubscription(principal, body);
  }

  @GetMapping("/billing/subscription")
  @CatalogueRoles(id = "BIL-03", roles = "PAR")
  public Map<String, Object> getSub(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.getSubscription(principal);
  }

  @PatchMapping("/billing/subscription")
  @CatalogueRoles(id = "BIL-04", roles = "PAR")
  public Map<String, Object> patchSub(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return billing.patchSubscription(principal, body);
  }

  @PostMapping("/billing/subscription/cancel-preview")
  @CatalogueRoles(id = "BIL-05", roles = "PAR")
  public Map<String, Object> cancelPreview(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.cancelPreview(principal);
  }

  @PostMapping("/billing/subscription/cancel")
  @CatalogueRoles(id = "BIL-06", roles = "PAR")
  public Map<String, Object> cancel(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return billing.cancel(principal, body == null ? Map.of() : body);
  }

  @PostMapping("/billing/subscription/reactivate")
  @CatalogueRoles(id = "BIL-07", roles = "PAR")
  public Map<String, Object> reactivate(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.reactivate(principal);
  }

  @GetMapping("/billing/invoices")
  @CatalogueRoles(id = "BIL-08", roles = "PAR")
  public Map<String, Object> invoices(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.listInvoices(principal);
  }

  @GetMapping("/billing/invoices/{invoiceId}/pdf")
  @CatalogueRoles(id = "BIL-09", roles = "PAR")
  public Map<String, Object> invoicePdf(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID invoiceId) {
    return billing.invoicePdf(principal, invoiceId);
  }

  @PostMapping("/billing/payment-method/setup")
  @CatalogueRoles(id = "BIL-10", roles = "PAR")
  public Map<String, Object> pmSetup(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.paymentMethodSetup(principal);
  }

  @PostMapping("/billing/payment-method/confirm")
  @CatalogueRoles(id = "BIL-11", roles = "PAR")
  public Map<String, Object> pmConfirm(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return billing.confirmPaymentMethod(principal, body);
  }

  @GetMapping("/billing/dunning")
  @CatalogueRoles(id = "BIL-12", roles = "PAR")
  public Map<String, Object> dunning(@AuthenticationPrincipal AccountPrincipal principal) {
    return billing.dunning(principal);
  }

  @PostMapping("/billing/promo/validate")
  @CatalogueRoles(id = "BIL-13", roles = "PAR")
  public Map<String, Object> promo(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return billing.validatePromo(principal, body);
  }

  @PostMapping("/webhooks/stripe")
  @CatalogueRoles(id = "BIL-17", roles = "SYS")
  public Map<String, Object> stripeWebhook(
      @RequestBody String payload,
      @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
    return billing.handleStripeWebhook(payload, signature);
  }

  @PostMapping("/billing/checkout/plan-preview")
  @CatalogueRoles(id = "BIL-18", roles = "PAR,PUB")
  public Map<String, Object> planPreview(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody Map<String, Object> body) {
    return billing.planPreview(principal, body);
  }
}
