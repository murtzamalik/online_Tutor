package com.karsaaz.studyloop.learning.practice.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.db.SqlTime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.marking.application.MarkingOrchestrator;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
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
        INSERT INTO practice_session (session_id, student_id, enrolment_id, mode, status, planned_count, topic_ids)
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?::bigint[])
        """,
        sessionId,
        studentId,
        enrolmentId,
        mode,
        body.get("plannedCount") != null ? Short.parseShort(body.get("plannedCount").toString()) : null,
        topicIdArray(body.get("topicIds")));
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
    Map<String, Object> out = new HashMap<>();
    out.put("responseId", responseId);
    out.put("status", "MARKING");
    out.put("resultUrl", "/api/v1/practice/answers/" + responseId + "/result");
    out.put("sse", true);
    Map<String, Object> session = loadSession(studentId, sessionId);
    if ("TARGET_GRADE".equals(session.get("mode"))) {
      out.put("keepGoing", keepGoingStatus(principal, sessionId));
    }
    return out;
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
    String mode = String.valueOf(session.get("mode"));
    if ("DIAGNOSTIC".equals(mode) || "ENTRANCE_TEST".equals(mode)) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Skip not allowed");
    }
  }

  @Transactional
  public Map<String, Object> endSession(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    jdbc.update(
        "UPDATE practice_session SET status = 'COMPLETED', ended_at = ? WHERE session_id = ? AND student_id = ?",
        SqlTime.ts(clock.instant()),
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
          AND q.licence_status IN ('OWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED')
          AND q.question_id NOT IN (
            SELECT question_id FROM session_question WHERE session_id = ?
          )
          AND q.question_id NOT IN (
            SELECT question_id FROM student_response WHERE student_id = ? AND session_id = ?
          )
          AND (
            SELECT CASE WHEN COALESCE(cardinality(ps.topic_ids), 0) = 0 THEN TRUE
                        ELSE q.topic_id = ANY(ps.topic_ids)
                          OR EXISTS (SELECT 1 FROM spec_topic st
                                     WHERE st.topic_id = q.topic_id AND st.parent_topic_id = ANY(ps.topic_ids))
                   END
            FROM practice_session ps WHERE ps.session_id = ?
          )
        ORDER BY COALESCE(m.mastery_probability, 0.3) ASC, q.times_served ASC, q.question_id
        LIMIT 1
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        studentId,
        specId,
        sessionId,
        studentId,
        sessionId,
        sessionId);
  }

  /** Session topic filter; null means "all topics in the enrolment". */
  private static String topicIdArray(Object raw) {
    if (!(raw instanceof List<?> list) || list.isEmpty()) {
      return null;
    }
    return list.stream()
        .map(o -> String.valueOf(Long.parseLong(o.toString())))
        .collect(java.util.stream.Collectors.joining(",", "{", "}"));
  }

  private Map<String, Object> loadQuestion(long questionId) {
    return jdbc.query(
        """
        SELECT question_id, topic_id, question_type, question_text, options_json::text AS options,
               marks_available, answer_format, diagram_id, source_type, source_reference, past_paper_id
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
          m.put("sourceType", rs.getString("source_type"));
          m.put("sourceReference", rs.getString("source_reference"));
          m.put("pastPaperId", rs.getObject("past_paper_id"));
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

  /** D-06 photo path — camera pipeline not ready; fail closed with FEATURE_DISABLED. */
  public Map<String, Object> submitPhoto(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    throw AppException.featureDisabled(
        "Photograph-to-score (PRA-06) is FEATURE_DISABLED until the camera pipeline is ready. Use typed practice instead.");
  }

  @Transactional
  public Map<String, Object> multiVersion(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID enrolmentId = UUID.fromString(body.get("enrolmentId").toString());
    assertEnrolment(principal.studentId(), enrolmentId);
    int versions = body.get("versions") instanceof Number n ? Math.min(5, Math.max(1, n.intValue())) : 3;
    Long topicId = body.get("topicId") instanceof Number n ? n.longValue() : null;
    List<Map<String, Object>> items = new ArrayList<>();
    for (int v = 0; v < versions; v++) {
      Long qid = jdbc.query(
          """
          SELECT question_id FROM question
          WHERE review_status = 'APPROVED' AND licence_status IN ('OWN','OFFICIAL_TEACHING_USE','BOARD_LICENSED')
            AND (?::bigint IS NULL OR topic_id = ?)
          ORDER BY random() LIMIT 1
          """,
          rs -> rs.next() ? rs.getLong(1) : null,
          topicId,
          topicId);
      if (qid == null) {
        break;
      }
      items.add(Map.of("version", v + 1, "questionId", qid, "question", loadQuestion(qid)));
    }
    Map<String, Object> session = startSession(principal, Map.of(
        "enrolmentId", enrolmentId.toString(),
        "mode", "MULTI_VERSION",
        "plannedCount", String.valueOf(items.size())));
    session.put("versions", items);
    return session;
  }

  public Map<String, Object> wrongAnswers(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    // Latest attempt per question only — a later full-mark response clears the redrill pool.
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT response_id, question_id, question_text, marks_awarded, marks_available, marked_at
        FROM (
          SELECT DISTINCT ON (sr.question_id)
            sr.response_id, sr.question_id, q.question_text, sr.marks_awarded, sr.marks_available,
            sr.marked_at, sr.is_correct
          FROM student_response sr
          JOIN question q ON q.question_id = sr.question_id
          WHERE sr.student_id = ? AND sr.marking_status = 'MARKED_FINAL'
          ORDER BY sr.question_id, sr.marked_at DESC NULLS LAST
        ) latest
        WHERE is_correct = FALSE
        ORDER BY marked_at DESC NULLS LAST
        LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("responseId", rs.getObject("response_id"));
          m.put("questionId", rs.getLong("question_id"));
          m.put("questionText", rs.getString("question_text"));
          m.put("marksAwarded", rs.getObject("marks_awarded"));
          m.put("marksAvailable", rs.getShort("marks_available"));
          return m;
        },
        sid);
    return Map.of("studentId", sid, "items", items);
  }

  public Map<String, Object> listQuizSets(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.requireStudent(principal);
    if (!sid.equals(principal.studentId())) {
      throw AppException.forbidden("Forbidden");
    }
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT set_id, title, topic_ids, question_count, created_at
        FROM saved_quiz_set WHERE student_id = ? ORDER BY created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("setId", rs.getObject("set_id"));
          m.put("title", rs.getString("title"));
          m.put("topicIds", rs.getArray("topic_ids") == null ? List.of() : List.of((Long[]) rs.getArray("topic_ids").getArray()));
          m.put("questionCount", rs.getShort("question_count"));
          return m;
        },
        sid);
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> saveQuizSet(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.requireStudent(principal);
    if (!sid.equals(principal.studentId())) {
      throw AppException.forbidden("Forbidden");
    }
    UUID setId = UUID.randomUUID();
    @SuppressWarnings("unchecked")
    List<Object> topicIds = body.get("topicIds") instanceof List<?> l ? (List<Object>) l : List.of();
    Long[] arr = topicIds.stream().map(o -> Long.valueOf(o.toString())).toArray(Long[]::new);
    short count = body.get("questionCount") instanceof Number n ? n.shortValue() : 10;
    String title = body.getOrDefault("title", "Custom quiz").toString();
    jdbc.update(
        connection -> {
          var ps =
              connection.prepareStatement(
                  "INSERT INTO saved_quiz_set (set_id, student_id, title, topic_ids, question_count) VALUES (?,?,?,?,?)");
          ps.setObject(1, setId);
          ps.setObject(2, sid);
          ps.setString(3, title);
          ps.setArray(4, connection.createArrayOf("bigint", arr));
          ps.setShort(5, count);
          return ps;
        });
    return Map.of("setId", setId, "title", title, "questionCount", count);
  }

  public Map<String, Object> studentTopics(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudentOrTeacher(principal, sid);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT t.topic_id, t.topic_name, t.topic_number,
               COALESCE(m.mastery_probability, 0.2) AS mastery
        FROM student_enrolment se
        JOIN spec_topic t ON t.specification_id = se.specification_id AND t.topic_level = 1
        LEFT JOIN mastery_state m ON m.topic_id = t.topic_id AND m.student_id = se.student_id AND m.model_type = 'BKT'
        WHERE se.student_id = ? AND se.status = 'ACTIVE'
        ORDER BY t.display_order NULLS LAST
        """,
        (rs, i) -> Rows.of(
            "topicId", rs.getLong("topic_id"),
            "topicName", rs.getString("topic_name"),
            "topicNumber", rs.getString("topic_number"),
            "mastery", rs.getBigDecimal("mastery")),
        sid);
    return Map.of("studentId", sid, "items", items);
  }

  public Map<String, Object> studentTopicDetail(AccountPrincipal principal, UUID studentId, long topicId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudentOrTeacher(principal, sid);
    Map<String, Object> topic = jdbc.query(
        """
        SELECT t.topic_id, t.topic_name, COALESCE(m.mastery_probability, 0.2) AS mastery, m.attempts_count
        FROM spec_topic t
        LEFT JOIN mastery_state m ON m.topic_id = t.topic_id AND m.student_id = ? AND m.model_type = 'BKT'
        WHERE t.topic_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("topicId", rs.getLong("topic_id"));
          m.put("topicName", rs.getString("topic_name"));
          m.put("mastery", rs.getBigDecimal("mastery"));
          m.put("attempts", rs.getObject("attempts_count"));
          return m;
        },
        sid,
        topicId);
    if (topic == null) {
      throw AppException.notFound("Topic not found");
    }
    List<Map<String, Object>> history = jdbc.query(
        """
        SELECT response_id, is_correct, marks_awarded, marked_at
        FROM student_response WHERE student_id = ? AND question_id IN (
          SELECT question_id FROM question WHERE topic_id = ?
        ) ORDER BY marked_at DESC NULLS LAST LIMIT 20
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("responseId", rs.getObject("response_id"));
          m.put("isCorrect", rs.getObject("is_correct"));
          m.put("marksAwarded", rs.getObject("marks_awarded"));
          return m;
        },
        sid,
        topicId);
    topic.put("history", history);
    return topic;
  }

  public Map<String, Object> search(AccountPrincipal principal, String q) {
    access.requireStudent(principal);
    String query = q == null ? "" : q.trim();
    List<Map<String, Object>> topics = jdbc.query(
        """
        SELECT topic_id, topic_name, 'TOPIC' AS kind FROM spec_topic
        WHERE topic_name ILIKE ? ORDER BY topic_name LIMIT 20
        """,
        (rs, i) -> Rows.of(
            "id", rs.getLong("topic_id"),
            "title", rs.getString("topic_name"),
            "kind", "TOPIC"),
        "%" + query + "%");
    List<Map<String, Object>> notes = jdbc.query(
        """
        SELECT note_id, spec_topic_id, 'NOTE' AS kind FROM revision_note
        WHERE status = 'APPROVED' AND body_md ILIKE ? LIMIT 10
        """,
        (rs, i) -> Rows.of(
            "id", rs.getLong("note_id"),
            "topicId", rs.getLong("spec_topic_id"),
            "kind", "NOTE",
            "title", "Revision note"),
        "%" + query + "%");
    List<Map<String, Object>> decks = jdbc.query(
        """
        SELECT deck_id, title, 'DECK' AS kind FROM flashcard_deck
        WHERE title ILIKE ? AND (kind = 'SYSTEM' OR owner_student_id = ?) LIMIT 10
        """,
        (rs, i) -> Rows.of(
            "id", rs.getObject("deck_id"),
            "title", rs.getString("title"),
            "kind", "DECK"),
        "%" + query + "%",
        principal.studentId());
    List<Map<String, Object>> items = new ArrayList<>();
    items.addAll(topics);
    items.addAll(notes);
    items.addAll(decks);
    return Map.of("query", query, "items", items);
  }

  @Transactional
  public Map<String, Object> setMode(AccountPrincipal principal, UUID sessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    loadSession(principal.studentId(), sessionId);
    String mode = body.getOrDefault("inputMode", body.getOrDefault("mode", "TYPED")).toString();
    boolean simplified = Boolean.TRUE.equals(body.get("simplifiedLanguage"));
    Map<String, Object> out = new HashMap<>();
    out.put("sessionId", sessionId);
    out.put("inputMode", mode);
    out.put("simplifiedLanguage", simplified);
    out.put("updated", true);
    out.put("marksUnchanged", true);
    out.put("note", "Simplified language never alters marks or facts (J-05).");
    return out;
  }

  /** D-10: evaluate keep-going consistency after answers in TARGET_GRADE session. */
  public Map<String, Object> keepGoingStatus(AccountPrincipal principal, UUID sessionId) {
    access.requireStudent(principal);
    var session = loadSession(principal.studentId(), sessionId);
    int window = 5;
    int minPct = 80;
    try {
      Integer w = jdbc.query(
          "SELECT value_json::text FROM app_config WHERE config_key = 'practice.keep_going.consistency_window'",
          rs -> rs.next() ? Integer.parseInt(rs.getString(1).replace("\"", "").trim()) : null);
      if (w != null) window = w;
      Integer p = jdbc.query(
          "SELECT value_json::text FROM app_config WHERE config_key = 'practice.keep_going.consistency_min_pct'",
          rs -> rs.next() ? Integer.parseInt(rs.getString(1).replace("\"", "").trim()) : null);
      if (p != null) minPct = p;
    } catch (Exception ignored) {
    }
    List<Boolean> recent = jdbc.query(
        """
        SELECT COALESCE(is_correct, FALSE) FROM student_response
        WHERE session_id = ? ORDER BY responded_at ASC
        """,
        (rs, i) -> rs.getBoolean(1),
        sessionId);
    boolean[] arr = new boolean[recent.size()];
    for (int i = 0; i < recent.size(); i++) {
      arr[i] = Boolean.TRUE.equals(recent.get(i));
    }
    boolean consistent = com.karsaaz.studyloop.learning.practice.domain.KeepGoingConsistency
        .meetsThreshold(arr, window, minPct);
    int consecutiveIncorrect = 0;
    for (int i = arr.length - 1; i >= 0; i--) {
      if (!arr[i]) {
        consecutiveIncorrect++;
      } else {
        break;
      }
    }
    boolean fatigue = com.karsaaz.studyloop.learning.practice.domain.KeepGoingConsistency
        .shouldStopForFatigue(consecutiveIncorrect, 4);
    Map<String, Object> out = new HashMap<>();
    out.put("sessionId", sessionId.toString());
    out.put("mode", session.get("mode"));
    out.put("answered", arr.length);
    out.put("windowSize", window);
    out.put("minPct", minPct);
    out.put("consistent", consistent);
    out.put("stopForFatigue", fatigue);
    out.put("keepGoing", !consistent && !fatigue);
    return out;
  }
}
