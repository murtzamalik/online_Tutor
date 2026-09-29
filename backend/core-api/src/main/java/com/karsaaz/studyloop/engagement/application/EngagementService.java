package com.karsaaz.studyloop.engagement.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EngagementService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;

  public EngagementService(JdbcTemplate jdbc, StudentAccessHelper access) {
    this.jdbc = jdbc;
    this.access = access;
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public Map<String, Object> ingestEvents(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    String telemetry = jdbc.query(
        "SELECT telemetry_level FROM privacy_settings WHERE student_id = ?",
        rs -> rs.next() ? rs.getString(1) : "ESSENTIAL",
        studentId);
    List<Map<String, Object>> events = body.get("events") instanceof List<?> l
        ? (List<Map<String, Object>>) l : List.of();
    List<Map<String, Object>> nudges = new ArrayList<>();
    int maxNudges = 3;
    Integer offered = jdbc.queryForObject(
        "SELECT COUNT(*) FROM nudge WHERE student_id = ? AND offered_at::date = CURRENT_DATE",
        Integer.class, studentId);
    for (Map<String, Object> ev : events) {
      String type = ev.getOrDefault("eventType", "").toString();
      if ("ESSENTIAL".equals(telemetry) && type.startsWith("CONFIDENCE")) {
        // still allow confidence prompts (G-02) as learning UX, not marketing telemetry
      }
      UUID sessionId = ev.get("sessionId") == null ? null : UUID.fromString(ev.get("sessionId").toString());
      jdbc.update(
          """
          INSERT INTO engagement_event (event_id, student_id, session_id, event_type, event_metadata_json)
          VALUES (?,?,?,?,?::jsonb)
          """,
          UUID.randomUUID(), studentId, sessionId, type,
          ev.get("metadata") == null ? "{}" : ev.get("metadata").toString());
      if ((offered == null ? 0 : offered) + nudges.size() >= maxNudges) {
        continue;
      }
      if ("IDLE_DETECTED".equals(type) || "HINT_REQUESTED".equals(type)) {
        nudges.add(offerNudge(studentId, sessionId, "HINT", type));
      } else if ("CONFUSION_RESCUE_TRIGGERED".equals(type)) {
        nudges.add(offerNudge(studentId, sessionId, "CONFUSION_RESCUE", type));
      } else if ("CONFIDENCE_PROMPT_SHOWN".equals(type) || "ANSWER_CHANGED".equals(type)) {
        if ("CONFIDENCE_PROMPT_SHOWN".equals(type)) {
          nudges.add(offerNudge(studentId, sessionId, "CONFIDENCE_CHECK", type));
        }
      }
    }
    return Map.of("accepted", events.size(), "nudges", nudges);
  }

  @Transactional
  public Map<String, Object> respondNudge(AccountPrincipal principal, UUID nudgeId, Map<String, Object> body) {
    access.requireStudent(principal);
    String status = body.getOrDefault("response", "DISMISSED").toString();
    if (!List.of("ACCEPTED", "DISMISSED").contains(status)) {
      status = "DISMISSED";
    }
    int n = jdbc.update(
        """
        UPDATE nudge SET status = ?, responded_at = now()
        WHERE nudge_id = ? AND student_id = ?
        """,
        status, nudgeId, principal.studentId());
    if (n == 0) throw AppException.notFound("Nudge not found");
    return Map.of("nudgeId", nudgeId.toString(), "status", status);
  }

  private Map<String, Object> offerNudge(UUID studentId, UUID sessionId, String kind, String trigger) {
    UUID id = UUID.randomUUID();
    String token = "ret_" + UUID.randomUUID().toString().substring(0, 8);
    jdbc.update(
        """
        INSERT INTO nudge (nudge_id, student_id, session_id, kind, trigger_json, status, return_token)
        VALUES (?,?,?,?,?::jsonb,'OFFERED',?)
        """,
        id, studentId, sessionId, kind, "{\"trigger\":\"" + trigger + "\"}", token);
    Map<String, Object> m = new HashMap<>();
    m.put("nudgeId", id.toString());
    m.put("kind", kind);
    m.put("returnToken", token);
    m.put("copy", switch (kind) {
      case "CONFIDENCE_CHECK" -> "How sure are you about this answer?";
      case "CONFUSION_RESCUE" -> "Looks tricky — want a different explanation?";
      case "TOPIC_SWITCH" -> "Want to try a related topic for a bit?";
      case "BREAK" -> "A short break can help — come back when ready.";
      default -> "Need a hint?";
    });
    return m;
  }

  public Map<String, Object> surpriseQuiz(AccountPrincipal principal, UUID studentId) {
    access.requireStudent(principal);
    UUID sid = access.resolveStudentId(principal, studentId);
    Map<String, Object> existing = jdbc.query(
        """
        SELECT quiz_id, topic_ids, reason, status, served_at
        FROM surprise_quiz WHERE student_id = ? AND status = 'SERVED'
        ORDER BY served_at DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("quizId", rs.getObject("quiz_id"));
          m.put("reason", rs.getString("reason"));
          m.put("status", rs.getString("status"));
          m.put("servedAt", rs.getTimestamp("served_at").toInstant().toString());
          return m;
        },
        sid);
    if (existing != null) {
      return existing;
    }
    Long topicId = jdbc.query(
        """
        SELECT t.topic_id FROM student_enrolment se
        JOIN spec_topic t ON t.specification_id = se.specification_id AND t.topic_level = 1
        WHERE se.student_id = ? AND se.status = 'ACTIVE'
        ORDER BY random() LIMIT 1
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        sid);
    if (topicId == null) {
      return Map.of("studentId", sid, "quiz", null, "message", "No surprise quiz ready");
    }
    UUID quizId = UUID.randomUUID();
    jdbc.update(
        connection -> {
          var ps =
              connection.prepareStatement(
                  "INSERT INTO surprise_quiz (quiz_id, student_id, topic_ids, reason, status) VALUES (?,?,?,'NOT_RECENTLY_TOUCHED','SERVED')");
          ps.setObject(1, quizId);
          ps.setObject(2, sid);
          ps.setArray(3, connection.createArrayOf("bigint", new Long[] {topicId}));
          return ps;
        });
    return Map.of(
        "quizId",
        quizId,
        "topicIds",
        List.of(topicId),
        "reason",
        "NOT_RECENTLY_TOUCHED",
        "status",
        "SERVED",
        "prompt",
        "Quick check — ready for a 2-question surprise quiz?");
  }

  @Transactional
  public Map<String, Object> completeSurprise(
      AccountPrincipal principal, UUID quizId, Map<String, Object> body) {
    access.requireStudent(principal);
    String status = Boolean.TRUE.equals(body.get("skipped")) ? "SKIPPED" : "COMPLETED";
    int n = jdbc.update(
        """
        UPDATE surprise_quiz SET status = ?, completed_at = now(),
          result_json = COALESCE(?::jsonb, '{}'::jsonb)
        WHERE quiz_id = ? AND student_id = ?
        """,
        status,
        body.get("resultJson") == null ? "{}" : body.get("resultJson").toString(),
        quizId,
        principal.studentId());
    if (n == 0) {
      throw AppException.notFound("Surprise quiz not found");
    }
    return Map.of("quizId", quizId, "status", status);
  }
}
