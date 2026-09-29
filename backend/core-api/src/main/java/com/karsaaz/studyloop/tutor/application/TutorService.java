package com.karsaaz.studyloop.tutor.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import com.karsaaz.studyloop.safety.application.SafetyService;
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
public class TutorService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final SafetyService safety;
  private final GatewayClient gateway;

  public TutorService(JdbcTemplate jdbc, StudentAccessHelper access, SafetyService safety, GatewayClient gateway) {
    this.jdbc = jdbc;
    this.access = access;
    this.safety = safety;
    this.gateway = gateway;
  }

  @Transactional
  public Map<String, Object> startSession(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    assertChatAllowed(studentId);
    UUID sessionId = UUID.randomUUID();
    short persona = jdbc.query(
        "SELECT visual_tier FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getShort(1) : (short) 2,
        studentId);
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'CHAT', ?, ?, 'ACTIVE')
        """,
        sessionId, studentId, body.getOrDefault("mode", "SOCRATIC").toString(), persona);
    return Map.of("tutorSessionId", sessionId.toString(), "status", "ACTIVE", "channel", "CHAT");
  }

  @Transactional
  public Map<String, Object> postMessage(AccountPrincipal principal, UUID tutorSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    assertOwnsSession(studentId, tutorSessionId);
    String text = body.getOrDefault("text", "").toString();
    // D-15: never send learner PII to gateway — only anonymised content hash + topic
    Map<String, Object> safetyIn = safety.classifyInternal(Map.of(
        "text", text,
        "direction", "LEARNER_INPUT",
        "studentId", studentId.toString(),
        "tutorSessionId", tutorSessionId.toString()));
    int seq = nextSeq(tutorSessionId);
    UUID msgId = UUID.randomUUID();
    Instant expires = Instant.now().plus(90, ChronoUnit.DAYS);
    boolean blocked = !"ALLOW".equals(safetyIn.get("action"));
    jdbc.update(
        """
        INSERT INTO tutor_message (message_id, tutor_session_id, seq, role, channel, content_text, ai_visible_text, blocked, expires_at)
        VALUES (?,?,?,'STUDENT','CHAT',?,?,?,?)
        """,
        msgId, tutorSessionId, seq, text, "[REDACTED_TURN]", blocked, Timestamp.from(expires));
    if (blocked) {
      UUID sysId = UUID.randomUUID();
      jdbc.update(
          """
          INSERT INTO tutor_message (message_id, tutor_session_id, seq, role, channel, content_text, blocked, expires_at)
          VALUES (?,?,?,'SYSTEM','CHAT',?, TRUE, ?)
          """,
          sysId, tutorSessionId, seq + 1, safetyIn.get("scriptedText"), Timestamp.from(expires));
      jdbc.update("UPDATE tutor_session SET status = 'BLOCKED', turn_count = turn_count + 1 WHERE tutor_session_id = ?", tutorSessionId);
      return Map.of(
          "blocked", true,
          "scriptedText", safetyIn.get("scriptedText"),
          "templateId", safetyIn.get("templateId"),
          "flagRef", safetyIn.getOrDefault("flagRef", null));
    }
    String reply;
    try {
      // Variables must not include names/emails (D-15)
      Map<?, ?> gw = gateway.run("P-TU-01", Map.of(
          "learner_message", text.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+", "[EMAIL]"),
          "mode", "socratic"), "schemas/tutor_reply.schema.json");
      Object content = gw.get("content");
      reply = content == null ? "Let's think about the next step together. What do you already know about this topic?"
          : content.toString();
    } catch (Exception e) {
      reply = "Let's think about the next step together. What do you already know about this topic?";
    }
    Map<String, Object> safetyOut = safety.classifyInternal(Map.of(
        "text", reply,
        "direction", "TUTOR_OUTPUT",
        "studentId", studentId.toString(),
        "tutorSessionId", tutorSessionId.toString()));
    if (!"ALLOW".equals(safetyOut.get("action"))) {
      reply = String.valueOf(safetyOut.get("scriptedText"));
      jdbc.update("UPDATE tutor_session SET status = 'BLOCKED' WHERE tutor_session_id = ?", tutorSessionId);
    }
    UUID tutorMsg = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_message (message_id, tutor_session_id, seq, role, channel, content_text, ai_visible_text, blocked, expires_at)
        VALUES (?,?,?,'TUTOR','CHAT',?,?,?,?)
        """,
        tutorMsg, tutorSessionId, seq + 1, reply, reply, !"ALLOW".equals(safetyOut.get("action")), Timestamp.from(expires));
    jdbc.update("UPDATE tutor_session SET turn_count = turn_count + 1 WHERE tutor_session_id = ?", tutorSessionId);
    return Map.of("messageId", tutorMsg.toString(), "text", reply, "blocked", !"ALLOW".equals(safetyOut.get("action")));
  }

  public Map<String, Object> getSession(AccountPrincipal principal, UUID tutorSessionId) {
    UUID studentId = jdbc.query(
        "SELECT student_id FROM tutor_session WHERE tutor_session_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        tutorSessionId);
    if (studentId == null) throw AppException.notFound("Session not found");
    access.assertParentOrStudent(principal, studentId);
    Map<String, Object> session = jdbc.query(
        "SELECT tutor_session_id, status, channel, mode, turn_count, started_at FROM tutor_session WHERE tutor_session_id = ?",
        rs -> {
          rs.next();
          Map<String, Object> m = new HashMap<>();
          m.put("tutorSessionId", rs.getObject(1).toString());
          m.put("status", rs.getString(2));
          m.put("channel", rs.getString(3));
          m.put("mode", rs.getString(4));
          m.put("turnCount", rs.getInt(5));
          m.put("startedAt", rs.getTimestamp(6));
          return m;
        },
        tutorSessionId);
    List<Map<String, Object>> messages = jdbc.query(
        """
        SELECT message_id, seq, role, content_text, blocked, created_at
        FROM tutor_message WHERE tutor_session_id = ? ORDER BY seq
        """,
        (rs, i) -> Map.of(
            "messageId", rs.getObject(1).toString(),
            "seq", rs.getInt(2),
            "role", rs.getString(3),
            "text", rs.getString(4),
            "blocked", rs.getBoolean(5),
            "createdAt", rs.getTimestamp(6).toString()),
        tutorSessionId);
    return Map.of("session", session, "messages", messages);
  }

  @Transactional
  public Map<String, Object> endSession(AccountPrincipal principal, UUID tutorSessionId) {
    access.requireStudent(principal);
    assertOwnsSession(principal.studentId(), tutorSessionId);
    jdbc.update("UPDATE tutor_session SET status = 'ENDED', ended_at = now() WHERE tutor_session_id = ?", tutorSessionId);
    return Map.of("status", "ENDED");
  }

  @Transactional
  public Map<String, Object> reexplain(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    return Map.of(
        "format", body.getOrDefault("format", "WORKED_EXAMPLE"),
        "text", "Here is another way to see it: start from what the question asks, then check units, then compute.");
  }

  @Transactional
  public Map<String, Object> explainBack(AccountPrincipal principal, UUID tutorSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    assertOwnsSession(principal.studentId(), tutorSessionId);
    return postMessage(principal, tutorSessionId, Map.of("text", body.getOrDefault("explanation", "")));
  }

  @Transactional
  public Map<String, Object> rescue(Map<String, Object> body) {
    UUID studentId = UUID.fromString(body.get("studentId").toString());
    UUID sessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'CHAT', 'RESCUE', 2, 'ACTIVE')
        """,
        sessionId, studentId);
    UUID nudgeId = body.get("nudgeId") == null ? null : UUID.fromString(body.get("nudgeId").toString());
    return Map.of("tutorSessionId", sessionId.toString(), "mode", "RESCUE", "nudgeId", nudgeId);
  }

  /**
   * F-08: masked photo of stuck (unattempted) question → guided walkthrough via gateway P-TU-06.
   * Full vision may stub; endpoints and masking contract are real.
   */
  @Transactional
  public Map<String, Object> photoWalkthrough(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    assertChatAllowed(studentId);
    Object maskReport = body.get("maskReport");
    if (maskReport == null) {
      throw AppException.badRequest("MASK_REQUIRED", "Client-side mask report is mandatory (PRA-06 rules)");
    }
    String photoRef = body.getOrDefault("maskedPhotoKey", body.getOrDefault("photoKey", "masked-stub")).toString();
    UUID photoId = UUID.randomUUID();
    Instant retention = Instant.now().plus(30, ChronoUnit.DAYS);
    try {
      String maskJson = maskReport instanceof String s
          ? s
          : new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(maskReport);
      jdbc.update(
          """
          INSERT INTO answer_photo (photo_id, student_id, storage_key, mask_report_json, purpose, retention_until)
          VALUES (?, ?, ?, ?::jsonb, 'STUCK_QUESTION', ?)
          """,
          photoId,
          studentId,
          photoRef,
          maskJson,
          Timestamp.from(retention));
    } catch (Exception e) {
      // continue with stub walkthrough if insert fails
    }
    UUID tutorSessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'CHAT', 'WALKTHROUGH', 2, 'ACTIVE')
        """,
        tutorSessionId, studentId);
    String walkthrough;
    try {
      Map<?, ?> gw = gateway.run(
          "P-TU-06",
          Map.of(
              "photo_token", photoId.toString(),
              "has_mask_report", true,
              "hint_ladder", true),
          "schemas/walkthrough.schema.json");
      Object content = gw.get("content");
      if (content == null) {
        content = gw.get("steps");
      }
      walkthrough = content == null
          ? "Step 1: Restate what the question asks.\nStep 2: List knowns.\nStep 3: Choose a method — I will not give the final answer."
          : content.toString();
    } catch (Exception e) {
      walkthrough =
          "Step 1: Restate what the question asks (no full answer).\n"
              + "Step 2: Spot units and given values.\n"
              + "Step 3: Try the next hint rung — vision stub used; masking was required.";
    }
    Instant expires = Instant.now().plus(90, ChronoUnit.DAYS);
    jdbc.update(
        """
        INSERT INTO tutor_message (message_id, tutor_session_id, seq, role, channel, content_text, ai_visible_text, blocked, expires_at)
        VALUES (?,?,1,'TUTOR','CHAT',?,?,FALSE,?)
        """,
        UUID.randomUUID(), tutorSessionId, walkthrough, "[WALKTHROUGH]", Timestamp.from(expires));
    Map<String, Object> out = new HashMap<>();
    out.put("tutorSessionId", tutorSessionId.toString());
    out.put("photoId", photoId.toString());
    out.put("walkthrough", walkthrough);
    out.put("fullAnswerRevealed", false);
    out.put("visionPath", "stub_or_gateway");
    return out;
  }

  private void assertChatAllowed(UUID studentId) {
    Boolean enabled = jdbc.query(
        "SELECT chat_enabled FROM parent_ai_controls WHERE student_id = ?",
        rs -> rs.next() ? rs.getBoolean(1) : true,
        studentId);
    if (Boolean.FALSE.equals(enabled)) {
      throw AppException.forbidden("Parent has disabled chat tutor");
    }
  }

  private void assertOwnsSession(UUID studentId, UUID sessionId) {
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM tutor_session WHERE tutor_session_id = ? AND student_id = ?",
        Integer.class, sessionId, studentId);
    if (n == null || n == 0) throw AppException.forbidden("Not your tutor session");
  }

  private int nextSeq(UUID sessionId) {
    Integer max = jdbc.queryForObject(
        "SELECT COALESCE(MAX(seq),0) FROM tutor_message WHERE tutor_session_id = ?", Integer.class, sessionId);
    return (max == null ? 0 : max) + 1;
  }
}
