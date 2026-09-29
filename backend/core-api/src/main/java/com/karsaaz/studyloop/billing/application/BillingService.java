package com.karsaaz.studyloop.billing.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.billing.domain.DunningStateMachine;
import com.karsaaz.studyloop.billing.domain.EntitlementMath;
import com.karsaaz.studyloop.billing.domain.PaymentProvider;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingService {
  private final JdbcTemplate jdbc;
  private final PaymentProvider payments;
  private final StudentAccessHelper access;
  private final ObjectMapper mapper = new ObjectMapper();

  public BillingService(JdbcTemplate jdbc, PaymentProvider payments, StudentAccessHelper access) {
    this.jdbc = jdbc;
    this.payments = payments;
    this.access = access;
  }

  public Map<String, Object> setupIntent(AccountPrincipal principal) {
    access.requireParent(principal);
    String customerId = ensureBillingCustomer(principal);
    var si = payments.createSetupIntent(customerId);
    return Map.of(
        "setupIntentId", si.setupIntentId(),
        "clientSecret", si.clientSecret(),
        "publishableKeyHint", "pk_test_from_env");
  }

  public Map<String, Object> paymentMethodSetup(AccountPrincipal principal) {
    return setupIntent(principal);
  }

  @Transactional
  public Map<String, Object> confirmPaymentMethod(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    String brand = str(body, "brand", "visa");
    String last4 = str(body, "last4", "4242");
    String exp = str(body, "exp", "12/30");
    jdbc.update(
        """
        UPDATE billing_customer SET default_pm_brand = ?, default_pm_last4 = ?, default_pm_exp = ?
        WHERE account_id = ?
        """,
        brand, last4, exp, principal.accountId());
    // Retry open PAST_DUE if any
    var subs = jdbc.queryForList(
        "SELECT subscription_id FROM subscription WHERE account_id = ? AND status = 'PAST_DUE'",
        principal.accountId());
    for (var s : subs) {
      UUID sid = (UUID) s.get("subscription_id");
      jdbc.update("UPDATE subscription SET status = 'ACTIVE', grace_until = NULL, updated_at = now() WHERE subscription_id = ?", sid);
      grantEntitlements(sid);
    }
    return Map.of("status", "UPDATED", "retried", subs.size());
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> planPreview(AccountPrincipal principal, Map<String, Object> body) {
    long planId = longVal(body.get("planId"));
    String cycle = str(body, "billingCycle", "MONTHLY");
    List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
    Integer amount = jdbc.query(
        """
        SELECT amount_pence FROM pricing_price WHERE plan_id = ? AND billing_cycle = ?
        """,
        rs -> rs.next() ? rs.getInt(1) : null,
        planId, cycle);
    if (amount == null) {
      throw AppException.notFound("Price not found");
    }
    List<EntitlementMath.Line> lines = new ArrayList<>();
    Set<UUID> children = new HashSet<>();
    for (Map<String, Object> it : items) {
      UUID studentId = UUID.fromString(it.get("studentId").toString());
      if (principal != null && principal.accountId() != null && StudentAccessHelper.hasParentRole(principal.roles())) {
        access.assertParentOwns(principal, studentId);
      }
      children.add(studentId);
      long subjectId = longVal(it.get("subjectId"));
      long qualificationId = longVal(it.get("qualificationId"));
      lines.add(new EntitlementMath.Line(subjectId, qualificationId, amount.longValue()));
    }
    int siblingPct = configInt("billing.sibling_discount_pct", 10);
    int vatPct = configInt("billing.vat_pct", 20);
    int promoPct = 0;
    String promoCode = str(body, "promoCode", null);
    if (promoCode != null && !promoCode.isBlank()) {
      promoPct = validatePromoPercent(promoCode);
    }
    var preview = EntitlementMath.preview(lines, children.size(), siblingPct, promoPct, vatPct);
    Map<String, Object> out = new HashMap<>();
    out.put("currency", "GBP");
    out.put("subtotalPence", preview.subtotalPence());
    out.put("siblingDiscountPence", preview.siblingDiscountPence());
    out.put("promoDiscountPence", preview.promoDiscountPence());
    out.put("vatPence", preview.vatPence());
    out.put("totalPence", preview.totalPence());
    out.put("childCount", preview.childCount());
    out.put("subjectCount", preview.subjectCount());
    out.put("billingCycle", cycle);
    out.put("planId", planId);
    return out;
  }

  public Map<String, Object> validatePromo(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    String code = str(body, "code", "");
    int pct = validatePromoPercent(code);
    return Map.of("code", code.toUpperCase(), "percentOff", pct, "valid", true);
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public Map<String, Object> createSubscription(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    ensureEmailVerified(principal.accountId());
    long planId = longVal(body.get("planId"));
    String cycle = str(body, "billingCycle", "MONTHLY");
    List<Map<String, Object>> items = (List<Map<String, Object>>) body.getOrDefault("items", List.of());
    if (items.isEmpty()) {
      throw AppException.badRequest("VALIDATION_FAILED", "items required");
    }
    String customerId = ensureBillingCustomer(principal);
    int trialDays = configInt("billing.trial_days", 7);
    UUID subscriptionId = UUID.randomUUID();
    Instant now = Instant.now();
    Instant trialEnd = now.plus(trialDays, ChronoUnit.DAYS);
    var stripeSub = payments.createTrialSubscription(
        customerId, "plan_" + planId, trialDays, Map.of("subscription_id", subscriptionId.toString()));
    String status = mapStripeStatus(stripeSub.status());
    BigDecimal siblingPct = BigDecimal.valueOf(configInt("billing.sibling_discount_pct", 10));
    Long promoId = null;
    String promoCode = str(body, "promoCode", null);
    if (promoCode != null && !promoCode.isBlank()) {
      promoId = jdbc.query(
          "SELECT promo_code_id FROM promo_code WHERE upper(code) = upper(?)",
          rs -> rs.next() ? rs.getLong(1) : null,
          promoCode);
    }
    jdbc.update(
        """
        INSERT INTO subscription (
          subscription_id, account_id, plan_id, stripe_subscription_id, status, billing_cycle,
          trial_started_at, trial_ends_at, current_period_start, current_period_end,
          cancel_at_period_end, family_discount_pct, promo_code_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,FALSE,?,?)
        """,
        subscriptionId, principal.accountId(), planId, stripeSub.subscriptionId(), status, cycle,
        Timestamp.from(now), Timestamp.from(trialEnd), Timestamp.from(now), Timestamp.from(trialEnd),
        siblingPct, promoId);
    for (Map<String, Object> it : items) {
      UUID studentId = UUID.fromString(it.get("studentId").toString());
      access.assertParentOwns(principal, studentId);
      long subjectId = longVal(it.get("subjectId"));
      long qualificationId = longVal(it.get("qualificationId"));
      jdbc.update(
          """
          INSERT INTO subscription_item (item_id, subscription_id, student_id, subject_id, qualification_id)
          VALUES (?,?,?,?,?)
          """,
          UUID.randomUUID(), subscriptionId, studentId, subjectId, qualificationId);
    }
    grantEntitlements(subscriptionId);
    enqueueNotification(principal.accountId(), "BILLING", "Trial started — ends " + trialEnd);
    Map<String, Object> out = new HashMap<>();
    out.put("subscriptionId", subscriptionId.toString());
    out.put("status", status);
    out.put("trialEndsAt", trialEnd.toString());
    out.put("stripeSubscriptionId", stripeSub.subscriptionId());
    if (stripeSub.clientSecret() != null) {
      out.put("clientSecret", stripeSub.clientSecret());
    }
    return out;
  }

  public Map<String, Object> getSubscription(AccountPrincipal principal) {
    access.requireParent(principal);
    List<Map<String, Object>> rows = jdbc.query(
        """
        SELECT s.subscription_id, s.plan_id, p.display_name, s.status, s.billing_cycle,
               s.trial_ends_at, s.current_period_end, s.cancel_at_period_end, s.grace_until,
               s.family_discount_pct, bc.default_pm_brand, bc.default_pm_last4
        FROM subscription s
        JOIN pricing_plan p ON p.plan_id = s.plan_id
        LEFT JOIN billing_customer bc ON bc.account_id = s.account_id
        WHERE s.account_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("subscriptionId", rs.getObject("subscription_id").toString());
          m.put("planId", rs.getLong("plan_id"));
          m.put("planName", rs.getString("display_name"));
          m.put("status", rs.getString("status"));
          m.put("billingCycle", rs.getString("billing_cycle"));
          m.put("trialEndsAt", ts(rs.getTimestamp("trial_ends_at")));
          m.put("currentPeriodEnd", ts(rs.getTimestamp("current_period_end")));
          m.put("cancelAtPeriodEnd", rs.getBoolean("cancel_at_period_end"));
          m.put("graceUntil", ts(rs.getTimestamp("grace_until")));
          m.put("familyDiscountPct", rs.getBigDecimal("family_discount_pct"));
          m.put("cardBrand", rs.getString("default_pm_brand"));
          m.put("cardLast4", rs.getString("default_pm_last4"));
          return m;
        },
        principal.accountId());
    if (rows.isEmpty()) {
      return Map.of("subscription", null, "items", List.of());
    }
    UUID sid = UUID.fromString(rows.get(0).get("subscriptionId").toString());
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT student_id, subject_id, qualification_id FROM subscription_item
        WHERE subscription_id = ? AND removed_at IS NULL
        """,
        (rs, i) -> Map.of(
            "studentId", rs.getObject("student_id").toString(),
            "subjectId", rs.getLong("subject_id"),
            "qualificationId", rs.getLong("qualification_id")),
        sid);
    return Map.of("subscription", rows.get(0), "items", items);
  }

  @Transactional
  public Map<String, Object> patchSubscription(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    // W2: accept cycle change only; subject change is W3 (C-05)
    String cycle = str(body, "billingCycle", null);
    UUID sid = currentSubscriptionId(principal.accountId());
    if (cycle != null) {
      jdbc.update("UPDATE subscription SET billing_cycle = ?, updated_at = now() WHERE subscription_id = ?", cycle, sid);
    }
    return getSubscription(principal);
  }

  public Map<String, Object> cancelPreview(AccountPrincipal principal) {
    access.requireParent(principal);
    var sub = getSubscription(principal);
    @SuppressWarnings("unchecked")
    Map<String, Object> s = (Map<String, Object>) sub.get("subscription");
    if (s == null) {
      throw AppException.notFound("No subscription");
    }
    return Map.of(
        "endsAt", s.get("currentPeriodEnd"),
        "keepsAccessUntil", s.get("currentPeriodEnd"),
        "message", "Access continues until the end of the current period. No dark patterns.");
  }

  @Transactional
  public Map<String, Object> cancel(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    UUID sid = currentSubscriptionId(principal.accountId());
    String reason = str(body, "reason", null);
    String stripeId = jdbc.queryForObject(
        "SELECT stripe_subscription_id FROM subscription WHERE subscription_id = ?", String.class, sid);
    if (stripeId != null) {
      payments.cancelAtPeriodEnd(stripeId);
    }
    jdbc.update(
        """
        UPDATE subscription SET cancel_at_period_end = TRUE, cancel_reason = ?, updated_at = now()
        WHERE subscription_id = ?
        """,
        reason, sid);
    enqueueNotification(principal.accountId(), "BILLING", "Cancellation scheduled at period end");
    return Map.of("status", "CANCEL_SCHEDULED", "subscriptionId", sid.toString());
  }

  @Transactional
  public Map<String, Object> reactivate(AccountPrincipal principal) {
    access.requireParent(principal);
    UUID sid = currentSubscriptionId(principal.accountId());
    String stripeId = jdbc.queryForObject(
        "SELECT stripe_subscription_id FROM subscription WHERE subscription_id = ?", String.class, sid);
    if (stripeId != null) {
      payments.reactivate(stripeId);
    }
    jdbc.update(
        "UPDATE subscription SET cancel_at_period_end = FALSE, cancel_reason = NULL, updated_at = now() WHERE subscription_id = ?",
        sid);
    return Map.of("status", "ACTIVE", "subscriptionId", sid.toString());
  }

  public Map<String, Object> listInvoices(AccountPrincipal principal) {
    access.requireParent(principal);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT invoice_id, number, status, currency, subtotal_pence, discount_pence, vat_pence, total_pence,
               issued_at, paid_at, period_start, period_end
        FROM invoice WHERE account_id = ?
        ORDER BY issued_at DESC NULLS LAST
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("invoiceId", rs.getObject("invoice_id").toString());
          m.put("number", rs.getString("number"));
          m.put("status", rs.getString("status"));
          m.put("currency", rs.getString("currency"));
          m.put("subtotalPence", rs.getInt("subtotal_pence"));
          m.put("discountPence", rs.getInt("discount_pence"));
          m.put("vatPence", rs.getInt("vat_pence"));
          m.put("totalPence", rs.getInt("total_pence"));
          m.put("issuedAt", ts(rs.getTimestamp("issued_at")));
          m.put("paidAt", ts(rs.getTimestamp("paid_at")));
          m.put("periodStart", ts(rs.getTimestamp("period_start")));
          m.put("periodEnd", ts(rs.getTimestamp("period_end")));
          return m;
        },
        principal.accountId());
    return Map.of("items", items);
  }

  public Map<String, Object> invoicePdf(AccountPrincipal principal, UUID invoiceId) {
    access.requireParent(principal);
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM invoice WHERE invoice_id = ? AND account_id = ?",
        Integer.class, invoiceId, principal.accountId());
    if (n == null || n == 0) {
      throw AppException.notFound("Invoice not found");
    }
    return Map.of(
        "invoiceId", invoiceId.toString(),
        "url", "/api/v1/billing/invoices/" + invoiceId + "/pdf",
        "expiresInSeconds", 300,
        "note", "Pilot: PDF placeholder URL (no PAN stored)");
  }

  public Map<String, Object> dunning(AccountPrincipal principal) {
    access.requireParent(principal);
    List<Map<String, Object>> rows = jdbc.query(
        """
        SELECT s.subscription_id, s.status, s.grace_until,
               (SELECT MAX(dunning_step) FROM payment_attempt pa WHERE pa.subscription_id = s.subscription_id) AS step
        FROM subscription s
        WHERE s.account_id = ?
        ORDER BY s.created_at DESC LIMIT 1
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("subscriptionId", rs.getObject("subscription_id").toString());
          m.put("status", rs.getString("status"));
          m.put("graceUntil", ts(rs.getTimestamp("grace_until")));
          int step = rs.getInt("step");
          m.put("dunningStep", step);
          m.put("dunningLabel", DunningStateMachine.fromNumber(step).name());
          Instant grace = rs.getTimestamp("grace_until") == null ? null : rs.getTimestamp("grace_until").toInstant();
          m.put("childKeepsAccess", EntitlementMath.grantsAccess(
              rs.getString("status"), false, DunningStateMachine.withinGrace(grace, Instant.now())));
          return m;
        },
        principal.accountId());
    if (rows.isEmpty()) {
      return Map.of("dunning", null);
    }
    return Map.of("dunning", rows.get(0));
  }

  @Transactional
  public Map<String, Object> handleStripeWebhook(String payload, String signature) {
    if (!payments.verifyWebhookSignature(payload, signature)) {
      throw AppException.unauthorized("WEBHOOK_INVALID", "Invalid Stripe signature");
    }
    Map<String, Object> event = payments.parseWebhookEvent(payload);
    String eventId = String.valueOf(event.getOrDefault("id", "evt_" + UUID.randomUUID()));
    String type = String.valueOf(event.getOrDefault("type", "unknown"));
    Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM stripe_event WHERE stripe_event_id = ?", Integer.class, eventId);
    if (exists != null && exists > 0) {
      return Map.of("status", "DUPLICATE", "eventId", eventId);
    }
    try {
      jdbc.update(
          "INSERT INTO stripe_event (stripe_event_id, type, payload, received_at) VALUES (?,?,?::jsonb,now())",
          eventId, type, mapper.writeValueAsString(event));
    } catch (Exception e) {
      jdbc.update(
          "INSERT INTO stripe_event (stripe_event_id, type, payload, received_at) VALUES (?,?,?::jsonb,now())",
          eventId, type, "{}");
    }
    applyWebhook(type, event);
    jdbc.update("UPDATE stripe_event SET processed_at = now() WHERE stripe_event_id = ?", eventId);
    return Map.of("status", "PROCESSED", "eventId", eventId, "type", type);
  }

  @SuppressWarnings("unchecked")
  private void applyWebhook(String type, Map<String, Object> event) {
    Map<String, Object> data = (Map<String, Object>) event.getOrDefault("data", Map.of());
    Map<String, Object> obj = (Map<String, Object>) data.getOrDefault("object", Map.of());
    if ("invoice.payment_failed".equals(type) || "invoice.payment_action_required".equals(type)) {
      String stripeSub = str(obj, "subscription", null);
      if (stripeSub == null) return;
      UUID sid = jdbc.query(
          "SELECT subscription_id FROM subscription WHERE stripe_subscription_id = ?",
          rs -> rs.next() ? (UUID) rs.getObject(1) : null,
          stripeSub);
      if (sid == null) return;
      int graceDays = configInt("billing.dunning_grace_days", 14);
      Instant grace = DunningStateMachine.graceUntil(Instant.now(), graceDays);
      Integer prev = jdbc.query(
          "SELECT COALESCE(MAX(dunning_step),0) FROM payment_attempt WHERE subscription_id = ?",
          rs -> rs.next() ? rs.getInt(1) : 0,
          sid);
      var next = DunningStateMachine.next(DunningStateMachine.fromNumber(prev == null ? 0 : prev));
      jdbc.update(
          """
          INSERT INTO payment_attempt (attempt_id, subscription_id, status, failure_code, dunning_step, next_retry_at)
          VALUES (?,?, 'FAILED', ?, ?, now() + interval '3 days')
          """,
          UUID.randomUUID(), sid, str(obj, "billing_reason", "payment_failed"),
          DunningStateMachine.stepNumber(next));
      jdbc.update(
          "UPDATE subscription SET status = 'PAST_DUE', grace_until = ?, updated_at = now() WHERE subscription_id = ?",
          Timestamp.from(grace), sid);
      UUID accountId = jdbc.queryForObject(
          "SELECT account_id FROM subscription WHERE subscription_id = ?", UUID.class, sid);
      enqueueNotification(accountId, "BILLING", "Payment failed — update card; child keeps access during grace");
      grantEntitlements(sid); // GRACE source
    } else if ("invoice.paid".equals(type) || "customer.subscription.updated".equals(type)) {
      String stripeSub = str(obj, "subscription", str(obj, "id", null));
      if (stripeSub == null) return;
      UUID sid = jdbc.query(
          "SELECT subscription_id FROM subscription WHERE stripe_subscription_id = ?",
          rs -> rs.next() ? (UUID) rs.getObject(1) : null,
          stripeSub);
      if (sid == null) return;
      String st = mapStripeStatus(str(obj, "status", "active"));
      jdbc.update(
          "UPDATE subscription SET status = ?, grace_until = NULL, updated_at = now() WHERE subscription_id = ?",
          st, sid);
      maybeRecordInvoice(sid, obj);
      grantEntitlements(sid);
    } else if ("customer.subscription.deleted".equals(type)) {
      String stripeSub = str(obj, "id", null);
      if (stripeSub == null) return;
      jdbc.update(
          "UPDATE subscription SET status = 'CANCELLED', cancelled_at = now(), updated_at = now() WHERE stripe_subscription_id = ?",
          stripeSub);
      UUID sid = jdbc.query(
          "SELECT subscription_id FROM subscription WHERE stripe_subscription_id = ?",
          rs -> rs.next() ? (UUID) rs.getObject(1) : null,
          stripeSub);
      if (sid != null) {
        revokeSubscriptionEntitlements(sid);
      }
    }
  }

  private void maybeRecordInvoice(UUID subscriptionId, Map<String, Object> obj) {
    String stripeInvoiceId = str(obj, "id", null);
    if (stripeInvoiceId == null || !stripeInvoiceId.startsWith("in_")) {
      // create synthetic invoice for fake provider demos
      stripeInvoiceId = "in_fake_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
    Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM invoice WHERE stripe_invoice_id = ?", Integer.class, stripeInvoiceId);
    if (exists != null && exists > 0) return;
    UUID accountId = jdbc.queryForObject(
        "SELECT account_id FROM subscription WHERE subscription_id = ?", UUID.class, subscriptionId);
    long total = longVal(obj.getOrDefault("amount_paid", 0));
    if (total == 0) total = 3999;
    jdbc.update(
        """
        INSERT INTO invoice (invoice_id, account_id, subscription_id, stripe_invoice_id, number, status,
          currency, subtotal_pence, discount_pence, vat_pence, total_pence, lines_json, issued_at, paid_at)
        VALUES (?,?,?,?,?, 'PAID', 'GBP', ?, 0, 0, ?, '[]'::jsonb, now(), now())
        """,
        UUID.randomUUID(), accountId, subscriptionId, stripeInvoiceId,
        "INV-" + stripeInvoiceId.substring(Math.max(0, stripeInvoiceId.length() - 8)),
        (int) total, (int) total);
  }

  public void grantEntitlements(UUID subscriptionId) {
    Map<String, Object> sub = jdbc.query(
        """
        SELECT status, grace_until, cancel_at_period_end, plan_id FROM subscription WHERE subscription_id = ?
        """,
        rs -> {
          if (!rs.next()) return null;
          Map<String, Object> m = new HashMap<>();
          m.put("status", rs.getString("status"));
          m.put("grace", rs.getTimestamp("grace_until"));
          m.put("cancel", rs.getBoolean("cancel_at_period_end"));
          m.put("planId", rs.getLong("plan_id"));
          return m;
        },
        subscriptionId);
    if (sub == null) return;
    String status = (String) sub.get("status");
    Timestamp graceTs = (Timestamp) sub.get("grace");
    boolean withinGrace = DunningStateMachine.withinGrace(
        graceTs == null ? null : graceTs.toInstant(), Instant.now());
    boolean ok = EntitlementMath.grantsAccess(status, (Boolean) sub.get("cancel"), withinGrace);
    Boolean includesMock = jdbc.query(
        "SELECT includes_mock_tests FROM pricing_plan WHERE plan_id = ?",
        rs -> rs.next() && rs.getBoolean(1),
        sub.get("planId"));
    String source = "TRIALING".equals(status) ? "TRIAL" : (withinGrace && "PAST_DUE".equals(status) ? "GRACE" : "SUBSCRIPTION");
    List<Map<String, Object>> items = jdbc.queryForList(
        "SELECT student_id, subject_id, qualification_id FROM subscription_item WHERE subscription_id = ? AND removed_at IS NULL",
        subscriptionId);
    for (var it : items) {
      UUID studentId = (UUID) it.get("student_id");
      long subjectId = ((Number) it.get("subject_id")).longValue();
      long qualificationId = ((Number) it.get("qualification_id")).longValue();
      // remove prior complimentary stub for same subject
      jdbc.update(
          """
          DELETE FROM entitlement WHERE student_id = ? AND subject_id = ? AND qualification_id = ?
            AND source = 'COMPLIMENTARY'
          """,
          studentId, subjectId, qualificationId);
      if (ok) {
        jdbc.update(
            """
            INSERT INTO entitlement (entitlement_id, student_id, subject_id, qualification_id, source, includes_mock_tests)
            VALUES (?,?,?,?,?,?)
            ON CONFLICT (student_id, subject_id, qualification_id, source)
            DO UPDATE SET includes_mock_tests = EXCLUDED.includes_mock_tests, valid_from = now(), valid_until = NULL
            """,
            UUID.randomUUID(), studentId, subjectId, qualificationId, source,
            Boolean.TRUE.equals(includesMock));
      } else {
        jdbc.update(
            "DELETE FROM entitlement WHERE student_id = ? AND subject_id = ? AND qualification_id = ? AND source IN ('TRIAL','SUBSCRIPTION','GRACE')",
            studentId, subjectId, qualificationId);
      }
    }
  }

  private void revokeSubscriptionEntitlements(UUID subscriptionId) {
    List<Map<String, Object>> items = jdbc.queryForList(
        "SELECT student_id, subject_id, qualification_id FROM subscription_item WHERE subscription_id = ?",
        subscriptionId);
    for (var it : items) {
      jdbc.update(
          "DELETE FROM entitlement WHERE student_id = ? AND subject_id = ? AND qualification_id = ? AND source IN ('TRIAL','SUBSCRIPTION','GRACE')",
          it.get("student_id"), it.get("subject_id"), it.get("qualification_id"));
    }
  }

  private String ensureBillingCustomer(AccountPrincipal principal) {
    String existing = jdbc.query(
        "SELECT stripe_customer_id FROM billing_customer WHERE account_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        principal.accountId());
    if (existing != null) return existing;
    String email = jdbc.query(
        "SELECT email FROM account WHERE account_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        principal.accountId());
    var cust = payments.ensureCustomer(principal.accountId(), email);
    jdbc.update(
        "INSERT INTO billing_customer (account_id, stripe_customer_id) VALUES (?,?)",
        principal.accountId(), cust.customerId());
    return cust.customerId();
  }

  private void ensureEmailVerified(UUID accountId) {
    Timestamp verified = jdbc.query(
        "SELECT email_verified_at FROM account WHERE account_id = ?",
        rs -> rs.next() ? rs.getTimestamp(1) : null,
        accountId);
    if (verified == null) {
      throw AppException.badRequest("EMAIL_UNVERIFIED", "Verify email before starting a trial");
    }
  }

  private UUID currentSubscriptionId(UUID accountId) {
    UUID sid = jdbc.query(
        "SELECT subscription_id FROM subscription WHERE account_id = ? ORDER BY created_at DESC LIMIT 1",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        accountId);
    if (sid == null) throw AppException.notFound("No subscription");
    return sid;
  }

  private int validatePromoPercent(String code) {
    Integer pct = jdbc.query(
        """
        SELECT percent_off::int FROM promo_code
        WHERE upper(code) = upper(?) AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
          AND (max_redemptions IS NULL OR redeemed_count < max_redemptions)
        """,
        rs -> rs.next() ? rs.getInt(1) : null,
        code);
    if (pct == null) {
      throw AppException.badRequest("PROMO_INVALID", "Promo code not valid");
    }
    return pct;
  }

  private int configInt(String key, int def) {
    String v = jdbc.query(
        "SELECT value_json::text FROM app_config WHERE config_key = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        key);
    if (v == null) return def;
    v = v.replace("\"", "").trim();
    try {
      return Integer.parseInt(v);
    } catch (NumberFormatException e) {
      return def;
    }
  }

  private void enqueueNotification(UUID accountId, String kind, String body) {
    jdbc.update(
        """
        INSERT INTO notification (notification_id, recipient_account_id, kind, title, body, created_at)
        VALUES (?,?,?,?,?, now())
        """,
        UUID.randomUUID(), accountId, kind, "Billing", body);
  }

  private static String mapStripeStatus(String s) {
    if (s == null) return "INCOMPLETE";
    return switch (s.toLowerCase()) {
      case "trialing" -> "TRIALING";
      case "active" -> "ACTIVE";
      case "past_due" -> "PAST_DUE";
      case "canceled", "cancelled" -> "CANCELLED";
      case "paused" -> "PAUSED";
      default -> "INCOMPLETE";
    };
  }

  private static String str(Map<String, Object> body, String key, String def) {
    Object v = body.get(key);
    return v == null ? def : v.toString();
  }

  private static long longVal(Object o) {
    if (o == null) throw AppException.badRequest("VALIDATION_FAILED", "numeric field required");
    return Long.parseLong(o.toString());
  }

  private static String ts(Timestamp t) {
    return t == null ? null : t.toInstant().toString();
  }
}
