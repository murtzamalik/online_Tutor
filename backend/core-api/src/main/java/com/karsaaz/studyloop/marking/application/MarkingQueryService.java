package com.karsaaz.studyloop.marking.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarkingQueryService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final Clock clock;

  public MarkingQueryService(JdbcTemplate jdbc, StudentAccessHelper access, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.clock = clock;
  }

  public Map<String, Object> markingView(AccountPrincipal principal, UUID responseId) {
    var row = jdbc.query(
        """
        SELECT sr.student_id, sr.marking_status, sr.marks_awarded, sr.marks_available, sr.is_correct,
               sr.qualification_code
        FROM student_response sr WHERE sr.response_id = ?
        """,
        rs -> rs.next()
            ? Map.of(
                "studentId", rs.getObject("student_id"),
                "markingStatus", rs.getString("marking_status"),
                "marksAwarded", rs.getObject("marks_awarded"),
                "marksAvailable", rs.getShort("marks_available"),
                "isCorrect", rs.getObject("is_correct"),
                "qualificationCode", rs.getString("qualification_code"))
            : null,
        responseId);
    if (row == null) {
      throw AppException.notFound("Response not found");
    }
    UUID studentId = (UUID) row.get("studentId");
    if (StudentAccessHelper.hasStudentRole(principal.roles())) {
      if (!studentId.equals(principal.studentId())) {
        throw AppException.forbidden("Forbidden");
      }
    } else {
      access.assertParentOwns(principal, studentId);
    }
    List<Map<String, Object>> results = jdbc.query(
        """
        SELECT kind, marks_total, confidence, points_json::text AS points, feedback_json::text AS feedback, is_final
        FROM marking_result WHERE response_id = ? ORDER BY created_at
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("kind", rs.getString("kind"));
          m.put("marksTotal", rs.getBigDecimal("marks_total"));
          m.put("confidence", rs.getObject("confidence"));
          m.put("pointsJson", rs.getString("points"));
          m.put("feedbackJson", rs.getString("feedback"));
          m.put("isFinal", rs.getBoolean("is_final"));
          return m;
        },
        responseId);
    Map<String, Object> out = new HashMap<>(row);
    out.put("responseId", responseId);
    out.put("results", results);
    return out;
  }

  public Map<String, Object> markScheme(AccountPrincipal principal, long questionId) {
    access.requireStudent(principal);
    Integer attempted = jdbc.queryForObject(
        """
        SELECT COUNT(*) FROM student_response
        WHERE student_id = ? AND question_id = ?
        """,
        Integer.class,
        principal.studentId(),
        questionId);
    if (attempted == null || attempted == 0) {
      throw AppException.forbidden("Attempt the question before revealing the mark scheme");
    }
    return jdbc.query(
        """
        SELECT ms.scheme_type, ms.total_marks, ms.marking_points_json::text AS points,
               ms.model_answer, ms.levels_json::text AS levels
        FROM mark_scheme ms WHERE ms.question_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Mark scheme not found");
          }
          return Map.of(
              "questionId", questionId,
              "schemeType", rs.getString("scheme_type"),
              "totalMarks", rs.getShort("total_marks"),
              "markingPointsJson", rs.getString("points"),
              "modelAnswer", rs.getString("model_answer"),
              "levelsJson", rs.getString("levels"));
        },
        questionId);
  }

  @Transactional
  public Map<String, Object> dispute(AccountPrincipal principal, UUID responseId, Map<String, String> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    UUID disputeId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO dispute (dispute_id, response_id, student_id, reason_code, reason_text)
        VALUES (?, ?, ?, ?, ?)
        """,
        disputeId,
        responseId,
        studentId,
        body.getOrDefault("reasonCode", "OTHER"),
        body.get("reasonText"));
    jdbc.update("UPDATE student_response SET disputed = TRUE WHERE response_id = ?", responseId);
    UUID exceptionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO marking_exception (exception_id, response_id, trigger, status, dispute_id, sla_due_at)
        VALUES (?, ?, 'STUDENT_DISPUTE', 'OPEN', ?, ?)
        """,
        exceptionId,
        responseId,
        disputeId,
        clock.instant().plusSeconds(48 * 3600));
    jdbc.update(
        "UPDATE student_response SET marking_status = 'IN_EXCEPTION' WHERE response_id = ?",
        responseId);
    return Map.of("disputeId", disputeId, "exceptionId", exceptionId);
  }

  public Map<String, Object> reviewStatus(AccountPrincipal principal, UUID responseId) {
    access.requireStudent(principal);
    Map<String, Object> row = jdbc.query(
        """
        SELECT sr.qualification_code, sr.marking_status, sr.marks_awarded,
               r.review_id, r.status AS review_status, r.due_at, r.anonymous_ref
        FROM student_response sr
        LEFT JOIN marking_review_queue r ON r.response_id = sr.response_id
        WHERE sr.response_id = ? AND sr.student_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("qualificationCode", rs.getString("qualification_code"));
          m.put("markingStatus", rs.getString("marking_status"));
          m.put("marksAwarded", rs.getObject("marks_awarded"));
          m.put("reviewId", rs.getObject("review_id"));
          m.put("reviewStatus", rs.getString("review_status"));
          m.put(
              "dueAt",
              rs.getTimestamp("due_at") == null ? null : rs.getTimestamp("due_at").toInstant().toString());
          m.put("anonymousRef", rs.getString("anonymous_ref"));
          return m;
        },
        responseId,
        principal.studentId());
    if (row == null) {
      throw AppException.notFound("Response not found");
    }
    boolean flagOn = Boolean.TRUE.equals(jdbc.query(
        "SELECT enabled FROM feature_flag WHERE flag_key = 'a_level_review'",
        rs -> rs.next() ? rs.getBoolean(1) : false));
    if (!ALevelProvisionalRouter.shouldQueueForReview(flagOn, String.valueOf(row.get("qualificationCode")))) {
      return Map.of(
          "responseId",
          responseId,
          "feature",
          flagOn ? "NOT_APPLICABLE" : "FEATURE_DISABLED",
          "status",
          "NOT_APPLICABLE");
    }
    Map<String, Object> out = new HashMap<>();
    out.put("responseId", responseId);
    out.put("status", row.get("reviewStatus") != null ? row.get("reviewStatus") : row.get("markingStatus"));
    out.put("provisionalMarks", row.get("marksAwarded"));
    out.put("etaHours", ALevelProvisionalRouter.defaultSlaHours());
    out.put("dueAt", row.get("dueAt"));
    out.put("message", "Your mark is provisional until a human reviewer confirms (within 48 hours). Accuracy claims remain unvalidated.");
    return out;
  }

  @Transactional
  public Map<String, Object> selfMark(
      AccountPrincipal principal, UUID responseId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    Integer owned = jdbc.queryForObject(
        "SELECT COUNT(*) FROM student_response WHERE response_id = ? AND student_id = ?",
        Integer.class,
        responseId,
        studentId);
    if (owned == null || owned == 0) {
      throw AppException.notFound("Response not found");
    }
    java.math.BigDecimal marks = body.get("marksAwarded") instanceof Number n
        ? java.math.BigDecimal.valueOf(n.doubleValue())
        : new java.math.BigDecimal(body.getOrDefault("marksAwarded", "0").toString());
    jdbc.update(
        """
        INSERT INTO marking_result (result_id, response_id, kind, is_final, marks_total, confidence, points_json)
        VALUES (?, ?, 'SELF_MARK', FALSE, ?, 1.0, ?::jsonb)
        """,
        UUID.randomUUID(),
        responseId,
        marks,
        body.get("pointsJson") == null ? "[]" : body.get("pointsJson").toString());
    jdbc.update(
        "UPDATE student_response SET marking_mode = 'SELF_MARKED' WHERE response_id = ?",
        responseId);
    return Map.of("responseId", responseId, "selfMarks", marks, "status", "SELF_MARKED");
  }

  public Map<String, Object> selfMarkCompare(AccountPrincipal principal, UUID responseId) {
    access.requireStudent(principal);
    List<Map<String, Object>> results = jdbc.query(
        """
        SELECT kind, marks_total FROM marking_result
        WHERE response_id = ? AND kind IN ('SELF_MARK','AI_PASS_A','AI_PASS_B','OBJECTIVE','AI_A_LEVEL')
        ORDER BY created_at
        """,
        (rs, i) -> Map.of("kind", rs.getString("kind"), "marksTotal", rs.getBigDecimal("marks_total")),
        responseId);
    java.math.BigDecimal self = null;
    java.math.BigDecimal ai = null;
    for (Map<String, Object> r : results) {
      if ("SELF_MARK".equals(r.get("kind"))) {
        self = (java.math.BigDecimal) r.get("marksTotal");
      } else {
        ai = (java.math.BigDecimal) r.get("marksTotal");
      }
    }
    Map<String, Object> out = new HashMap<>();
    out.put("responseId", responseId);
    out.put("selfMarks", self);
    out.put("aiMarks", ai);
    out.put(
        "delta",
        self != null && ai != null ? self.subtract(ai) : null);
    out.put("calibrationNote", "Compare your self-mark with the system mark for learning — numbers are computed in code.");
    return out;
  }
}
