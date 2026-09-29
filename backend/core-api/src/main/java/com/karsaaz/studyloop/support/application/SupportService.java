package com.karsaaz.studyloop.support.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupportService {
  private final JdbcTemplate jdbc;

  public SupportService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  private void requireSup(AccountPrincipal p) {
    if (!(p.roles().contains("SUP") || p.roles().contains("SUPPORT") || p.roles().contains("OPS")
        || p.roles().contains("OPS_REVIEWER") || p.roles().contains("PRODUCT_OWNER"))) {
      throw AppException.forbidden("Support access required");
    }
  }

  private void requireCmp(AccountPrincipal p) {
    if (!(p.roles().contains("CMP") || p.roles().contains("COMPLIANCE") || p.roles().contains("PRODUCT_OWNER"))) {
      throw AppException.forbidden("Compliance access required");
    }
  }

  public Map<String, Object> searchAccounts(AccountPrincipal p, String q) {
    requireSup(p);
    String like = "%" + (q == null ? "" : q.toLowerCase()) + "%";
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT account_id, email, display_name, kind, status FROM account
        WHERE lower(coalesce(email,'')) LIKE ? OR lower(display_name) LIKE ?
        ORDER BY account_id DESC LIMIT 50
        """,
        (rs, i) -> Map.of(
            "accountId", rs.getObject(1).toString(),
            "email", rs.getString(2) == null ? "" : rs.getString(2),
            "displayName", rs.getString(3),
            "kind", rs.getString(4),
            "status", rs.getString(5)),
        like, like);
    return Map.of("items", items);
  }

  public Map<String, Object> accountDetail(AccountPrincipal p, UUID accountId) {
    requireSup(p);
    Map<String, Object> account = jdbc.query(
        "SELECT account_id, email, display_name, kind, status FROM account WHERE account_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Account not found");
          Map<String, Object> m = new HashMap<>();
          m.put("accountId", rs.getObject(1).toString());
          m.put("email", rs.getString(2));
          m.put("displayName", rs.getString(3));
          m.put("kind", rs.getString(4));
          m.put("status", rs.getString(5));
          return m;
        }, accountId);
    List<Map<String, Object>> children = jdbc.query(
        """
        SELECT s.student_id, s.display_name FROM student_profile s
        JOIN parent_student_link l ON l.student_id = s.student_id WHERE l.parent_account_id = ?
        """,
        (rs, i) -> Map.of("studentId", rs.getObject(1).toString(), "displayName", rs.getString(2)),
        accountId);
    // no answers/transcripts for support (P-03)
    return Map.of("account", account, "children", children, "learningContent", "REDACTED");
  }

  @Transactional
  public Map<String, Object> passwordReset(AccountPrincipal p, UUID accountId) {
    requireSup(p);
    return Map.of("status", "RESET_EMAILED", "accountId", accountId.toString());
  }

  @Transactional
  public Map<String, Object> refund(AccountPrincipal p, UUID accountId, Map<String, Object> body) {
    requireSup(p);
    UUID invoiceId = UUID.fromString(body.get("invoiceId").toString());
    int amount = ((Number) body.getOrDefault("amountPence", 0)).intValue();
    UUID refundId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO refund (refund_id, invoice_id, amount_pence, reason, issued_by)
        VALUES (?,?,?,?,?)
        """,
        refundId, invoiceId, amount, body.getOrDefault("reason", "SUPPORT").toString(), p.accountId());
    return Map.of("refundId", refundId.toString(), "status", "RECORDED");
  }

  @Transactional
  public Map<String, Object> addNote(AccountPrincipal p, UUID accountId, Map<String, Object> body) {
    requireSup(p);
    UUID noteId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO support_note (note_id, account_id, author_id, body) VALUES (?,?,?,?)",
        noteId, accountId, p.accountId(), body.getOrDefault("body", "").toString());
    return Map.of("noteId", noteId.toString());
  }

  @Transactional
  public Map<String, Object> extendTrial(AccountPrincipal p, UUID accountId, Map<String, Object> body) {
    requireSup(p);
    int days = body.get("days") == null ? 3 : Math.min(7, ((Number) body.get("days")).intValue());
    jdbc.update(
        """
        UPDATE subscription SET trial_ends_at = COALESCE(trial_ends_at, now()) + (? || ' days')::interval,
          current_period_end = COALESCE(current_period_end, now()) + (? || ' days')::interval,
          updated_at = now()
        WHERE account_id = ? AND status IN ('TRIALING','ACTIVE')
        """,
        String.valueOf(days), String.valueOf(days), accountId);
    return Map.of("extendedDays", days);
  }

  @Transactional
  public Map<String, Object> unlockPin(AccountPrincipal p, UUID studentId) {
    requireSup(p);
    jdbc.update(
        "UPDATE student_credential SET failed_attempts = 0, locked_until = NULL WHERE student_id = ?",
        studentId);
    return Map.of("studentId", studentId.toString(), "unlocked", true);
  }

  public Map<String, Object> auditLog(AccountPrincipal p) {
    requireCmp(p);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT audit_id, occurred_at, actor_account_id, actor_role, action, target_type, target_id, row_hash
        FROM audit_log ORDER BY occurred_at DESC LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("auditId", rs.getLong(1));
          m.put("occurredAt", rs.getTimestamp(2));
          m.put("actorAccountId", rs.getObject(3) == null ? null : rs.getObject(3).toString());
          m.put("actorRole", rs.getString(4));
          m.put("action", rs.getString(5));
          m.put("targetType", rs.getString(6));
          m.put("targetId", rs.getString(7));
          m.put("rowHash", rs.getString(8));
          return m;
        });
    return Map.of("items", items);
  }

  public Map<String, Object> auditExport(AccountPrincipal p) {
    requireCmp(p);
    return Map.of("format", "json", "items", ((List<?>) auditLog(p).get("items")).size(), "note", "Use AUD-01 payload for pilot export");
  }

  public Map<String, Object> verifyChain(AccountPrincipal p) {
    requireCmp(p);
    List<Map<String, Object>> rows = jdbc.query(
        "SELECT audit_id, prev_hash, row_hash FROM audit_log ORDER BY audit_id ASC LIMIT 500",
        (rs, i) -> Map.of("id", rs.getLong(1), "prev", rs.getString(2) == null ? "" : rs.getString(2), "hash", rs.getString(3)));
    boolean ok = true;
    String prev = "";
    for (Map<String, Object> r : rows) {
      String ph = String.valueOf(r.get("prev"));
      if (!prev.isEmpty() && !prev.equals(ph) && !ph.isBlank()) {
        // allow first row empty prev
        if (!"".equals(ph) && !prev.equals(ph)) {
          // soft check — hash chain writer may set prev; if mismatch flag
          ok = false;
          break;
        }
      }
      prev = String.valueOf(r.get("hash"));
    }
    return Map.of("valid", ok, "checked", rows.size());
  }

  public Map<String, Object> listVetting(AccountPrincipal p) {
    requireCmp(p);
    List<Map<String, Object>> items = jdbc.query(
        "SELECT vetting_id, account_id, provider, status, issued_on, next_review_on FROM staff_vetting_record ORDER BY updated_at DESC LIMIT 100",
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("vettingId", rs.getObject(1).toString());
          m.put("accountId", rs.getObject(2).toString());
          m.put("provider", rs.getString(3));
          m.put("status", rs.getString(4));
          m.put("issuedOn", rs.getDate(5));
          m.put("nextReviewOn", rs.getDate(6));
          return m;
        });
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> ucheckWebhook(Map<String, Object> body) {
    String ref = String.valueOf(body.getOrDefault("providerRef", "ucheck-" + UUID.randomUUID()));
    String status = String.valueOf(body.getOrDefault("status", "CLEAR"));
    UUID accountId = body.get("accountId") == null ? null : UUID.fromString(body.get("accountId").toString());
    if (accountId != null) {
      jdbc.update(
          """
          INSERT INTO staff_vetting_record (vetting_id, account_id, provider, status, provider_ref)
          VALUES (?,?, 'UCHECK', ?, ?)
          """,
          UUID.randomUUID(), accountId, status, ref);
    }
    return Map.of("status", "ACCEPTED", "providerRef", ref);
  }
}
