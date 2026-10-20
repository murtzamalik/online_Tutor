package com.karsaaz.studyloop.learning.practice.application;

import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DiagnosticService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final PracticeService practiceService;
  private final MasteryService masteryService;
  private final Clock clock;

  public DiagnosticService(
      JdbcTemplate jdbc,
      StudentAccessHelper access,
      PracticeService practiceService,
      MasteryService masteryService,
      Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.practiceService = practiceService;
    this.masteryService = masteryService;
    this.clock = clock;
  }

  @Transactional
  public Map<String, Object> start(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    Map<String, Object> session = practiceService.startSession(
        principal, Map.of("enrolmentId", body.get("enrolmentId"), "mode", "DIAGNOSTIC", "plannedCount", 10));
    UUID sessionId = (UUID) session.get("sessionId");
    UUID enrolmentId = UUID.fromString(body.get("enrolmentId").toString());
    UUID diagnosticId = UUID.randomUUID();
    jdbc.update(
        """
        UPDATE practice_session SET mode = 'DIAGNOSTIC' WHERE session_id = ?
        """,
        sessionId);
    jdbc.update(
        """
        INSERT INTO diagnostic_run (diagnostic_id, session_id, enrolment_id, status, theta)
        VALUES (?, ?, ?, 'IN_PROGRESS', 0)
        """,
        diagnosticId,
        sessionId,
        enrolmentId);
    return Map.of("diagnosticId", diagnosticId, "sessionId", sessionId, "status", "IN_PROGRESS");
  }

  public Map<String, Object> next(AccountPrincipal principal, UUID diagnosticId) {
    access.requireStudent(principal);
    UUID sessionId = requireSession(diagnosticId);
    // nextQuestion may return Map.of(...) which is immutable — copy before put
    Map<String, Object> q = new HashMap<>(practiceService.nextQuestion(principal, sessionId));
    q.put("diagnosticId", diagnosticId);
    return q;
  }

  @Transactional
  public Map<String, Object> answer(AccountPrincipal principal, UUID diagnosticId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID sessionId = requireSession(diagnosticId);
    Map<String, Object> submitted = practiceService.submitAnswer(principal, sessionId, body);
    boolean correct = Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT is_correct FROM student_response WHERE response_id = ?",
            Boolean.class,
            submitted.get("responseId")));
    updateTheta(diagnosticId, correct);
    return Map.of(
        "responseId", submitted.get("responseId"),
        "status", submitted.get("status"),
        "theta", currentTheta(diagnosticId));
  }

  @Transactional
  public Map<String, Object> result(AccountPrincipal principal, UUID diagnosticId) {
    UUID sessionId = requireSession(diagnosticId);
    UUID studentId = principal.studentId() != null
        ? principal.studentId()
        : jdbc.queryForObject(
            "SELECT student_id FROM practice_session WHERE session_id = ?", UUID.class, sessionId);
    if (principal.studentId() == null) {
      access.assertParentOrStudent(principal, studentId);
    }
    jdbc.update(
        """
        UPDATE diagnostic_run SET status = 'COMPLETED', completed_at = ?
        WHERE diagnostic_id = ?
        """,
        SqlTime.ts(clock.instant()),
        diagnosticId);
    jdbc.update(
        "UPDATE student_enrolment SET baseline_completed_at = ? WHERE enrolment_id = (SELECT enrolment_id FROM diagnostic_run WHERE diagnostic_id = ?)",
        SqlTime.ts(clock.instant()),
        diagnosticId);
    double theta = currentTheta(diagnosticId);
    List<Long> topics = jdbc.query(
        """
        SELECT DISTINCT q.topic_id FROM student_response sr
        JOIN question q ON q.question_id = sr.question_id
        WHERE sr.session_id = ?
        """,
        (rs, i) -> rs.getLong(1),
        sessionId);
    for (Long topicId : topics) {
      masteryService.seedFromDiagnostic(studentId, topicId, theta);
    }
    return Map.of(
        "diagnosticId", diagnosticId,
        "theta", theta,
        "recommendedTier", theta >= 0 ? "HIGHER" : "FOUNDATION",
        "topicsSeeded", topics.size());
  }

  private void updateTheta(UUID diagnosticId, boolean correct) {
    double theta = currentTheta(diagnosticId);
    theta += correct ? 0.35 : -0.25;
    jdbc.update("UPDATE diagnostic_run SET theta = ? WHERE diagnostic_id = ?", BigDecimal.valueOf(theta), diagnosticId);
  }

  private double currentTheta(UUID diagnosticId) {
    BigDecimal t = jdbc.queryForObject(
        "SELECT theta FROM diagnostic_run WHERE diagnostic_id = ?", BigDecimal.class, diagnosticId);
    return t == null ? 0 : t.doubleValue();
  }

  private UUID requireSession(UUID diagnosticId) {
    UUID sessionId = jdbc.query(
        "SELECT session_id FROM diagnostic_run WHERE diagnostic_id = ? AND status = 'IN_PROGRESS'",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        diagnosticId);
    if (sessionId == null) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Diagnostic not in progress");
    }
    return sessionId;
  }
}
