package com.karsaaz.studyloop.mastery.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.mastery.domain.BktEngine;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MasteryService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final Clock clock;

  public MasteryService(JdbcTemplate jdbc, StudentAccessHelper access, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.clock = clock;
  }

  @Transactional
  public void updateFromResponse(UUID studentId, long topicId, boolean correct) {
    var existing = jdbc.query(
        """
        SELECT mastery_id, mastery_probability, attempts_count, correct_count
        FROM mastery_state WHERE student_id = ? AND topic_id = ? AND model_type = 'BKT'
        """,
        rs -> rs.next()
            ? Map.of(
                "id", rs.getObject("mastery_id"),
                "p", rs.getBigDecimal("mastery_probability").doubleValue(),
                "attempts", rs.getInt("attempts_count"),
                "correct", rs.getInt("correct_count"))
            : null,
        studentId,
        topicId);
    BktEngine.State next;
    UUID masteryId;
    int attempts;
    int correctCount;
    if (existing == null) {
      next = BktEngine.update(BktEngine.P_INIT, correct);
      masteryId = UUID.randomUUID();
      attempts = 1;
      correctCount = correct ? 1 : 0;
      Instant reviewDue = clock.instant().plus(BktEngine.reviewDaysForLevel(next.masteryLevel()), ChronoUnit.DAYS);
      jdbc.update(
          """
          INSERT INTO mastery_state (mastery_id, student_id, topic_id, model_type, mastery_probability,
            mastery_level, attempts_count, correct_count, next_review_due_at, last_response_at)
          VALUES (?, ?, ?, 'BKT', ?, ?, ?, ?, ?, ?)
          """,
          masteryId,
          studentId,
          topicId,
          BktEngine.toDecimal(next.masteryProbability()),
          (short) next.masteryLevel(),
          attempts,
          correctCount,
          reviewDue,
          clock.instant());
    } else {
      double prior = (Double) existing.get("p");
      next = BktEngine.update(prior, correct);
      masteryId = (UUID) existing.get("id");
      attempts = (Integer) existing.get("attempts") + 1;
      correctCount = (Integer) existing.get("correct") + (correct ? 1 : 0);
      Instant reviewDue = clock.instant().plus(BktEngine.reviewDaysForLevel(next.masteryLevel()), ChronoUnit.DAYS);
      jdbc.update(
          """
          UPDATE mastery_state SET mastery_probability = ?, mastery_level = ?, attempts_count = ?,
            correct_count = ?, next_review_due_at = ?, last_response_at = ?, updated_at = now()
          WHERE mastery_id = ?
          """,
          BktEngine.toDecimal(next.masteryProbability()),
          (short) next.masteryLevel(),
          attempts,
          correctCount,
          reviewDue,
          clock.instant(),
          masteryId);
    }
  }

  public Map<String, Object> masteryTree(AccountPrincipal principal, UUID studentId, Long enrolmentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudentOrTeacher(principal, sid);
    Long specId = null;
    if (enrolmentId != null) {
      specId = jdbc.queryForObject(
          "SELECT specification_id FROM student_enrolment WHERE enrolment_id = ? AND student_id = ?",
          Long.class,
          enrolmentId,
          sid);
    }
    List<Map<String, Object>> topics = jdbc.query(
        """
        SELECT t.topic_id, t.topic_level, t.topic_number, t.topic_name, t.parent_topic_id,
               m.mastery_level, m.mastery_probability, m.next_review_due_at
        FROM spec_topic t
        LEFT JOIN mastery_state m ON m.topic_id = t.topic_id AND m.student_id = ? AND m.model_type = 'BKT'
        WHERE (?::bigint IS NULL OR t.specification_id = ?)
        ORDER BY t.display_order NULLS LAST, t.topic_id
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("topicId", rs.getLong("topic_id"));
          m.put("level", rs.getShort("topic_level"));
          m.put("number", rs.getString("topic_number"));
          m.put("name", rs.getString("topic_name"));
          m.put("parentTopicId", rs.getObject("parent_topic_id"));
          if (rs.getObject("mastery_level") != null) {
            m.put("masteryLevel", rs.getShort("mastery_level"));
            m.put("masteryProbability", rs.getBigDecimal("mastery_probability"));
            m.put("nextReviewDueAt", rs.getTimestamp("next_review_due_at"));
          } else {
            m.put("masteryLevel", 0);
            m.put("masteryProbability", BktEngine.P_INIT);
          }
          return m;
        },
        sid,
        specId,
        specId);
    return Map.of("studentId", sid, "enrolmentId", enrolmentId, "topics", topics);
  }

  public Map<String, Object> predictedGrades(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    var snap = jdbc.query(
        """
        SELECT grade_low, grade_high, grade_point, confidence, computed_at
        FROM predicted_grade_snapshot WHERE student_id = ? ORDER BY computed_at DESC LIMIT 1
        """,
        rs -> rs.next()
            ? Map.of(
                "gradeLow", rs.getString("grade_low"),
                "gradeHigh", rs.getString("grade_high"),
                "gradePoint", rs.getString("grade_point"),
                "confidence", rs.getBigDecimal("confidence"),
                "computedAt", rs.getTimestamp("computed_at").toInstant())
            : null,
        sid);
    if (snap == null) {
      return Map.of("studentId", sid, "status", "PREDICTED_STUB", "gradeLow", "4", "gradeHigh", "6");
    }
    Map<String, Object> out = new HashMap<>();
    out.put("studentId", sid);
    out.putAll(snap);
    return out;
  }

  public List<Map<String, Object>> reviewDue(AccountPrincipal principal, UUID studentId) {
    access.requireStudent(principal);
    UUID sid = access.resolveStudentId(principal, studentId);
    return jdbc.query(
        """
        SELECT m.topic_id, t.topic_name, m.mastery_level, m.next_review_due_at
        FROM mastery_state m
        JOIN spec_topic t ON t.topic_id = m.topic_id
        WHERE m.student_id = ? AND m.next_review_due_at IS NOT NULL AND m.next_review_due_at <= ?
        ORDER BY m.next_review_due_at
        LIMIT 50
        """,
        (rs, i) -> Map.of(
            "topicId", rs.getLong("topic_id"),
            "topicName", rs.getString("topic_name"),
            "masteryLevel", rs.getShort("mastery_level"),
            "dueAt", rs.getTimestamp("next_review_due_at").toInstant()),
        sid,
        clock.instant());
  }

  public void seedFromDiagnostic(UUID studentId, long topicId, double theta) {
    double p = Math.max(0.05, Math.min(0.95, 0.5 + theta * 0.1));
    BktEngine.State state = new BktEngine.State(p, BktEngine.masteryLevelFromP(p));
    UUID masteryId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO mastery_state (mastery_id, student_id, topic_id, model_type, mastery_probability,
          mastery_level, irt_theta, attempts_count, correct_count, next_review_due_at, last_response_at)
        VALUES (?, ?, ?, 'BKT', ?, ?, ?, 0, 0, ?, ?)
        ON CONFLICT (student_id, topic_id, model_type) DO UPDATE SET
          mastery_probability = EXCLUDED.mastery_probability,
          mastery_level = EXCLUDED.mastery_level,
          irt_theta = EXCLUDED.irt_theta,
          updated_at = now()
        """,
        masteryId,
        studentId,
        topicId,
        BktEngine.toDecimal(state.masteryProbability()),
        (short) state.masteryLevel(),
        BigDecimal.valueOf(theta),
        clock.instant().plus(BktEngine.reviewDaysForLevel(state.masteryLevel()), ChronoUnit.DAYS),
        clock.instant());
  }
}
