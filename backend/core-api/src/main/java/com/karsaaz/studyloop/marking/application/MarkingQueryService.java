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
    String qual = jdbc.queryForObject(
        "SELECT qualification_code FROM student_response WHERE response_id = ? AND student_id = ?",
        String.class,
        responseId,
        principal.studentId());
    if (!"A_LEVEL".equals(qual)) {
      return Map.of("responseId", responseId, "feature", "FEATURE_DISABLED", "status", "NOT_APPLICABLE");
    }
    return Map.of("responseId", responseId, "status", "QUEUED", "etaHours", 48);
  }
}
