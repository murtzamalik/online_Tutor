package com.karsaaz.studyloop.safety.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import com.karsaaz.studyloop.platform.application.AuditLogService;
import com.karsaaz.studyloop.safety.domain.SafetyDecision;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SafetyService {
  private static final Logger log = LoggerFactory.getLogger(SafetyService.class);

  private final JdbcTemplate jdbc;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final boolean llmEnabled;

  private final AuditLogService audit;

  /** Safeguarding decisions go into the hash-chained audit log (ids only, no learner text). */
  private void audit(AccountPrincipal p, String action, String targetType, Object targetId, Map<String, Object> meta) {
    String role = p.roles().isEmpty() ? "STAFF" : p.roles().get(0);
    audit.append(p.accountId(), role, action, targetType, String.valueOf(targetId), meta);
  }

  public SafetyService(
      JdbcTemplate jdbc,
      GatewayClient gateway,
      GatewayAiSupport ai,
      AuditLogService audit,
      @Value("${studyloop.safety.llm-enabled:true}") boolean llmEnabled) {
    this.audit = audit;
    this.jdbc = jdbc;
    this.gateway = gateway;
    this.ai = ai;
    this.llmEnabled = llmEnabled;
  }

  /** P-SF-01 on a learner message, before the tutor sees it. */
  @Transactional
  public Map<String, Object> classifyLearnerInput(
      UUID studentId, UUID tutorSessionId, String text, String recentContext, String yearBand) {
    Map<String, Object> vars = new HashMap<>();
    vars.put("student_message", GatewayAiSupport.redactPii(text));
    vars.put("recent_context", recentContext == null ? "" : recentContext);
    vars.put("year_band", yearBand == null ? "" : yearBand);
    return classify(text, "LEARNER_INPUT", "P-SF-01", vars, studentId, tutorSessionId, null);
  }

  /** P-SF-02 on a proposed tutor reply, before the child sees it. */
  @Transactional
  public Map<String, Object> classifyTutorOutput(
      UUID studentId,
      UUID tutorSessionId,
      String studentMessage,
      String reply,
      boolean liveQuestion,
      String finalAnswerKnown) {
    Map<String, Object> vars = new HashMap<>();
    vars.put("student_message", GatewayAiSupport.redactPii(studentMessage));
    vars.put("tutor_reply", reply == null ? "" : reply);
    vars.put("is_live_question", liveQuestion);
    vars.put("final_answer_known", finalAnswerKnown == null ? "" : finalAnswerKnown);
    return classify(reply, "TUTOR_OUTPUT", "P-SF-02", vars, studentId, tutorSessionId, null);
  }

  /**
   * The tutor model set {@code needs_safety_review}: show SG-T-04 and put the turn in the DSL queue,
   * even though the classifiers allowed it.
   */
  @Transactional
  public Map<String, Object> flagTutorConcern(UUID studentId, UUID tutorSessionId, String learnerText) {
    SafetyDecision.Result decision =
        new SafetyDecision.Result(
            SafetyDecision.Action.SCRIPTED_SUPPORT_AND_ESCALATE,
            "MEDIUM",
            "TUTOR_FLAGGED",
            "SG-T-04",
            SafetyDecision.script("SG-T-04"));
    return persist(decision, learnerText, "LEARNER_INPUT", "P-TU-01@needs_safety_review", studentId, tutorSessionId, null);
  }

  /** SAF-01 (SYS) entry point; same pipeline as the tutor module uses directly. */
  @Transactional
  public Map<String, Object> classifyInternal(Map<String, Object> body) {
    String text = body.get("text") == null ? "" : body.get("text").toString();
    String direction = body.getOrDefault("direction", "LEARNER_INPUT").toString();
    UUID studentId = body.get("studentId") == null ? null : UUID.fromString(body.get("studentId").toString());
    UUID tutorSessionId = body.get("tutorSessionId") == null ? null : UUID.fromString(body.get("tutorSessionId").toString());
    if ("TUTOR_OUTPUT".equals(direction)) {
      return classifyTutorOutput(
          studentId,
          tutorSessionId,
          String.valueOf(body.getOrDefault("studentMessage", "")),
          text,
          Boolean.TRUE.equals(body.get("isLiveQuestion")),
          body.get("finalAnswerKnown") == null ? null : body.get("finalAnswerKnown").toString());
    }
    return classifyLearnerInput(
        studentId,
        tutorSessionId,
        text,
        String.valueOf(body.getOrDefault("recentContext", "")),
        String.valueOf(body.getOrDefault("yearBand", "")));
  }

  /**
   * Keywords first (instant, never skipped); if they allow, the model classifier decides. Any
   * classifier failure fails closed (AGENTS.md rule 7).
   */
  private Map<String, Object> classify(
      String text,
      String direction,
      String promptId,
      Map<String, Object> vars,
      UUID studentId,
      UUID tutorSessionId,
      UUID messageId) {
    SafetyDecision.Result decision;
    String promptVersion = "local-scripted-v1";
    try {
      decision = SafetyDecision.classify(text);
    } catch (Exception e) {
      decision = SafetyDecision.failClosed();
    }
    if (decision.action() == SafetyDecision.Action.ALLOW && llmEnabled) {
      try {
        Map<?, ?> gw = gateway.run(promptId, vars, null);
        decision = SafetyDecision.fromModel(ai.requireResult(gw, promptId));
        promptVersion = promptId + "@" + gw.get("promptVersion");
      } catch (Exception e) {
        log.warn("{} classifier unavailable, failing closed: {}", promptId, e.getClass().getSimpleName());
        decision = SafetyDecision.failClosed();
        promptVersion = promptId + "@unavailable";
      }
    }
    return persist(decision, text, direction, promptVersion, studentId, tutorSessionId, messageId);
  }

  private Map<String, Object> persist(
      SafetyDecision.Result decision,
      String text,
      String direction,
      String promptVersion,
      UUID studentId,
      UUID tutorSessionId,
      UUID messageId) {
    UUID classificationId = UUID.randomUUID();
    String actionTaken = switch (decision.action()) {
      case ALLOW -> "NONE";
      case REDIRECT -> "REDIRECT";
      case SCRIPTED_SUPPORT_AND_ESCALATE -> "ESCALATE";
      case BLOCK -> "BLOCK";
    };
    jdbc.update(
        """
        INSERT INTO safety_classification (classification_id, tutor_message_id, direction, categories_json, severity, welfare_disclosure, action_taken, prompt_version, created_at)
        VALUES (?,?,?,?::jsonb,?,?,?,?, now())
        """,
        classificationId, messageId, direction,
        ai.toJson(Map.of("category", decision.category())),
        decision.severity(),
        decision.action() == SafetyDecision.Action.SCRIPTED_SUPPORT_AND_ESCALATE,
        actionTaken,
        promptVersion);
    Map<String, Object> out = new HashMap<>();
    out.put("classificationId", classificationId.toString());
    out.put("action", decision.action().name());
    out.put("severity", decision.severity());
    out.put("category", decision.category());
    out.put("templateId", decision.templateId());
    out.put("scriptedText", decision.scriptedText());
    // Only welfare concerns reach the DSL queue; classifier outages and redirects are not disclosures.
    if (decision.action() == SafetyDecision.Action.SCRIPTED_SUPPORT_AND_ESCALATE && studentId != null) {
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
    audit(principal, "SAFETY_FLAG_TRIAGED", "safety_flag", flagId, Map.of("status", disposition));
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
    audit(principal, "SAFETY_FLAG_ESCALATED", "safeguarding_disclosure", disclosureId, Map.of("flagId", flagId.toString()));
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
    Map<String, Object> d = jdbc.query(
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
    if (d == null) {
      throw AppException.notFound("Disclosure not found");
    }
    // Action history, oldest first, so the DSL sees what has already been done.
    d.put("actions", jdbc.query(
        """
        SELECT a.action_type, a.note, a.created_at, acc.display_name
        FROM safeguarding_action a LEFT JOIN account acc ON acc.account_id = a.actor_account_id
        WHERE a.disclosure_id = ? ORDER BY a.created_at
        """,
        (rs, k) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("actionType", rs.getString(1));
          m.put("note", rs.getString(2));
          m.put("createdAt", rs.getTimestamp(3));
          m.put("actor", rs.getString(4));
          return m;
        },
        disclosureId));
    return d;
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
    String type = body.getOrDefault("actionType", "NOTE").toString();
    jdbc.update(
        "UPDATE safeguarding_disclosure_log SET status = ? WHERE disclosure_id = ? AND status <> 'CLOSED'",
        "REFERRED_EXTERNAL".equals(type) ? "REFERRED" : "ACTIONED",
        disclosureId);
    audit(principal, "SAFEGUARDING_ACTION", "safeguarding_disclosure", disclosureId, Map.of("actionType", type));
    return Map.of("actionId", actionId.toString());
  }

  @Transactional
  public Map<String, Object> closeDisclosure(AccountPrincipal principal, UUID disclosureId, Map<String, Object> body) {
    requireDsl(principal);
    jdbc.update(
        "UPDATE safeguarding_disclosure_log SET status = 'CLOSED', closed_at = now(), referral_target = COALESCE(?, referral_target) WHERE disclosure_id = ?",
        body.get("referralTarget") == null ? null : body.get("referralTarget").toString(),
        disclosureId);
    // The outcome is part of the safeguarding record, not just a status change.
    jdbc.update(
        """
        INSERT INTO safeguarding_action (action_id, disclosure_id, actor_account_id, action_type, note)
        VALUES (?,?,?,'CLOSED',?)
        """,
        UUID.randomUUID(), disclosureId, principal.accountId(),
        body.getOrDefault("note", "").toString());
    audit(principal, "SAFEGUARDING_CLOSED", "safeguarding_disclosure", disclosureId,
        Map.of("referralTarget", String.valueOf(body.getOrDefault("referralTarget", "NONE"))));
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
    // account_role stores SAFEGUARDING_LEAD; "DSL" is the catalogue code for the same role.
    if ("DSL".equals(role)) {
      return p.roles().contains("DSL") || p.roles().contains("SAFEGUARDING_LEAD");
    }
    return p.roles().contains(role);
  }
}
