package com.karsaaz.studyloop.learning.practice.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.marking.application.MarkingOrchestrator;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PracticeService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final MarkingOrchestrator markingOrchestrator;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public PracticeService(
      JdbcTemplate jdbc,
      StudentAccessHelper access,
      MarkingOrchestrator markingOrchestrator,
      ObjectMapper objectMapper,
      Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.markingOrchestrator = markingOrchestrator;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional
  public Map<String, Object> startSession(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    UUID enrolmentId = UUID.fromString(body.get("enrolmentId").toString());
    String mode = body.get("mode") != null ? body.get("mode").toString() : "MIXED";
    assertEnrolment(studentId, enrolmentId);
    UUID sessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO practice_session (session_id, student_id, enrolment_id, mode, status, planned_count)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?)
        """,
        sessionId,
        studentId,
        enrolmentId,
        mode,
        body.get("plannedCount") != null ? Short.parseShort(body.get("plannedCount").toString()) : null);
    return Map.of(
        "sessionId", sessionId,
        "status", "ACTIVE",
        "mode", mode,
        "startedAt", clock.instant().toString());
  }

  public Map<String, Object> sessionState(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    return loadSession(principal.studentId(), sessionId);
  }

  @Transactional
  public Map<String, Object> nextQuestion(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    var session = loadSession(studentId, sessionId);
    if (!"ACTIVE".equals(session.get("status"))) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Session not active");
    }
    UUID enrolmentId = (UUID) session.get("enrolmentId");
    Long specId = jdbc.queryForObject(
        "SELECT specification_id FROM student_enrolment WHERE enrolment_id = ?",
        Long.class,
        enrolmentId);
    Short seq = jdbc.queryForObject(
        "SELECT COALESCE(MAX(seq), 0) + 1 FROM session_question WHERE session_id = ?",
        Short.class,
        sessionId);
    Long questionId = pickQuestion(studentId, specId, sessionId);
    if (questionId == null) {
      return Map.of("done", true);
    }
    UUID sqId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO session_question (session_question_id, session_id, seq, question_id, selection_reason_json)
        VALUES (?, ?, ?, ?, ?::jsonb)
        """,
        sqId,
        sessionId,
        seq,
        questionId,
        "{\"reason\":\"low_mastery_unused\"}");
    jdbc.update("UPDATE question SET times_served = times_served + 1 WHERE question_id = ?", questionId);
    Map<String, Object> q = loadQuestion(questionId);
    Map<String, Object> out = new HashMap<>();
    out.put("sessionQuestionId", sqId);
    out.put("seq", seq);
    out.put("question", q);
    out.put("selectionReason", Map.of("reason", "low_mastery_unused"));
    out.put("done", false);
    return out;
  }

  @Transactional
  public Map<String, Object> submitAnswer(AccountPrincipal principal, UUID sessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    loadSession(studentId, sessionId);
    long questionId = Long.parseLong(body.get("questionId").toString());
    String qualCode = jdbc.queryForObject(
        """
        SELECT q.code FROM student_enrolment e
        JOIN specification s ON s.specification_id = e.specification_id
        JOIN qualification q ON q.qualification_id = s.qualification_id
        JOIN practice_session ps ON ps.enrolment_id = e.enrolment_id
        WHERE ps.session_id = ?
        """,
        String.class,
        sessionId);
    short marksAvailable = jdbc.queryForObject(
        "SELECT marks_available FROM question WHERE question_id = ?", Short.class, questionId);
    UUID responseId = UUID.randomUUID();
    AnswerParsed parsed = parseAnswer(body);
    jdbc.update(
        """
        INSERT INTO student_response (response_id, student_id, question_id, session_id, qualification_code,
          answer_input_mode, answer_text, answer_structured_json, marks_available, marking_status)
        VALUES (?, ?, ?, ?, ?, 'TYPED', ?, ?::jsonb, ?, 'PENDING')
        """,
        responseId,
        studentId,
        questionId,
        sessionId,
        qualCode,
        parsed.answerText(),
        parsed.structuredJson(),
        marksAvailable);
    bumpDailyProgress(studentId);
    markingOrchestrator.mark(responseId);
    return Map.of(
        "responseId", responseId,
        "status", "MARKING",
        "resultUrl", "/api/v1/practice/answers/" + responseId + "/result",
        "sse", true);
  }

  private record AnswerParsed(String answerText, String structuredJson) {}

  private AnswerParsed parseAnswer(Map<String, Object> body) {
    Object raw = body.get("answer");
    if (raw instanceof Map<?, ?> ans) {
      Object text = ans.get("text");
      Object optionId = ans.get("optionId");
      Object value = ans.get("value");
      String answerText =
          text != null ? text.toString() : (optionId != null ? optionId.toString() : (value != null ? value.toString() : null));
      Map<String, Object> structured = new HashMap<>();
      if (optionId != null) {
        structured.put("optionId", optionId);
        structured.put("selectedKey", optionId);
      }
      if (value != null) {
        structured.put("value", value);
      }
      if (ans.get("unit") != null) {
        structured.put("unit", ans.get("unit"));
      }
      if (ans.get("structured") instanceof Map<?, ?> s) {
        //noinspection unchecked
        structured.putAll((Map<String, Object>) s);
      }
      if (ans.get("type") != null) {
        structured.put("type", ans.get("type"));
      }
      return new AnswerParsed(answerText, toJson(structured.isEmpty() ? ans : structured));
    }
    String answerText = body.get("answerText") != null ? body.get("answerText").toString() : null;
    return new AnswerParsed(answerText, toJson(body.get("answerStructured")));
  }

  public Map<String, Object> pollResult(AccountPrincipal principal, UUID responseId) {
    access.requireStudent(principal);
    return jdbc.query(
        """
        SELECT sr.marking_status, sr.marks_awarded, sr.marks_available, sr.is_correct,
               mr.points_json::text AS points, mr.feedback_json::text AS feedback
        FROM student_response sr
        LEFT JOIN marking_result mr ON mr.response_id = sr.response_id AND mr.is_final = TRUE
        WHERE sr.response_id = ? AND sr.student_id = ?
        ORDER BY mr.created_at DESC NULLS LAST
        LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Response not found");
          }
          String markingStatus = rs.getString("marking_status");
          String status = switch (markingStatus) {
            case "PENDING" -> "MARKING";
            case "IN_EXCEPTION" -> "PROVISIONAL_EXCEPTION";
            case "MARKED_FINAL", "CONFIRMED" -> "FINAL";
            default -> markingStatus;
          };
          Map<String, Object> out = new HashMap<>();
          out.put("responseId", responseId);
          out.put("status", status);
          out.put("markingStatus", markingStatus);
          Object awarded = rs.getObject("marks_awarded");
          short available = rs.getShort("marks_available");
          out.put("marks", Map.of(
              "awarded", awarded == null ? 0 : awarded,
              "available", available,
              "max", available));
          out.put("isCorrect", rs.getObject("is_correct"));
          out.put("points", parseJsonList(rs.getString("points")));
          out.put("feedback", parseJsonMap(rs.getString("feedback")));
          out.put("reveal", Map.of("schemeAvailable", !"PENDING".equals(markingStatus)));
          out.put("provisional", "IN_EXCEPTION".equals(markingStatus));
          return out;
        },
        responseId,
        principal.studentId());
  }

  private List<Map<String, Object>> parseJsonList(String json) {
    if (json == null || json.isBlank()) {
      return List.of();
    }
    try {
      @SuppressWarnings("unchecked")
      List<Map<String, Object>> list = objectMapper.readValue(json, List.class);
      return list;
    } catch (Exception e) {
      return List.of();
    }
  }

  private Map<String, Object> parseJsonMap(String json) {
    if (json == null || json.isBlank()) {
      return Map.of();
    }
    try {
      @SuppressWarnings("unchecked")
      Map<String, Object> map = objectMapper.readValue(json, Map.class);
      return map;
    } catch (Exception e) {
      return Map.of();
    }
  }

  @Transactional
  public Map<String, Object> hint(AccountPrincipal principal, UUID sessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    loadSession(principal.studentId(), sessionId);
    Object qid = body != null ? body.get("questionId") : null;
    short level = body != null && body.get("level") != null ? Short.parseShort(body.get("level").toString()) : 1;
    if (level < 1 || level > 3) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid hint level");
    }
    String hintText = switch (level) {
      case 1 -> "Re-read the question and identify the command word.";
      case 2 -> "Recall the key definition or formula for this topic.";
      default -> "Break the problem into steps; write what you know first.";
    };
    if (qid != null) {
      try {
        jdbc.update(
            """
            INSERT INTO hint_event (hint_id, session_id, student_id, question_id, level, hint_text)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            UUID.randomUUID(),
            sessionId,
            principal.studentId(),
            Long.parseLong(qid.toString()),
            level,
            hintText);
      } catch (Exception ignored) {
        // schema may differ slightly; still return static hint
      }
    }
    return Map.of("level", (int) level, "hintText", hintText);
  }

  @Transactional
  public void skip(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    var session = loadSession(principal.studentId(), sessionId);
    if ("DIAGNOSTIC".equals(session.get("mode"))) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Skip not allowed");
    }
  }

  @Transactional
  public Map<String, Object> endSession(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    jdbc.update(
        "UPDATE practice_session SET status = 'COMPLETED', ended_at = ? WHERE session_id = ? AND student_id = ?",
        clock.instant(),
        sessionId,
        principal.studentId());
    Integer answered = jdbc.queryForObject(
        "SELECT COUNT(*) FROM student_response WHERE session_id = ?", Integer.class, sessionId);
    return Map.of(
        "sessionId", sessionId,
        "status", "COMPLETED",
        "summary", Map.of("answered", answered == null ? 0 : answered));
  }

  private Long pickQuestion(UUID studentId, long specId, UUID sessionId) {
    return jdbc.query(
        """
        SELECT q.question_id
        FROM question q
        LEFT JOIN mastery_state m ON m.topic_id = q.topic_id AND m.student_id = ? AND m.model_type = 'BKT'
        WHERE q.specification_id = ? AND q.review_status = 'APPROVED'
          AND q.question_id NOT IN (
            SELECT question_id FROM session_question WHERE session_id = ?
          )
          AND q.question_id NOT IN (
            SELECT question_id FROM student_response WHERE student_id = ? AND session_id = ?
          )
        ORDER BY COALESCE(m.mastery_probability, 0.3) ASC, q.times_served ASC, q.question_id
        LIMIT 1
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        studentId,
        specId,
        sessionId,
        studentId,
        sessionId);
  }

  private Map<String, Object> loadQuestion(long questionId) {
    return jdbc.query(
        """
        SELECT question_id, topic_id, question_type, question_text, options_json::text AS options,
               marks_available, answer_format, diagram_id
        FROM question WHERE question_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Question not found");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("questionId", rs.getLong("question_id"));
          m.put("topicId", rs.getLong("topic_id"));
          m.put("questionType", rs.getString("question_type"));
          m.put("questionText", rs.getString("question_text"));
          String options = rs.getString("options");
          if (options != null) {
            try {
              m.put("optionsJson", objectMapper.readValue(options, Object.class));
            } catch (Exception e) {
              m.put("optionsJson", null);
            }
          } else {
            m.put("optionsJson", null);
          }
          m.put("marksAvailable", rs.getShort("marks_available"));
          m.put("answerFormat", rs.getString("answer_format"));
          m.put("diagramId", rs.getString("diagram_id"));
          return m;
        },
        questionId);
  }

  private Map<String, Object> loadSession(UUID studentId, UUID sessionId) {
    var s = jdbc.query(
        """
        SELECT session_id, student_id, enrolment_id, mode, status, started_at, ended_at
        FROM practice_session WHERE session_id = ? AND student_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Session not found");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("sessionId", rs.getObject("session_id"));
          m.put("studentId", rs.getObject("student_id"));
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("mode", rs.getString("mode"));
          m.put("status", rs.getString("status"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("endedAt", rs.getTimestamp("ended_at"));
          return m;
        },
        sessionId,
        studentId);
    return s;
  }

  private void assertEnrolment(UUID studentId, UUID enrolmentId) {
    Integer ok = jdbc.queryForObject(
        "SELECT COUNT(*) FROM student_enrolment WHERE enrolment_id = ? AND student_id = ? AND status = 'ACTIVE'",
        Integer.class,
        enrolmentId,
        studentId);
    if (ok == null || ok == 0) {
      throw AppException.forbidden("Invalid enrolment");
    }
  }

  private void bumpDailyProgress(UUID studentId) {
    LocalDate day = LocalDate.now(clock);
    jdbc.update(
        """
        INSERT INTO daily_goal_progress (student_id, day, answered, target)
        SELECT ?, ?, 1, dg.target_questions FROM daily_goal dg WHERE dg.student_id = ?
        ON CONFLICT (student_id, day) DO UPDATE SET answered = daily_goal_progress.answered + 1
        """,
        studentId,
        day,
        studentId);
  }

  private String toJson(Object o) {
    if (o == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(o);
    } catch (Exception e) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid structured answer");
    }
  }
}
