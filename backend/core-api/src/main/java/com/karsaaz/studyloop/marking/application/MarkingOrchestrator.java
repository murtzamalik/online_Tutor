package com.karsaaz.studyloop.marking.application;

import com.karsaaz.studyloop.common.db.SqlTime;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.mastery.application.MasteryService;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Marking pipeline: objective markers in code; GCSE/iGCSE written answers via independent Pass A /
 * Pass B (exception-based, D-17); A-Level via one provisional P-MK-04 run into the reviewer queue.
 * Totals are always computed by {@link AiMarkParser}, never taken from the model (D-26).
 */
@Service
public class MarkingOrchestrator {
  private static final Logger log = LoggerFactory.getLogger(MarkingOrchestrator.class);

  private final JdbcTemplate jdbc;
  private final McqMarker mcqMarker;
  private final NumericMarker numericMarker;
  private final GatewayClient gatewayClient;
  private final GatewayAiSupport ai;
  private final MasteryService masteryService;
  private final ObjectMapper objectMapper;
  private final Clock clock;
  private final boolean allowLocalStub;

  public MarkingOrchestrator(
      JdbcTemplate jdbc,
      McqMarker mcqMarker,
      NumericMarker numericMarker,
      GatewayClient gatewayClient,
      GatewayAiSupport ai,
      MasteryService masteryService,
      ObjectMapper objectMapper,
      Clock clock,
      @Value("${studyloop.marking.allow-local-stub:false}") boolean allowLocalStub) {
    this.jdbc = jdbc;
    this.mcqMarker = mcqMarker;
    this.numericMarker = numericMarker;
    this.gatewayClient = gatewayClient;
    this.ai = ai;
    this.masteryService = masteryService;
    this.objectMapper = objectMapper;
    this.clock = clock;
    this.allowLocalStub = allowLocalStub;
  }

  @Transactional
  public void mark(UUID responseId) {
    Map<String, Object> row = jdbc.query(
        """
        SELECT sr.student_id, sr.question_id, sr.answer_text, sr.answer_structured_json::text AS structured,
               sr.marks_available, sr.qualification_code, q.question_type, q.options_json::text AS options,
               q.answer_spec_json::text AS answer_spec, q.topic_id, q.specification_id
        FROM student_response sr
        JOIN question q ON q.question_id = sr.question_id
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
          m.put("qualificationCode", rs.getString("qualification_code"));
          m.put("questionType", rs.getString("question_type"));
          m.put("options", rs.getString("options"));
          m.put("answerSpec", rs.getString("answer_spec"));
          m.put("topicId", rs.getLong("topic_id"));
          m.put("specificationId", rs.getObject("specification_id"));
          return m;
        },
        responseId);
    if (row == null) {
      return;
    }
    UUID studentId = (UUID) row.get("studentId");
    short marksAvailable = (Short) row.get("marksAvailable");
    String structured = (String) row.get("structured");
    long topicId = (Long) row.get("topicId");

    McqMarker.ObjectiveResult mcq = mcqMarker.mark((String) row.get("options"), structured, marksAvailable);
    if (mcq.applicable()) {
      finalizeObjective(responseId, studentId, topicId, mcq.marksAwarded(), mcq.confidence(), mcq.points(), marksAvailable);
      return;
    }
    NumericMarker.ObjectiveResult num = numericMarker.mark((String) row.get("answerSpec"), structured, marksAvailable);
    if (num.applicable()) {
      finalizeObjective(responseId, studentId, topicId, num.marksAwarded(), num.confidence(), num.points(), marksAvailable);
      return;
    }

    boolean aLevelOn = Boolean.TRUE.equals(jdbc.query(
        "SELECT enabled FROM feature_flag WHERE flag_key = 'a_level_review'",
        rs -> rs.next() ? rs.getBoolean(1) : false));
    // A-Level never goes through the GCSE dual pass: one provisional run, then a human reviewer (F-09).
    if (ALevelProvisionalRouter.shouldQueueForReview(aLevelOn, (String) row.get("qualificationCode"))) {
      markALevel(responseId, row, marksAvailable);
      return;
    }

    AiMarkParser.Parsed passA = runPointsMarker("P-MK-01", row, marksAvailable);
    AiMarkParser.Parsed passB = runPointsMarker("P-MK-02", row, marksAvailable);
    if (passA == null || passB == null || passA.cannotComplete() || passB.cannotComplete()) {
      openException(responseId, "SCHEMA_FAILURE", passA, passB);
      return;
    }
    if (!passA.flags().isEmpty() || !passB.flags().isEmpty()) {
      openException(responseId, "MODEL_FLAG", passA, passB);
      return;
    }
    PassCompare.Decision decision = PassCompare.compare(
        passA.marks(), passA.confidence(), passB.marks(), passB.confidence(), BigDecimal.valueOf(marksAvailable));
    if (decision.outcome() != PassCompare.Outcome.AGREE) {
      openException(
          responseId,
          decision.outcome() == PassCompare.Outcome.LOW_CONFIDENCE ? "LOW_CONFIDENCE" : "PASS_DISAGREEMENT",
          passA,
          passB);
      return;
    }

    insertMarkingResult(responseId, "AI_PASS_A", passA.marks(), passA.confidence(), passA.points(), false);
    insertMarkingResult(responseId, "AI_PASS_B", passB.marks(), passB.confidence(), passB.points(), true);
    boolean correct = decision.finalMarks().compareTo(BigDecimal.valueOf(marksAvailable)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = 'AI_FINAL',
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        decision.finalMarks(),
        correct,
        SqlTime.ts(clock.instant()),
        responseId);
    masteryService.updateFromResponse(studentId, topicId, correct);
  }

  private void markALevel(UUID responseId, Map<String, Object> row, short marksAvailable) {
    AiMarkParser.Parsed aLevel = null;
    try {
      Map<String, Object> vars = baseVars(row);
      vars.put("spec_context", specContext(row.get("specificationId")));
      Map<String, Object> result = ai.requireResult(gatewayClient.run("P-MK-04", vars, null), "P-MK-04");
      aLevel = AiMarkParser.aLevel(result, marksAvailable);
    } catch (Exception e) {
      aLevel = stubOrNull("P-MK-04", row, e);
    }
    if (aLevel == null || aLevel.cannotComplete()) {
      openException(responseId, "SCHEMA_FAILURE", aLevel, null);
      return;
    }
    insertMarkingResult(responseId, "AI_A_LEVEL", aLevel.marks(), aLevel.confidence(), aLevel.points(), false);
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = NULL, marking_mode = 'AI_PROVISIONAL',
               marking_status = 'MARKED_PROVISIONAL', marked_at = ?, counts_toward_progress = FALSE
        WHERE response_id = ?
        """,
        aLevel.marks(),
        SqlTime.ts(clock.instant()),
        responseId);
    Object specId = row.get("specificationId");
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
          ((Number) specId).longValue(),
          aLevel.marks(),
          SqlTime.ts(clock.instant().plusSeconds(ALevelProvisionalRouter.defaultSlaHours() * 3600L)));
    }
  }

  /** Records both passes (where present) and parks the answer for a human (US-115). */
  private void openException(UUID responseId, String trigger, AiMarkParser.Parsed a, AiMarkParser.Parsed b) {
    if (a != null && !a.cannotComplete()) {
      insertMarkingResult(responseId, "AI_PASS_A", a.marks(), a.confidence(), withFlags(a), false);
    }
    if (b != null && !b.cannotComplete()) {
      insertMarkingResult(responseId, "AI_PASS_B", b.marks(), b.confidence(), withFlags(b), false);
    }
    BigDecimal provisional = a != null && !a.cannotComplete() ? a.marks() : null;
    jdbc.update(
        """
        INSERT INTO marking_exception (exception_id, response_id, trigger, status, original_marks, sla_due_at)
        VALUES (?, ?, ?, 'OPEN', ?, ?)
        """,
        UUID.randomUUID(),
        responseId,
        trigger,
        provisional,
        SqlTime.ts(clock.instant().plusSeconds(48 * 3600)));
    jdbc.update(
        """
        UPDATE student_response SET marking_status = 'IN_EXCEPTION', marks_awarded = ?,
               is_correct = NULL, marking_mode = 'AI_PROVISIONAL', marked_at = ?
        WHERE response_id = ?
        """,
        provisional,
        SqlTime.ts(clock.instant()),
        responseId);
  }

  private static List<Map<String, Object>> withFlags(AiMarkParser.Parsed p) {
    if (p.flags().isEmpty()) {
      return p.points();
    }
    List<Map<String, Object>> out = new java.util.ArrayList<>(p.points());
    out.add(Map.of("id", "FLAGS", "flags", p.flags()));
    return out;
  }

  private void finalizeObjective(
      UUID responseId,
      UUID studentId,
      long topicId,
      BigDecimal marksAwarded,
      double confidence,
      List<Map<String, Object>> points,
      short marksAvailable) {
    insertMarkingResult(responseId, "OBJECTIVE", marksAwarded, confidence, points, true);
    boolean correct = marksAwarded.compareTo(BigDecimal.valueOf(marksAvailable)) >= 0;
    jdbc.update(
        """
        UPDATE student_response SET marks_awarded = ?, is_correct = ?, marking_mode = 'AUTO_OBJECTIVE',
               marking_status = 'MARKED_FINAL', marked_at = ?, counts_toward_progress = TRUE
        WHERE response_id = ?
        """,
        marksAwarded,
        correct,
        SqlTime.ts(clock.instant()),
        responseId);
    masteryService.updateFromResponse(studentId, topicId, correct);
  }

  /** Returns null when the AI call failed (→ SCHEMA_FAILURE exception), never a made-up mark. */
  private AiMarkParser.Parsed runPointsMarker(String promptId, Map<String, Object> row, short marksAvailable) {
    try {
      Map<String, Object> result = ai.requireResult(gatewayClient.run(promptId, baseVars(row), null), promptId);
      return AiMarkParser.points(result, marksAvailable, (String) row.get("answerText"));
    } catch (Exception e) {
      return stubOrNull(promptId, row, e);
    }
  }

  private AiMarkParser.Parsed stubOrNull(String promptId, Map<String, Object> row, Exception e) {
    log.warn("{} failed for question {}: {}", promptId, row.get("questionId"), e.getClass().getSimpleName());
    if (!allowLocalStub) {
      return null;
    }
    // Dev-only: half marks with confidence below the floor, so stubbed answers always need review.
    short marksAvailable = (Short) row.get("marksAvailable");
    BigDecimal half = BigDecimal.valueOf(marksAvailable / 2);
    return new AiMarkParser.Parsed(
        half,
        0.5,
        List.of(Map.of("id", "STUB", "awarded", half, "max", marksAvailable, "evidence", "local_stub")),
        List.of(),
        false);
  }

  private Map<String, Object> baseVars(Map<String, Object> row) {
    long questionId = ((Number) row.get("questionId")).longValue();
    String questionText = jdbc.query(
        "SELECT question_text FROM question WHERE question_id = ?",
        rs -> rs.next() ? rs.getString(1) : "",
        questionId);
    String markScheme = jdbc.query(
        """
        SELECT COALESCE(marking_points_json::text, model_answer, '')
        FROM mark_scheme WHERE question_id = ? LIMIT 1
        """,
        rs -> rs.next() ? rs.getString(1) : "",
        questionId);
    Map<String, Object> vars = new HashMap<>();
    vars.put("student_answer", GatewayAiSupport.redactPii((String) row.get("answerText")));
    vars.put("question_for_student", questionText == null ? "" : questionText);
    vars.put("mark_scheme", markScheme == null ? "" : markScheme);
    // Code-computed values (D-26): the stored answer spec is the only numeric truth we have today.
    String answerSpec = (String) row.get("answerSpec");
    vars.put("calc_facts", answerSpec == null ? "" : answerSpec);
    // Not referenced by the templates; lets the stub gateway size its full-marks fixture.
    vars.put("marksAvailable", row.get("marksAvailable"));
    return vars;
  }

  private String specContext(Object specificationId) {
    if (specificationId == null) {
      return "";
    }
    return jdbc.query(
        """
        SELECT b.code || ' ' || q.code || ' ' || s.spec_code || ' — ' || s.title
        FROM specification s
        JOIN exam_board b ON b.board_id = s.board_id
        JOIN qualification q ON q.qualification_id = s.qualification_id
        WHERE s.specification_id = ?
        """,
        rs -> rs.next() ? rs.getString(1) : "",
        ((Number) specificationId).longValue());
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
