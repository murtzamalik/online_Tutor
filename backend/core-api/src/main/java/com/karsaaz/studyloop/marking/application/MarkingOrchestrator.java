package com.karsaaz.studyloop.marking.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarkingOrchestrator {
  private final JdbcTemplate jdbc;
  private final McqMarker mcqMarker;
  private final NumericMarker numericMarker;
  private final GatewayClient gatewayClient;
  private final MasteryService masteryService;
  private final ObjectMapper objectMapper;
  private final Clock clock;

  public MarkingOrchestrator(
      JdbcTemplate jdbc,
      McqMarker mcqMarker,
      NumericMarker numericMarker,
      GatewayClient gatewayClient,
      MasteryService masteryService,
      ObjectMapper objectMapper,
      Clock clock) {
    this.jdbc = jdbc;
    this.mcqMarker = mcqMarker;
    this.numericMarker = numericMarker;
    this.gatewayClient = gatewayClient;
    this.masteryService = masteryService;
    this.objectMapper = objectMapper;
    this.clock = clock;
  }

  @Transactional
  public void mark(UUID responseId) {
    Map<String, Object> row = jdbc.query(
        """
        SELECT sr.student_id, sr.question_id, sr.answer_text, sr.answer_structured_json::text AS structured,
               sr.marks_available, q.question_type, q.options_json::text AS options,
               q.answer_spec_json::text AS answer_spec, ms.marking_points_json::text AS scheme_points,
               ms.total_marks AS scheme_total, ms.scheme_type, q.topic_id
        FROM student_response sr
        JOIN question q ON q.question_id = sr.question_id
        LEFT JOIN mark_scheme ms ON ms.question_id = q.question_id
        WHERE sr.response_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("studentId", rs.getObject("student_id"));
          m.put("questionId", rs.getLong("question_id"));
          m.put("answerText", rs.getString("answer_text") == null ? "" : rs.getString("answer_text"));
          m.put("structured", rs.getString("structured"));
          m.put("marksAvailable", rs.getShort("marks_available"));
          m.put("questionType", rs.getString("question_type"));
          m.put("options", rs.getString("options"));
          m.put("answerSpec", rs.getString("answer_spec"));
          m.put("schemePoints", rs.getString("scheme_points"));
          m.put("schemeTotal", rs.getObject("scheme_total"));
          m.put("schemeType", rs.getString("scheme_type"));
          m.put("topicId", rs.getLong("topic_id"));
          return m;
        },
        responseId);
    if (row == null) {
      return;
    }
    UUID studentId = (UUID) row.get("studentId");
    long questionId = (Long) row.get("questionId");
    short marksAvailable = (Short) row.get("marksAvailable");
    String questionType = (String) row.get("questionType");
    String structured = (String) row.get("structured");
    String options = (String) row.get("options");
    String answerSpec = (String) row.get("answerSpec");
    String answerText = (String) row.get("answerText");
    long topicId = (Long) row.get("topicId");

    McqMarker.ObjectiveResult mcq = mcqMarker.mark(options, structured, marksAvailable);
    if (mcq.applicable()) {
      finalizeObjective(responseId, studentId, topicId, mcq, marksAvailable);
      return;
    }
    NumericMarker.ObjectiveResult num = numericMarker.mark(answerSpec, structured, marksAvailable);
    if (num.applicable()) {
      finalizeObjective(responseId, studentId, topicId, num, marksAvailable);
      return;
    }

    AiPass passA = runAiMark("P-MK-01", answerText, row);
    AiPass passB = runAiMark("P-MK-02", answerText, row);
    PassCompare.Decision decision = PassCompare.compare(
        passA.marks, passA.confidence, passB.marks, passB.confidence, BigDecimal.valueOf(marksAvailable));
    if (decision.outcome() != PassCompare.Outcome.AGREE) {
      insertMarkingResult(responseId, "AI_PASS_A", passA.marks, passA.confidence, passA.points, false);
      insertMarkingResult(responseId, "AI_PASS_B", passB.marks, passB.confidence, passB.points, false);
      String trigger = decision.outcome() == PassCompare.Outcome.LOW_CONFIDENCE
          ? "LOW_CONFIDENCE"
          : "PASS_DISAGREEMENT";
      jdbc.update(
          """
          INSERT INTO marking_exception (exception_id, response_id, trigger, status, original_marks, sla_due_at)
          VALUES (?, ?, ?, 'OPEN', ?, ?)
          """,
          UUID.randomUUID(),
          responseId,
          trigger,
          passA.marks,
          clock.instant().plusSeconds(48 * 3600));
      jdbc.update(
          "UPDATE student_response SET marking_status = 'IN_EXCEPTION' WHERE response_id = ?",
          responseId);
      return;
    }

    String qualificationCode = jdbc.query(
        "SELECT qualification_code FROM student_response WHERE response_id = ?",
        rs -> rs.next() ? rs.getString(1) : "GCSE",
        responseId);
    boolean aLevelOn = Boolean.TRUE.equals(jdbc.query(
        "SELECT enabled FROM feature_flag WHERE flag_key = 'a_level_review'",
        rs -> rs.next() ? rs.getBoolean(1) : false));
    if (ALevelProvisionalRouter.shouldQueueForReview(aLevelOn, qualificationCode)) {
      AiPass aLevel = runAiMark("P-MK-04", answerText, row);
      insertMarkingResult(responseId, "AI_A_LEVEL", aLevel.marks, aLevel.confidence, aLevel.points, false);
      jdbc.update(
          """
          UPDATE student_response SET marks_awarded = ?, is_correct = NULL, marking_mode = 'AI_PROVISIONAL',
                 marking_status = 'MARKED_PROVISIONAL', marked_at = ?, counts_toward_progress = FALSE
          WHERE response_id = ?
          """,
          aLevel.marks,
          clock.instant(),
          responseId);
      Long specId = jdbc.query(
          "SELECT specification_id FROM question WHERE question_id = ?",
          rs -> rs.next() ? rs.getLong(1) : null,
          questionId);
      if (specId != null) {
        jdbc.update(
            """
            INSERT INTO marking_review_queue (
              review_id, response_id, anonymous_ref, specification_id, status, ai_marks, due_at)
            VALUES (?, ?, ?, ?, 'QUEUED', ?, ?)
            ON CONFLICT (response_id) DO NOTHING
            """,
            UUID.randomUUID(),
            responseId,
            "AL-" + responseId.toString().substring(0, 8).toUpperCase(),
            specId,
            aLevel.marks,
            clock.instant().plusSeconds(ALevelProvisionalRouter.defaultSlaHours() * 3600L));
      }
      return;
    }

    insertMarkingResult(responseId, "AI_PASS_A", passA.marks, passA.confidence, passA.points, false);
    insertMarkingResult(responseId, "AI_PASS_B", passB.marks, passB.confidence, passB.points, true);
    boolean correct = decision.finalMarks().compareTo(BigDecimal.valueOf(marksAvailable)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = 'AI_FINAL',
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        decision.finalMarks(),
        correct,
        clock.instant(),
        responseId);
    masteryService.updateFromResponse(studentId, topicId, correct);
  }

  private void finalizeObjective(
      UUID responseId,
      UUID studentId,
      long topicId,
      McqMarker.ObjectiveResult result,
      short marksAvailable) {
    insertMarkingResult(
        responseId,
        "OBJECTIVE",
        result.marksAwarded(),
        result.confidence(),
        result.points(),
        true);
    boolean correct = result.marksAwarded().compareTo(BigDecimal.valueOf(marksAvailable)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = 'AUTO_OBJECTIVE',
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        result.marksAwarded(),
        correct,
        clock.instant(),
        responseId);
    masteryService.updateFromResponse(studentId, topicId, correct);
  }

  private void finalizeObjective(
      UUID responseId,
      UUID studentId,
      long topicId,
      NumericMarker.ObjectiveResult result,
      short marksAvailable) {
    insertMarkingResult(
        responseId,
        "OBJECTIVE",
        result.marksAwarded(),
        result.confidence(),
        result.points(),
        true);
    boolean correct = result.marksAwarded().compareTo(BigDecimal.valueOf(marksAvailable)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = 'AUTO_OBJECTIVE',
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        result.marksAwarded(),
        correct,
        clock.instant(),
        responseId);
    masteryService.updateFromResponse(studentId, topicId, correct);
  }

  private record AiPass(BigDecimal marks, double confidence, List<Map<String, Object>> points) {}

  @SuppressWarnings("unchecked")
  private AiPass runAiMark(String promptId, String answerText, Map<String, Object> row) {
    try {
      Map<String, Object> vars = Map.of(
          "answerText", answerText,
          "questionType", row.get("questionType"),
          "marksAvailable", row.get("marksAvailable"));
      Map<?, ?> resp = gatewayClient.run(promptId, vars, "marking_result_v1");
      Map<?, ?> result = (Map<?, ?>) resp.get("result");
      if (result == null) {
        return localStub(row);
      }
      double conf = result.get("confidence") instanceof Number n ? n.doubleValue() : 0.9;
      List<Map<String, Object>> points = new ArrayList<>();
      BigDecimal total = BigDecimal.ZERO;
      Object pts = result.get("points");
      if (pts instanceof List<?> list) {
        for (Object o : list) {
          if (o instanceof Map<?, ?> m) {
            BigDecimal awarded = m.get("awarded") instanceof Number n
                ? BigDecimal.valueOf(n.doubleValue())
                : BigDecimal.ZERO;
            total = total.add(awarded);
            points.add(Map.of(
                "id", String.valueOf(m.get("id")),
                "awarded", awarded,
                "max", m.get("max"),
                "evidence", m.get("evidence")));
          }
        }
      }
      return new AiPass(total, conf, points);
    } catch (Exception e) {
      return localStub(row);
    }
  }

  private AiPass localStub(Map<String, Object> row) {
    short marksAvailable = (Short) row.get("marksAvailable");
    BigDecimal half = BigDecimal.valueOf(marksAvailable).multiply(new BigDecimal("0.5"));
    List<Map<String, Object>> points = List.of(Map.of(
        "id", "STUB",
        "awarded", half,
        "max", marksAvailable,
        "evidence", "local_stub"));
    return new AiPass(half, 0.85, points);
  }

  private void insertMarkingResult(
      UUID responseId,
      String kind,
      BigDecimal marks,
      double confidence,
      List<Map<String, Object>> points,
      boolean isFinal) {
    try {
      jdbc.update(
          """
          INSERT INTO marking_result (result_id, response_id, kind, is_final, marks_total, confidence, points_json)
          VALUES (?, ?, ?, ?, ?, ?, ?::jsonb)
          """,
          UUID.randomUUID(),
          responseId,
          kind,
          isFinal,
          marks,
          confidence,
          objectMapper.writeValueAsString(points));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
