package com.karsaaz.studyloop.safety.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import com.karsaaz.studyloop.safety.domain.SafetyDecision;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SafetyService {
  private final JdbcTemplate jdbc;

  public SafetyService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @Transactional
  public Map<String, Object> classifyInternal(Map<String, Object> body) {
    String text = body.get("text") == null ? "" : body.get("text").toString();
    String direction = body.getOrDefault("direction", "LEARNER_INPUT").toString();
    UUID studentId = body.get("studentId") == null ? null : UUID.fromString(body.get("studentId").toString());
    UUID tutorSessionId = body.get("tutorSessionId") == null ? null : UUID.fromString(body.get("tutorSessionId").toString());
    UUID messageId = body.get("tutorMessageId") == null ? null : UUID.fromString(body.get("tutorMessageId").toString());
    SafetyDecision.Result decision;
    try {
      decision = SafetyDecision.classify(text);
    } catch (Exception e) {
      decision = SafetyDecision.failClosed();
    }
    UUID classificationId = UUID.randomUUID();
    String actionTaken = switch (decision.action()) {
      case ALLOW -> "NONE";
      case SCRIPTED_SUPPORT_AND_ESCALATE -> "ESCALATE";
      case BLOCK -> "BLOCK";
    };
    jdbc.update(
        """
        INSERT INTO safety_classification (classification_id, tutor_message_id, direction, categories_json, severity, welfare_disclosure, action_taken, prompt_version, created_at)
        VALUES (?,?,?,?::jsonb,?,?,?, 'local-scripted-v1', now())
        """,
        classificationId, messageId, direction,
        "{\"category\":\"" + decision.category() + "\"}",
        decision.severity(),
        decision.action() != SafetyDecision.Action.ALLOW,
        actionTaken);
    Map<String, Object> out = new HashMap<>();
    out.put("classificationId", classificationId.toString());
    out.put("action", decision.action().name());
    out.put("severity", decision.severity());
    out.put("category", decision.category());
    out.put("templateId", decision.templateId());
    out.put("scriptedText", decision.scriptedText());
    if (decision.action() != SafetyDecision.Action.ALLOW && studentId != null) {
      UUID flagId = UUID.randomUUID();
      String flagRef = "SF-" + flagId.toString().substring(0, 8).toUpperCase();
      Instant sla = slaDue(decision.severity());
      jdbc.update(
          """
          INSERT INTO safety_flag (flag_id, flag_ref, classification_id, student_id, tutor_session_id, category, severity, status, excerpt_redacted, sla_due_at)
          VALUES (?,?,?,?,?,?,?, 'NEW', ?, ?)
          """,
          flagId, flagRef, classificationId, studentId, tutorSessionId, decision.category(), decision.severity(),
          redact(text), Timestamp.from(sla));
      out.put("flagId", flagId.toString());
      out.put("flagRef", flagRef);
      out.put("slaDueAt", sla.toString());
    }
    return out;
  }

  public Map<String, Object> listFlags(AccountPrincipal principal) {
    requireDslOrCmp(principal);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT flag_id, flag_ref, category, severity, status, excerpt_redacted, sla_due_at, created_at
        FROM safety_flag ORDER BY created_at DESC LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("flagId", rs.getObject("flag_id").toString());
          m.put("flagRef", rs.getString("flag_ref"));
          m.put("category", rs.getString("category"));
          m.put("severity", rs.getString("severity"));
          m.put("status", rs.getString("status"));
          m.put("excerptRedacted", rs.getString("excerpt_redacted"));
          m.put("slaDueAt", rs.getTimestamp("sla_due_at"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
    return Map.of("items", items);
  }

  public Map<String, Object> getFlag(AccountPrincipal principal, UUID flagId) {
    requireDsl(principal);
    return jdbc.query(
        """
        SELECT f.flag_id, f.flag_ref, f.category, f.severity, f.status, f.excerpt_redacted, f.sla_due_at,
               c.categories_json, c.action_taken
        FROM safety_flag f JOIN safety_classification c ON c.classification_id = f.classification_id
        WHERE f.flag_id = ?
        """,
        rs -> {
          if (!rs.next()) throw AppException.notFound("Flag not found");
          Map<String, Object> m = new HashMap<>();
          m.put("flagId", rs.getObject("flag_id").toString());
          m.put("flagRef", rs.getString("flag_ref"));
          m.put("category", rs.getString("category"));
          m.put("severity", rs.getString("severity"));
          m.put("status", rs.getString("status"));
          m.put("excerptRedacted", rs.getString("excerpt_redacted"));
          m.put("slaDueAt", rs.getTimestamp("sla_due_at"));
          m.put("classifierAction", rs.getString("action_taken"));
          return m;
        },
        flagId);
  }

  @Transactional
  public Map<String, Object> triage(AccountPrincipal principal, UUID flagId, Map<String, Object> body) {
    requireDsl(principal);
    String note = body.getOrDefault("note", "").toString();
    String disposition = body.getOrDefault("disposition", "DISMISSED").toString();
    jdbc.update(
        """
        UPDATE safety_flag SET status = ?, disposition_note = ?, triaged_by = ?, triaged_at = now()
        WHERE flag_id = ?
        """,
        disposition, note, principal.accountId(), flagId);
    return Map.of("flagId", flagId.toString(), "status", disposition);
  }

  @Transactional
  public Map<String, Object> escalate(AccountPrincipal principal, UUID flagId, Map<String, Object> body) {
    requireDsl(principal);
    Map<String, Object> flag = jdbc.query(
        "SELECT student_id, category, severity FROM safety_flag WHERE flag_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Flag not found");
          return Map.of(
              "studentId", (UUID) rs.getObject("student_id"),
              "category", rs.getString("category"),
              "severity", rs.getString("severity"));
        },
        flagId);
    UUID disclosureId = UUID.randomUUID();
    UUID studentId = (UUID) flag.get("studentId");
    UUID schoolId = jdbc.query(
        "SELECT school_id FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        studentId);
    Instant sla = Instant.now().plus(4, ChronoUnit.HOURS);
    jdbc.update(
        """
        INSERT INTO safeguarding_disclosure_log (disclosure_id, flag_id, student_id, school_id, dsl_account_id, category, status, summary, sla_due_at)
        VALUES (?,?,?,?,?,?,'OPEN',?,?)
        """,
        disclosureId, flagId, studentId, schoolId, principal.accountId(), flag.get("category"),
        body.getOrDefault("summary", "Escalated from safety flag").toString(), Timestamp.from(sla));
    jdbc.update("UPDATE safety_flag SET status = 'ESCALATED', triaged_by = ?, triaged_at = now() WHERE flag_id = ?",
        principal.accountId(), flagId);
    return Map.of("disclosureId", disclosureId.toString(), "status", "OPEN");
  }

  public Map<String, Object> listDisclosures(AccountPrincipal principal) {
    requireDsl(principal);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT disclosure_id, student_id, category, status, summary, sla_due_at, created_at
        FROM safeguarding_disclosure_log ORDER BY created_at DESC LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("disclosureId", rs.getObject("disclosure_id").toString());
          m.put("studentId", rs.getObject("student_id").toString());
          m.put("category", rs.getString("category"));
          m.put("status", rs.getString("status"));
          m.put("summary", rs.getString("summary"));
          m.put("slaDueAt", rs.getTimestamp("sla_due_at"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
    return Map.of("items", items);
  }

  public Map<String, Object> getDisclosure(AccountPrincipal principal, UUID disclosureId) {
    requireDsl(principal);
    return jdbc.query(
        "SELECT * FROM safeguarding_disclosure_log WHERE disclosure_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Disclosure not found");
          Map<String, Object> m = new HashMap<>();
          m.put("disclosureId", rs.getObject("disclosure_id").toString());
          m.put("studentId", rs.getObject("student_id").toString());
          m.put("schoolId", rs.getObject("school_id") == null ? null : rs.getObject("school_id").toString());
          m.put("category", rs.getString("category"));
          m.put("status", rs.getString("status"));
          m.put("summary", rs.getString("summary"));
          m.put("referralTarget", rs.getString("referral_target"));
          m.put("slaDueAt", rs.getTimestamp("sla_due_at"));
          return m;
        },
        disclosureId);
  }

  @Transactional
  public Map<String, Object> addAction(AccountPrincipal principal, UUID disclosureId, Map<String, Object> body) {
    requireDsl(principal);
    UUID actionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO safeguarding_action (action_id, disclosure_id, actor_account_id, action_type, note)
        VALUES (?,?,?,?,?)
        """,
        actionId, disclosureId, principal.accountId(),
        body.getOrDefault("actionType", "NOTE").toString(),
        body.getOrDefault("note", "").toString());
    jdbc.update("UPDATE safeguarding_disclosure_log SET status = 'ACTIONED' WHERE disclosure_id = ?", disclosureId);
    return Map.of("actionId", actionId.toString());
  }

  @Transactional
  public Map<String, Object> closeDisclosure(AccountPrincipal principal, UUID disclosureId, Map<String, Object> body) {
    requireDsl(principal);
    jdbc.update(
        "UPDATE safeguarding_disclosure_log SET status = 'CLOSED', closed_at = now(), referral_target = COALESCE(?, referral_target) WHERE disclosure_id = ?",
        body.get("referralTarget") == null ? null : body.get("referralTarget").toString(),
        disclosureId);
    return Map.of("disclosureId", disclosureId.toString(), "status", "CLOSED");
  }

  public Map<String, Object> metrics(AccountPrincipal principal) {
    requireDslOrCmp(principal);
    Long openFlags = jdbc.queryForObject("SELECT COUNT(*) FROM safety_flag WHERE status IN ('NEW','TRIAGED','ESCALATED')", Long.class);
    Long openDisc = jdbc.queryForObject("SELECT COUNT(*) FROM safeguarding_disclosure_log WHERE status <> 'CLOSED'", Long.class);
    Long overdue = jdbc.queryForObject(
        "SELECT COUNT(*) FROM safety_flag WHERE status = 'NEW' AND sla_due_at < now()", Long.class);
    return Map.of("openFlags", openFlags, "openDisclosures", openDisc, "overdueFlags", overdue);
  }

  private Instant slaDue(String severity) {
    return switch (severity) {
      case "CRITICAL" -> Instant.now().plus(15, ChronoUnit.MINUTES);
      case "HIGH" -> Instant.now().plus(4, ChronoUnit.HOURS);
      default -> Instant.now().plus(24, ChronoUnit.HOURS);
    };
  }

  private static String redact(String text) {
    if (text == null) return "";
    String t = text.length() > 120 ? text.substring(0, 120) + "…" : text;
    return t.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", "[EMAIL]");
  }

  private void requireDsl(AccountPrincipal p) {
    if (!has(p, "DSL") && !StudentAccessHelper.hasComplianceRole(p.roles())) {
      // DSL role or CMP for read; escalate requires DSL — allow CMP+DSL codes
      if (!has(p, "COMPLIANCE")) throw AppException.forbidden("DSL access required");
    }
  }

  private void requireDslOrCmp(AccountPrincipal p) {
    if (!has(p, "DSL") && !StudentAccessHelper.hasComplianceRole(p.roles())) {
      throw AppException.forbidden("DSL or compliance access required");
    }
  }

  private static boolean has(AccountPrincipal p, String role) {
    return p.roles().contains(role);
  }
}
