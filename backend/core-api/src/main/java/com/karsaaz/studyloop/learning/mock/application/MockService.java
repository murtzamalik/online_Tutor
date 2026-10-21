package com.karsaaz.studyloop.learning.mock.application;

import com.karsaaz.studyloop.common.db.SqlTime;

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
        SqlTime.ts(clock.instant()),
        SqlTime.ts(clock.instant()),
        resultJson);
    Long qid = jdbc.query(
        "SELECT question_id FROM question WHERE review_status = 'APPROVED' AND licence_status IN ('OWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED') ORDER BY question_id LIMIT 1",
        rs -> rs.next() ? rs.getLong(1) : null);
    if (qid != null) {
      jdbc.update(
          "INSERT INTO mock_paper_item (mock_id, seq, section, question_id, marks) VALUES (?, 1, 'A', ?, 2)",
          mockId,
          qid);
    }
    return results(principal, mockId);
  }

  @Transactional
  public Map<String, Object> createMock(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID sid = principal.studentId();
    UUID enrolmentId = UUID.fromString(body.get("enrolmentId").toString());
    short duration = body.get("durationMinutes") instanceof Number n ? n.shortValue() : 45;
    int extendedPct = 0;
    if (body.get("extendedTimePct") instanceof Number n) {
      extendedPct = n.intValue();
    } else if (Boolean.TRUE.equals(body.get("extendedTime"))) {
      extendedPct = 25;
    } else {
      // J-04: read from accessibility_json
      String a11y = jdbc.query(
          "SELECT accessibility_json::text FROM student_profile WHERE student_id = ?",
          rs -> rs.next() ? rs.getString(1) : "{}",
          sid);
      if (a11y != null && a11y.contains("extended_time_pct")) {
        try {
          var node = mapper.readTree(a11y).path("extended_time_pct");
          if (node.isNumber()) {
            extendedPct = node.asInt();
          }
        } catch (Exception ignored) {
        }
      }
      // also accept camelCase
      if (extendedPct == 0 && a11y != null && a11y.contains("extendedTimePct")) {
        try {
          var node = mapper.readTree(a11y).path("extendedTimePct");
          if (node.isNumber()) {
            extendedPct = node.asInt();
          }
        } catch (Exception ignored) {
        }
      }
    }
    if (extendedPct < 0) {
      extendedPct = 0;
    }
    if (extendedPct > 100) {
      extendedPct = 100;
    }
    short adjusted = (short) Math.round(duration * (1.0 + extendedPct / 100.0));
    UUID mockId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO mock_paper (
          mock_id, student_id, enrolment_id, source_kind, duration_minutes, extended_time_pct,
          structure_json, status)
        VALUES (?, ?, ?, ?, ?, ?, '{"sections":[{"name":"A"}]}'::jsonb, 'SETUP')
        """,
        mockId, sid, enrolmentId,
        body.getOrDefault("sourceKind", "GENERATED").toString(),
        adjusted,
        (short) extendedPct);
    List<Long> qids = jdbc.query(
        """
        SELECT q.question_id FROM question q
        JOIN student_enrolment se ON se.specification_id = q.specification_id
        WHERE se.enrolment_id = ? AND q.review_status = 'APPROVED'
          AND q.licence_status IN ('OWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED')
        ORDER BY random() LIMIT 10
        """,
        (rs, i) -> rs.getLong(1),
        enrolmentId);
    short seq = 1;
    for (Long qid : qids) {
      jdbc.update(
          "INSERT INTO mock_paper_item (mock_id, seq, section, question_id, marks) VALUES (?, ?, 'A', ?, 2)",
          mockId, seq++, qid);
    }
    Map<String, Object> out = new HashMap<>();
    out.put("mockId", mockId);
    out.put("status", "SETUP");
    out.put("durationMinutes", adjusted);
    out.put("baseDurationMinutes", duration);
    out.put("extendedTimePct", extendedPct);
    out.put("extendedTime", extendedPct > 0);
    out.put("itemCount", qids.size());
    return out;
  }

  public Map<String, Object> getMock(AccountPrincipal principal, UUID mockId) {
    Map<String, Object> mock = loadMock(mockId);
    access.assertParentOrStudent(principal, (UUID) mock.get("studentId"));
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT i.seq, i.section, i.question_id, i.marks, q.question_text, q.question_type, i.answer_text
        FROM mock_paper_item i
        JOIN question q ON q.question_id = i.question_id
        WHERE i.mock_id = ? ORDER BY i.seq
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("seq", rs.getShort("seq"));
          m.put("section", rs.getString("section"));
          m.put("questionId", rs.getLong("question_id"));
          m.put("marks", rs.getShort("marks"));
          m.put("questionText", rs.getString("question_text"));
          m.put("questionType", rs.getString("question_type"));
          m.put("answerText", rs.getString("answer_text"));
          return m;
        },
        mockId);
    mock.put("items", items);
    return mock;
  }

  @Transactional
  public Map<String, Object> start(AccountPrincipal principal, UUID mockId) {
    access.requireStudent(principal);
    Map<String, Object> mock = loadMock(mockId);
    if (!principal.studentId().equals(mock.get("studentId"))) {
      throw AppException.forbidden("Forbidden");
    }
    jdbc.update(
        "UPDATE mock_paper SET status = 'IN_PROGRESS', started_at = ? WHERE mock_id = ? AND status = 'SETUP'",
        SqlTime.ts(clock.instant()), mockId);
    return getMock(principal, mockId);
  }

  @Transactional
  public Map<String, Object> saveAnswer(AccountPrincipal principal, UUID mockId, int seq, Map<String, Object> body) {
    access.requireStudent(principal);
    Map<String, Object> mock = loadMock(mockId);
    if (!principal.studentId().equals(mock.get("studentId"))) {
      throw AppException.forbidden("Forbidden");
    }
    jdbc.update(
        "UPDATE mock_paper_item SET answer_text = ? WHERE mock_id = ? AND seq = ?",
        body.getOrDefault("answerText", "").toString(), mockId, (short) seq);
    return Map.of("mockId", mockId, "seq", seq, "saved", true);
  }

  @Transactional
  public Map<String, Object> submit(AccountPrincipal principal, UUID mockId) {
    access.requireStudent(principal);
    Map<String, Object> mock = loadMock(mockId);
    if (!principal.studentId().equals(mock.get("studentId"))) {
      throw AppException.forbidden("Forbidden");
    }
    Integer total = jdbc.queryForObject(
        "SELECT COALESCE(SUM(marks),0) FROM mock_paper_item WHERE mock_id = ?", Integer.class, mockId);
    jdbc.update(
        """
        UPDATE mock_paper SET status = 'MARKED', submitted_at = ?, total_marks = ?, score = ?,
          result_json = jsonb_build_object('note','Auto-scored demo mock','overallPct',60)
        WHERE mock_id = ?
        """,
        SqlTime.ts(clock.instant()), total == null ? 0 : total.shortValue(),
        total == null ? 0 : total * 0.6, mockId);
    return results(principal, mockId);
  }

  public Map<String, Object> photoPages(AccountPrincipal principal, UUID mockId, Map<String, Object> body) {
    access.requireStudent(principal);
    throw AppException.featureDisabled("Mock photo upload (MOC-07) is FEATURE_DISABLED with PRA-06 camera pipeline.");
  }

  public Map<String, Object> pdf(AccountPrincipal principal, UUID mockId) {
    Map<String, Object> mock = results(principal, mockId);
    mock.put("pdfUrl", "/api/v1/mock-papers/" + mockId + "/pdf");
    mock.put("note", "Demo PDF placeholder — print results from browser");
    return mock;
  }

  private Map<String, Object> loadMock(UUID mockId) {
    Map<String, Object> mock = jdbc.query(
        """
        SELECT mock_id, student_id, enrolment_id, source_kind, status, duration_minutes, started_at, submitted_at
        FROM mock_paper WHERE mock_id = ?
        """,
        rs -> {
          if (!rs.next()) return null;
          Map<String, Object> m = new HashMap<>();
          m.put("mockId", rs.getObject("mock_id"));
          m.put("studentId", rs.getObject("student_id"));
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("sourceKind", rs.getString("source_kind"));
          m.put("status", rs.getString("status"));
          m.put("durationMinutes", rs.getShort("duration_minutes"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("submittedAt", rs.getTimestamp("submitted_at"));
          return m;
        },
        mockId);
    if (mock == null) throw AppException.notFound("Mock not found");
    return mock;
  }
}
