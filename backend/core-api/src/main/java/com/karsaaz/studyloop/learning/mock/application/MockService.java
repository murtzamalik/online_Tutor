package com.karsaaz.studyloop.learning.mock.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.common.error.AppException;
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
public class MockService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final Clock clock;
  private final ObjectMapper mapper = new ObjectMapper();

  public MockService(JdbcTemplate jdbc, StudentAccessHelper access, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.clock = clock;
  }

  public List<Map<String, Object>> listForStudent(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    return jdbc.query(
        """
        SELECT mock_id, student_id, enrolment_id, source_kind, status, score, total_marks,
               duration_minutes, started_at, submitted_at, created_at
        FROM mock_paper WHERE student_id = ? ORDER BY created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("mockId", rs.getObject("mock_id"));
          m.put("studentId", rs.getObject("student_id"));
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("sourceKind", rs.getString("source_kind"));
          m.put("status", rs.getString("status"));
          m.put("score", rs.getBigDecimal("score"));
          m.put("totalMarks", rs.getObject("total_marks"));
          m.put("durationMinutes", rs.getShort("duration_minutes"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("submittedAt", rs.getTimestamp("submitted_at"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        },
        sid);
  }

  public Map<String, Object> results(AccountPrincipal principal, UUID mockId) {
    Map<String, Object> mock = jdbc.query(
        """
        SELECT mock_id, student_id, enrolment_id, status, score, total_marks, result_json, submitted_at
        FROM mock_paper WHERE mock_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("mockId", rs.getObject("mock_id"));
          m.put("studentId", rs.getObject("student_id"));
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("status", rs.getString("status"));
          m.put("score", rs.getBigDecimal("score"));
          m.put("totalMarks", rs.getObject("total_marks"));
          m.put("resultJson", rs.getString("result_json"));
          m.put("submittedAt", rs.getTimestamp("submitted_at"));
          return m;
        },
        mockId);
    if (mock == null) {
      throw AppException.notFound("Mock not found");
    }
    UUID studentId = (UUID) mock.get("studentId");
    access.assertParentOrStudent(principal, studentId);
    Object parsed = mock.get("resultJson");
    try {
      if (parsed != null) {
        mock.put("result", mapper.readValue(parsed.toString(), Map.class));
      } else {
        mock.put("result", Map.of("topics", List.of(), "note", "No topic breakdown yet"));
      }
    } catch (Exception e) {
      mock.put("result", Map.of("raw", parsed));
    }
    return mock;
  }

  /** W1: create a completed diagnostic-style mock with result_json for D-11 demos. */
  @Transactional
  public Map<String, Object> createCompletedDemo(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID sid = principal.studentId();
    UUID enrolmentId = jdbc.query(
        """
        SELECT enrolment_id FROM student_enrolment
        WHERE student_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        sid);
    if (enrolmentId == null) {
      throw AppException.notFound("No active enrolment");
    }
    UUID existing = jdbc.query(
        """
        SELECT mock_id FROM mock_paper
        WHERE student_id = ? AND status = 'MARKED' ORDER BY created_at DESC LIMIT 1
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        sid);
    if (existing != null) {
      return results(principal, existing);
    }
    UUID mockId = UUID.randomUUID();
    String resultJson =
        """
        {"topics":[{"topicNumber":"1","label":"Atomic structure","marks":6,"score":4},
        {"topicNumber":"2","label":"Bonding","marks":4,"score":2}],
        "overallPct":60,"note":"W1 diagnostic-style mock"}
        """;
    jdbc.update(
        """
        INSERT INTO mock_paper (
          mock_id, student_id, enrolment_id, source_kind, duration_minutes, structure_json,
          status, started_at, submitted_at, total_marks, score, result_json
        ) VALUES (?, ?, ?, 'GENERATED', 45, '{"sections":[{"name":"A","marks":10}]}'::jsonb,
                  'MARKED', ?, ?, 10, 6.0, ?::jsonb)
        """,
        mockId,
        sid,
        enrolmentId,
        clock.instant(),
        clock.instant(),
        resultJson);
    Long qid = jdbc.query(
        "SELECT question_id FROM question WHERE review_status = 'APPROVED' ORDER BY question_id LIMIT 1",
        rs -> rs.next() ? rs.getLong(1) : null);
    if (qid != null) {
      jdbc.update(
          "INSERT INTO mock_paper_item (mock_id, seq, section, question_id, marks) VALUES (?, 1, 'A', ?, 2)",
          mockId,
          qid);
    }
    return results(principal, mockId);
  }
}
