package com.karsaaz.studyloop.marking.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExceptionQueueService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final MasteryService masteryService;
  private final Clock clock;

  public ExceptionQueueService(
      JdbcTemplate jdbc, StudentAccessHelper access, MasteryService masteryService, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.masteryService = masteryService;
    this.clock = clock;
  }

  public List<Map<String, Object>> list(AccountPrincipal principal, String status) {
    access.requireOps(principal);
    return jdbc.query(
        """
        SELECT exception_id, response_id, trigger, status, created_at, sla_due_at, assigned_to
        FROM marking_exception
        WHERE (?::text IS NULL OR status = ?::text)
        ORDER BY created_at DESC LIMIT 100
        """,
        // HashMap: assigned_to / sla_due_at are null for new exceptions (Map.of throws on null).
        (rs, i) -> {
          Map<String, Object> m = new java.util.HashMap<>();
          m.put("exceptionId", rs.getObject("exception_id"));
          m.put("responseId", rs.getObject("response_id"));
          m.put("trigger", rs.getString("trigger"));
          m.put("status", rs.getString("status"));
          m.put("createdAt", rs.getTimestamp("created_at").toInstant());
          m.put("slaDueAt", rs.getTimestamp("sla_due_at") == null ? null : rs.getTimestamp("sla_due_at").toInstant());
          m.put("assignedTo", rs.getObject("assigned_to"));
          return m;
        },
        status,
        status);
  }

  public Map<String, Object> detail(AccountPrincipal principal, UUID exceptionId) {
    access.requireOps(principal);
    Map<String, Object> out = jdbc.query(
        """
        SELECT me.exception_id, me.response_id, me.trigger, me.status,
               COALESCE(me.original_marks, sr.marks_awarded) AS original_marks, me.final_marks,
               sr.answer_text, sr.marks_available, q.question_text, ms.marking_points_json::text AS scheme
        FROM marking_exception me
        JOIN student_response sr ON sr.response_id = me.response_id
        JOIN question q ON q.question_id = sr.question_id
        LEFT JOIN mark_scheme ms ON ms.question_id = q.question_id
        WHERE me.exception_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Exception not found");
          }
          Map<String, Object> m = new java.util.HashMap<>();
          m.put("exceptionId", rs.getObject("exception_id"));
          m.put("responseId", rs.getObject("response_id"));
          m.put("trigger", rs.getString("trigger"));
          m.put("status", rs.getString("status"));
          m.put("answerText", rs.getString("answer_text"));
          m.put("questionText", rs.getString("question_text"));
          m.put("schemeJson", rs.getString("scheme"));
          m.put("originalMarks", rs.getObject("original_marks"));
          m.put("finalMarks", rs.getObject("final_marks"));
          m.put("marksAvailable", rs.getShort("marks_available"));
          return m;
        },
        exceptionId);
    // The reviewer needs both AI passes (points, evidence, flags) to decide.
    UUID responseId = (UUID) out.get("responseId");
    out.put(
        "aiResults",
        jdbc.query(
            """
            SELECT kind, marks_total, confidence, points_json::text AS points
            FROM marking_result WHERE response_id = ? ORDER BY created_at
            """,
            (rs, i) -> {
              Map<String, Object> r = new java.util.HashMap<>();
              r.put("kind", rs.getString("kind"));
              r.put("marksTotal", rs.getBigDecimal("marks_total"));
              r.put("confidence", rs.getObject("confidence"));
              r.put("pointsJson", rs.getString("points"));
              return r;
            },
            responseId));
    return out;
  }

  @Transactional
  public Map<String, Object> claim(AccountPrincipal principal, UUID exceptionId) {
    access.requireOps(principal);
    int n = jdbc.update(
        """
        UPDATE marking_exception SET status = 'IN_PROGRESS', assigned_to = ?
        WHERE exception_id = ? AND status = 'OPEN'
        """,
        principal.accountId(),
        exceptionId);
    if (n == 0) {
      throw AppException.notFound("Exception not available to claim");
    }
    return Map.of(
        "exceptionId", exceptionId,
        "status", "IN_PROGRESS",
        "assignedTo", principal.accountId());
  }

  @Transactional
  public Map<String, Object> resolve(AccountPrincipal principal, UUID exceptionId, Map<String, Object> body) {
    access.requireOps(principal);
    BigDecimal finalMarks = new BigDecimal(body.get("finalMarks").toString());
    String resolution = body.getOrDefault("resolution", "ADJUSTED_UP").toString();
    Object note = body.get("resolutionNote") != null ? body.get("resolutionNote") : body.get("note");
    UUID responseId = jdbc.queryForObject(
        "SELECT response_id FROM marking_exception WHERE exception_id = ?", UUID.class, exceptionId);
    jdbc.update(
        """
        UPDATE marking_exception SET status = 'RESOLVED', final_marks = ?, resolution = ?,
          resolution_note = ?, resolved_at = ?, add_to_gold = COALESCE(?, add_to_gold)
        WHERE exception_id = ?
        """,
        finalMarks,
        resolution,
        note,
        SqlTime.ts(clock.instant()),
        body.get("addToGold") instanceof Boolean b ? b : null,
        exceptionId);
    jdbc.update(
        """
        INSERT INTO marking_result (result_id, response_id, kind, is_final, marks_total, confidence, points_json)
        VALUES (?, ?, 'EXCEPTION_FINAL', TRUE, ?, 1.0, '[]'::jsonb)
        """,
        UUID.randomUUID(),
        responseId,
        finalMarks);
    var meta = jdbc.query(
        """
        SELECT sr.student_id, q.topic_id, sr.marks_available
        FROM student_response sr JOIN question q ON q.question_id = sr.question_id
        WHERE sr.response_id = ?
        """,
        rs -> rs.next()
            ? Map.of(
                "studentId", rs.getObject("student_id"),
                "topicId", rs.getLong("topic_id"),
                "marksAvailable", rs.getShort("marks_available"))
            : null,
        responseId);
    if (meta != null) {
      short available = (Short) meta.get("marksAvailable");
      boolean correct = finalMarks.compareTo(BigDecimal.valueOf(available)) >= 0;
      jdbc.update(
          """
          UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_status = 'MARKED_FINAL',
            marking_mode = 'EXCEPTION_RESOLVED', marked_at = ?
          WHERE response_id = ?
          """,
          finalMarks,
          correct,
          SqlTime.ts(clock.instant()),
          responseId);
      masteryService.updateFromResponse((UUID) meta.get("studentId"), (Long) meta.get("topicId"), correct);
    }
    return Map.of("exceptionId", exceptionId, "status", "RESOLVED", "finalMarks", finalMarks);
  }

  public List<Map<String, Object>> systemicIssues(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasOpsRole(principal.roles())
        && !StudentAccessHelper.hasContentRole(principal.roles())
        && !StudentAccessHelper.hasOwnerRole(principal.roles())) {
      throw AppException.forbidden("Forbidden");
    }
    return jdbc.query(
        """
        SELECT trigger, COUNT(*) AS cnt FROM marking_exception
        WHERE created_at > now() - interval '30 days'
        GROUP BY trigger ORDER BY cnt DESC
        """,
        (rs, i) -> Rows.of("trigger", rs.getString("trigger"), "count", rs.getLong("cnt")));
  }
}
