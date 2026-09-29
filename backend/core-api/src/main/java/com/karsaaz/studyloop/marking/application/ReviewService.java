package com.karsaaz.studyloop.marking.application;

import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** F-05 A-Level review workbench — pseudonymous refs only (no learner identity). */
@Service
public class ReviewService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final MasteryService masteryService;
  private final Clock clock;

  public ReviewService(
      JdbcTemplate jdbc, StudentAccessHelper access, MasteryService masteryService, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.masteryService = masteryService;
    this.clock = clock;
  }

  private void requireReviewerOrOwner(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasReviewerRole(principal.roles())
        && !StudentAccessHelper.hasOwnerRole(principal.roles())) {
      throw AppException.forbidden("Forbidden");
    }
  }

  public List<Map<String, Object>> queue(AccountPrincipal principal) {
    access.requireReviewer(principal);
    Instant now = clock.instant();
    return jdbc.query(
        """
        SELECT review_id, anonymous_ref, status, ai_marks, due_at, created_at, claimed_by
        FROM marking_review_queue
        WHERE status IN ('QUEUED','CLAIMED')
        ORDER BY due_at ASC
        """,
        (rs, i) -> {
          Instant due = rs.getTimestamp("due_at").toInstant();
          long hoursLeft = Duration.between(now, due).toHours();
          String slaColour = hoursLeft < 0 ? "RED" : hoursLeft < 12 ? "AMBER" : "GREEN";
          Map<String, Object> m = new HashMap<>();
          m.put("reviewId", rs.getObject("review_id"));
          m.put("anonymousRef", rs.getString("anonymous_ref"));
          m.put("status", rs.getString("status"));
          m.put("aiMarks", rs.getBigDecimal("ai_marks"));
          m.put("dueAt", due.toString());
          m.put("slaColour", slaColour);
          m.put("hoursRemaining", hoursLeft);
          m.put("claimedBy", rs.getObject("claimed_by"));
          return m;
        });
  }

  public Map<String, Object> detail(AccountPrincipal principal, UUID reviewId) {
    access.requireReviewer(principal);
    Map<String, Object> row = jdbc.query(
        """
        SELECT r.review_id, r.anonymous_ref, r.status, r.ai_marks, r.final_marks, r.due_at,
               r.decision_note,                sr.answer_text, sr.marks_available, q.question_text, q.question_type,
               ms.marking_points_json::text AS scheme, ms.model_answer
        FROM marking_review_queue r
        JOIN student_response sr ON sr.response_id = r.response_id
        JOIN question q ON q.question_id = sr.question_id
        LEFT JOIN mark_scheme ms ON ms.question_id = q.question_id
        WHERE r.review_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("reviewId", rs.getObject("review_id"));
          m.put("anonymousRef", rs.getString("anonymous_ref"));
          m.put("status", rs.getString("status"));
          m.put("aiMarks", rs.getBigDecimal("ai_marks"));
          m.put("finalMarks", rs.getBigDecimal("final_marks"));
          m.put("dueAt", rs.getTimestamp("due_at").toInstant().toString());
          m.put("decisionNote", rs.getString("decision_note"));
          m.put("answerText", rs.getString("answer_text"));
          m.put("marksAvailable", rs.getShort("marks_available"));
          m.put("questionText", rs.getString("question_text"));
          m.put("questionType", rs.getString("question_type"));
          m.put("schemePointsJson", rs.getString("scheme"));
          m.put("modelAnswer", rs.getString("model_answer"));
          m.put("identity", "REDACTED");
          return m;
        },
        reviewId);
    if (row == null) {
      throw AppException.notFound("Review not found");
    }
    List<Map<String, Object>> trail = jdbc.query(
        """
        SELECT kind, marks_total, confidence, points_json::text AS points
        FROM marking_result WHERE response_id = (
          SELECT response_id FROM marking_review_queue WHERE review_id = ?
        ) ORDER BY created_at
        """,
        (rs, i) -> Map.of(
            "kind", rs.getString("kind"),
            "marksTotal", rs.getBigDecimal("marks_total"),
            "confidence", rs.getObject("confidence"),
            "pointsJson", rs.getString("points")),
        reviewId);
    row.put("markingTrail", trail);
    return row;
  }

  @Transactional
  public Map<String, Object> claim(AccountPrincipal principal, UUID reviewId) {
    access.requireReviewer(principal);
    int n = jdbc.update(
        """
        UPDATE marking_review_queue SET status = 'CLAIMED', claimed_by = ?, claimed_at = ?
        WHERE review_id = ? AND status = 'QUEUED'
        """,
        principal.accountId(),
        SqlTime.ts(clock.instant()),
        reviewId);
    if (n == 0) {
      throw AppException.conflict("CONFLICT", "Already claimed or not queued");
    }
    return Map.of("reviewId", reviewId, "status", "CLAIMED");
  }

  @Transactional
  public Map<String, Object> confirm(AccountPrincipal principal, UUID reviewId) {
    access.requireReviewer(principal);
    Map<String, Object> meta = loadClaimed(principal, reviewId);
    BigDecimal aiMarks = (BigDecimal) meta.get("aiMarks");
    UUID responseId = (UUID) meta.get("responseId");
    jdbc.update(
        """
        UPDATE marking_review_queue SET status = 'CONFIRMED', final_marks = ?, decided_by = ?, decided_at = ?
        WHERE review_id = ?
        """,
        aiMarks,
        principal.accountId(),
        SqlTime.ts(clock.instant()),
        reviewId);
    finalizeResponse(responseId, aiMarks, "REVIEWER_CONFIRMED");
    return Map.of("reviewId", reviewId, "status", "CONFIRMED", "finalMarks", aiMarks);
  }

  @Transactional
  public Map<String, Object> adjust(
      AccountPrincipal principal, UUID reviewId, Map<String, Object> body) {
    access.requireReviewer(principal);
    Map<String, Object> meta = loadClaimed(principal, reviewId);
    UUID responseId = (UUID) meta.get("responseId");
    BigDecimal finalMarks = body.get("finalMarks") instanceof Number n
        ? BigDecimal.valueOf(n.doubleValue())
        : new BigDecimal(body.getOrDefault("finalMarks", "0").toString());
    String note = body.getOrDefault("reason", body.getOrDefault("decisionNote", "")).toString();
    jdbc.update(
        """
        UPDATE marking_review_queue SET status = 'ADJUSTED', final_marks = ?, decision_note = ?,
               decided_by = ?, decided_at = ?
        WHERE review_id = ?
        """,
        finalMarks,
        note,
        principal.accountId(),
        SqlTime.ts(clock.instant()),
        reviewId);
    finalizeResponse(responseId, finalMarks, "REVIEWER_CONFIRMED");
    return Map.of("reviewId", reviewId, "status", "ADJUSTED", "finalMarks", finalMarks);
  }

  @Transactional
  public Map<String, Object> release(AccountPrincipal principal, UUID reviewId) {
    access.requireReviewer(principal);
    int n = jdbc.update(
        """
        UPDATE marking_review_queue SET status = 'QUEUED', claimed_by = NULL, claimed_at = NULL
        WHERE review_id = ? AND claimed_by = ? AND status = 'CLAIMED'
        """,
        reviewId,
        principal.accountId());
    if (n == 0) {
      throw AppException.forbidden("Cannot release this claim");
    }
    return Map.of("reviewId", reviewId, "status", "QUEUED");
  }

  public Map<String, Object> sla(AccountPrincipal principal) {
    requireReviewerOrOwner(principal);
    Instant now = clock.instant();
    Long queued = jdbc.queryForObject(
        "SELECT COUNT(*) FROM marking_review_queue WHERE status = 'QUEUED'", Long.class);
    Long claimed = jdbc.queryForObject(
        "SELECT COUNT(*) FROM marking_review_queue WHERE status = 'CLAIMED'", Long.class);
    Long breached = jdbc.queryForObject(
        "SELECT COUNT(*) FROM marking_review_queue WHERE status IN ('QUEUED','CLAIMED') AND due_at < ?",
        Long.class,
        now);
    Long decided = jdbc.queryForObject(
        "SELECT COUNT(*) FROM marking_review_queue WHERE status IN ('CONFIRMED','ADJUSTED')",
        Long.class);
    Long adjusted = jdbc.queryForObject(
        "SELECT COUNT(*) FROM marking_review_queue WHERE status = 'ADJUSTED'", Long.class);
    double agreementRate = decided == null || decided == 0
        ? 1.0
        : 1.0 - ((adjusted == null ? 0 : adjusted) / (double) decided);
    return Map.of(
        "queued", queued == null ? 0 : queued,
        "claimed", claimed == null ? 0 : claimed,
        "breached", breached == null ? 0 : breached,
        "decided", decided == null ? 0 : decided,
        "agreementRate", agreementRate,
        "slaHours", 48,
        "accuracyClaims", "unvalidated");
  }

  private Map<String, Object> loadClaimed(AccountPrincipal principal, UUID reviewId) {
    Map<String, Object> meta = jdbc.query(
        """
        SELECT response_id, ai_marks, status, claimed_by FROM marking_review_queue WHERE review_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("responseId", rs.getObject("response_id"));
          m.put("aiMarks", rs.getBigDecimal("ai_marks"));
          m.put("status", rs.getString("status"));
          m.put("claimedBy", rs.getObject("claimed_by"));
          return m;
        },
        reviewId);
    if (meta == null) {
      throw AppException.notFound("Review not found");
    }
    if (!"CLAIMED".equals(meta.get("status"))) {
      throw AppException.badRequest("VALIDATION_FAILED", "Claim the review first");
    }
    Object claimedBy = meta.get("claimedBy");
    if (!(claimedBy instanceof UUID cu) || !cu.equals(principal.accountId())) {
      throw AppException.forbidden("Not your claim");
    }
    return meta;
  }

  private void finalizeResponse(UUID responseId, BigDecimal marks, String mode) {
    Short available = jdbc.query(
        "SELECT marks_available, student_id, question_id FROM student_response WHERE response_id = ?",
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return rs.getShort("marks_available");
        },
        responseId);
    Map<String, Object> ids = jdbc.query(
        "SELECT student_id, question_id FROM student_response WHERE response_id = ?",
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return Map.of("studentId", rs.getObject("student_id"), "questionId", rs.getLong("question_id"));
        },
        responseId);
    if (ids == null || available == null) {
      return;
    }
    boolean correct = marks.compareTo(BigDecimal.valueOf(available)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = ?,
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        marks,
        correct,
        mode,
        SqlTime.ts(clock.instant()),
        responseId);
    jdbc.update(
        """
        INSERT INTO marking_result (result_id, response_id, kind, is_final, marks_total, confidence, points_json)
        VALUES (?, ?, 'REVIEWER', TRUE, ?, 1.0, '[]'::jsonb)
        """,
        UUID.randomUUID(),
        responseId,
        marks);
    Long topicId = jdbc.query(
        "SELECT topic_id FROM question WHERE question_id = ?",
        rs -> rs.next() ? rs.getLong(1) : null,
        ids.get("questionId"));
    if (topicId != null) {
      masteryService.updateFromResponse((UUID) ids.get("studentId"), topicId, correct);
    }
  }
}
