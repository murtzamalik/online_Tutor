package com.karsaaz.studyloop.learning.entrance.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.entrance.domain.EntranceLockRules;
import com.karsaaz.studyloop.learning.practice.application.PracticeService;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import com.karsaaz.studyloop.platform.feature.FeatureFlags;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntranceTestService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final PracticeService practiceService;
  private final FeatureFlags flags;
  private final Clock clock;

  public EntranceTestService(
      JdbcTemplate jdbc,
      StudentAccessHelper access,
      PracticeService practiceService,
      FeatureFlags flags,
      Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.practiceService = practiceService;
    this.flags = flags;
    this.clock = clock;
  }

  @Transactional
  public Map<String, Object> start(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    flags.require("entrance_test_11plus", "11+ entrance test is flag-off");
    int quota = flags.configInt("entrance.quota_items", 20);
    Map<String, Object> session = practiceService.startSession(
        principal,
        Map.of(
            "enrolmentId", body.get("enrolmentId"),
            "mode", "ENTRANCE_TEST",
            "plannedCount", quota));
    UUID sessionId = (UUID) session.get("sessionId");
    UUID runId = UUID.randomUUID();
    String examType = body.getOrDefault("examType", "GRAMMAR").toString();
    jdbc.update(
        """
        INSERT INTO entrance_test_run (run_id, session_id, exam_type, status, ability_estimate)
        VALUES (?, ?, ?, 'IN_PROGRESS', 0)
        """,
        runId, sessionId, examType);
    Map<String, Object> out = new HashMap<>();
    out.put("runId", runId.toString());
    out.put("sessionId", sessionId.toString());
    out.put("status", "IN_PROGRESS");
    out.put("quotaItems", quota);
    out.put("allowsSkip", EntranceLockRules.allowsSkip());
    out.put("allowsBack", EntranceLockRules.allowsBack());
    return out;
  }

  public Map<String, Object> next(AccountPrincipal principal, UUID runId) {
    access.requireStudent(principal);
    RunContext ctx = loadRun(runId);
    if (!principal.studentId().equals(ctx.studentId())) {
      throw AppException.forbidden("Forbidden");
    }
    if (!"IN_PROGRESS".equals(ctx.status())) {
      throw AppException.badRequest("RUN_COMPLETE", "Entrance test already finished");
    }
    int answered = answeredCount(ctx.sessionId());
    if (EntranceLockRules.isComplete(answered, ctx.quota())) {
      return Map.of(
          "runId", runId.toString(),
          "complete", true,
          "answeredCount", answered,
          "quotaItems", ctx.quota());
    }
    Map<String, Object> q = practiceService.nextQuestion(principal, ctx.sessionId());
    q.put("runId", runId.toString());
    q.put("answeredCount", answered);
    q.put("quotaItems", ctx.quota());
    q.put("allowsSkip", false);
    q.put("allowsBack", false);
    q.put("itemIndex", answered);
    return q;
  }

  @Transactional
  public Map<String, Object> answer(AccountPrincipal principal, UUID runId, Map<String, Object> body) {
    access.requireStudent(principal);
    RunContext ctx = loadRun(runId);
    if (!principal.studentId().equals(ctx.studentId())) {
      throw AppException.forbidden("Forbidden");
    }
    if (!"IN_PROGRESS".equals(ctx.status())) {
      throw AppException.badRequest("RUN_COMPLETE", "Entrance test already finished");
    }
    Object answer = body.get("answerText");
    if (answer == null) {
      answer = body.get("answer");
    }
    EntranceLockRules.assertNotSkipped(answer != null && !answer.toString().isBlank());
    int answered = answeredCount(ctx.sessionId());
    int attemptedIndex = body.get("itemIndex") instanceof Number n ? n.intValue() : answered;
    EntranceLockRules.assertAnswerForwardOnly(answered, attemptedIndex);

    Map<String, Object> submitted = practiceService.submitAnswer(principal, ctx.sessionId(), body);
    answered = answeredCount(ctx.sessionId());
    boolean complete = EntranceLockRules.isComplete(answered, ctx.quota());
    if (complete) {
      jdbc.update(
          """
          UPDATE entrance_test_run
          SET status = 'COMPLETED', completed_at = ?, ability_estimate = ?
          WHERE run_id = ?
          """,
          clock.instant(),
          answered / (double) Math.max(1, ctx.quota()),
          runId);
      jdbc.update(
          "UPDATE practice_session SET status = 'COMPLETED', ended_at = ? WHERE session_id = ?",
          clock.instant(),
          ctx.sessionId());
    }
    Map<String, Object> out = new HashMap<>();
    out.put("responseId", submitted.get("responseId"));
    out.put("status", submitted.get("status"));
    out.put("answeredCount", answered);
    out.put("quotaItems", ctx.quota());
    out.put("complete", complete);
    out.put("allowsSkip", false);
    out.put("allowsBack", false);
    return out;
  }

  public Map<String, Object> result(AccountPrincipal principal, UUID runId) {
    RunContext ctx = loadRun(runId);
    access.assertParentOrStudent(principal, ctx.studentId());
    int answered = answeredCount(ctx.sessionId());
    Integer correct = jdbc.queryForObject(
        """
        SELECT COUNT(*) FROM student_response
        WHERE session_id = ? AND is_correct = TRUE
        """,
        Integer.class,
        ctx.sessionId());
    Map<String, Object> out = new HashMap<>();
    out.put("runId", runId.toString());
    out.put("status", ctx.status());
    out.put("answeredCount", answered);
    out.put("correctCount", correct == null ? 0 : correct);
    out.put("quotaItems", ctx.quota());
    out.put("abilityEstimate", ctx.ability());
    return out;
  }

  private int answeredCount(UUID sessionId) {
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM student_response WHERE session_id = ?", Integer.class, sessionId);
    return n == null ? 0 : n;
  }

  private RunContext loadRun(UUID runId) {
    return jdbc.query(
        """
        SELECT e.run_id, e.session_id, e.status, e.ability_estimate, ps.student_id, ps.planned_count
        FROM entrance_test_run e
        JOIN practice_session ps ON ps.session_id = e.session_id
        WHERE e.run_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Entrance run not found");
          }
          int planned = rs.getInt("planned_count");
          int quota = planned > 0 ? planned : flags.configInt("entrance.quota_items", 20);
          return new RunContext(
              (UUID) rs.getObject("run_id"),
              (UUID) rs.getObject("session_id"),
              (UUID) rs.getObject("student_id"),
              rs.getString("status"),
              rs.getBigDecimal("ability_estimate") == null
                  ? 0.0
                  : rs.getBigDecimal("ability_estimate").doubleValue(),
              quota);
        },
        runId);
  }

  private record RunContext(
      UUID runId, UUID sessionId, UUID studentId, String status, double ability, int quota) {}
}
