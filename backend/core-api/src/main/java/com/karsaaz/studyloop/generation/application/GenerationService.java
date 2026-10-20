package com.karsaaz.studyloop.generation.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.db.SqlTime;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.content.application.QuestionEmbeddingService;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GenerationService {
  private static final Logger log = LoggerFactory.getLogger(GenerationService.class);

  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final QuestionEmbeddingService embeddings;

  public GenerationService(
      JdbcTemplate jdbc,
      Clock clock,
      GatewayClient gateway,
      GatewayAiSupport ai,
      QuestionEmbeddingService embeddings) {
    this.jdbc = jdbc;
    this.clock = clock;
    this.gateway = gateway;
    this.ai = ai;
    this.embeddings = embeddings;
  }

  public List<Map<String, Object>> coverage(long topicId) {
    return jdbc.query(
        """
        SELECT review_status, COUNT(*) AS cnt
        FROM question WHERE topic_id = ? GROUP BY review_status
        """,
        (rs, i) -> Rows.of("reviewStatus", rs.getString("review_status"), "count", rs.getLong("cnt")),
        topicId);
  }

  public Map<String, Object> coverageSummary(AccountPrincipal principal) {
    requireContent(principal);
    List<Map<String, Object>> approved =
        jdbc.query(
            """
            SELECT topic_id, COUNT(*) AS approved_count
            FROM question WHERE review_status = 'APPROVED'
            GROUP BY topic_id ORDER BY topic_id
            """,
            (rs, i) ->
                Map.of("topicId", rs.getLong("topic_id"), "approvedCount", rs.getLong("approved_count")));
    return Map.of("byTopic", approved);
  }

  @Transactional
  public Map<String, Object> plan(AccountPrincipal principal, Map<String, Object> body) {
    requireContentOrSys(principal);
    long pending =
        jdbc.queryForObject("SELECT COUNT(*) FROM question WHERE review_status = 'PENDING_QC'", Long.class);
    long approved =
        jdbc.queryForObject("SELECT COUNT(*) FROM question WHERE review_status = 'APPROVED'", Long.class);
    int target = Integer.parseInt(body.getOrDefault("targetNew", "5").toString());
    return Map.of(
        "pendingQc", pending,
        "approved", approved,
        "plannedBlueprints", target,
        "status", "PLANNED");
  }

  @Transactional
  public Map<String, Object> createRun(AccountPrincipal principal, Map<String, Object> body) {
    requireContentOrSys(principal);
    String kind = body.getOrDefault("kind", "MANUAL").toString();
    if (!List.of("NIGHTLY", "TOPUP", "MANUAL", "EVAL").contains(kind)) {
      kind = "MANUAL";
    }
    UUID runId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO generation_run (run_id, kind, triggered_by, stats_json) VALUES (?, ?, ?, '{}'::jsonb)",
        runId,
        kind,
        principal.accountId());

    Map<String, Object> ctx = loadGenerationContext(body);
    if (ctx == null) {
      finishRun(runId, Map.of("error", "no_topic_or_objective"));
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED, "No spec topic/objective available for generation");
    }

    String blueprintId = "BP-" + runId.toString().substring(0, 8);
    long topicId = ((Number) ctx.get("topicId")).longValue();
    long objectiveId = ((Number) ctx.get("objectiveId")).longValue();
    long specificationId = ((Number) ctx.get("specificationId")).longValue();
    String questionType = ctx.getOrDefault("questionType", "SHORT_ANSWER").toString();
    int marks = ai.asInt(ctx.get("marks"), 2);
    String commandWord = ctx.getOrDefault("commandWord", "State").toString();
    String targetBand = ctx.getOrDefault("targetGradeBand", "4-5").toString();
    String objectiveText = ai.asText(ctx.get("objectiveText"));
    String tier = ctx.getOrDefault("tier", "BOTH").toString();

    Map<String, Object> blueprintPayload = new LinkedHashMap<>();
    blueprintPayload.put("blueprint_id", blueprintId);
    blueprintPayload.put("objective_text", objectiveText);
    blueprintPayload.put("question_type", questionType);
    blueprintPayload.put("marks", marks);
    blueprintPayload.put("command_word", commandWord);
    blueprintPayload.put("target_grade_band", targetBand);
    blueprintPayload.put("tier", tier);
    blueprintPayload.put("misconceptions", List.of());
    blueprintPayload.put("is_numeric", "CALCULATION".equals(questionType));

    jdbc.update(
        """
        INSERT INTO blueprint (blueprint_id, run_id, spec_topic_id, objective_id, question_type, marks,
          command_word, target_grade_band, tier, is_numeric, blueprint_json, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, 'PLANNED')
        ON CONFLICT (blueprint_id) DO UPDATE SET status = 'PLANNED', run_id = EXCLUDED.run_id,
          blueprint_json = EXCLUDED.blueprint_json
        """,
        blueprintId,
        runId,
        topicId,
        objectiveId,
        questionType,
        (short) marks,
        commandWord,
        targetBand,
        tier,
        "CALCULATION".equals(questionType),
        ai.toJson(blueprintPayload));

    if ("CALCULATION".equals(questionType)) {
      // P-QG-03 returns a template whose numbers must come from the code solver (D-26), which is not
      // built yet. Publishing the raw template served placeholders and an empty mark scheme.
      jdbc.update("UPDATE blueprint SET status = 'FAILED' WHERE blueprint_id = ?", blueprintId);
      finishRun(runId, Map.of("error", "SOLVER_PENDING", "blueprintId", blueprintId));
      return Map.of(
          "runId", runId,
          "blueprintId", blueprintId,
          "status", "SOLVER_PENDING",
          "detail", "Calculation questions need the code solver (D-26), which is not built yet");
    }

    Map<String, Object> vars = new HashMap<>();
    vars.put("style_profile", ai.asText(ctx.get("styleProfile")));
    vars.put("exemplars", ai.asText(ctx.get("exemplars")));
    vars.put("blueprint", ai.toJson(blueprintPayload));
    vars.put("avoid_list", ai.asText(ctx.get("avoidList")));
    vars.put("diagram_library", "");

    Map<?, ?> gw = gateway.run("P-QG-02", vars, null);
    Map<String, Object> result = ai.requireResult(gw, "P-QG-02");
    if (GatewayAiSupport.cannotComplete(result)) {
      jdbc.update("UPDATE blueprint SET status = 'FAILED' WHERE blueprint_id = ?", blueprintId);
      finishRun(runId, Map.of("error", "cannot_complete", "reason", ai.asText(result.get("reason"))));
      return Map.of(
          "runId", runId,
          "blueprintId", blueprintId,
          "status", "FAILED",
          "detail", "AI generation cannot_complete: " + ai.asText(result.get("reason")));
    }

    String questionText = ai.asText(result.get("question_text"));
    if (questionText.isBlank()) {
      throw new IllegalStateException("P-QG-02 returned empty question_text");
    }
    String contextText = ai.asText(result.get("context_text"));
    if (!contextText.isBlank()) {
      questionText = contextText + "\n\n" + questionText;
    }
    String answerFormat = ai.asText(result.get("answer_format"));
    if (answerFormat.isBlank()) {
      answerFormat = "TEXT";
    }
    Object options = result.get("options");
    Map<String, Object> scheme =
        result.get("mark_scheme") instanceof Map<?, ?> m ? castMap(m) : Map.of();
    String schemeType = "LEVELS".equalsIgnoreCase(ai.asText(scheme.get("scheme_type"))) ? "LEVELS" : "POINTS";
    if ("MULTIPLE_CHOICE".equals(questionType)) {
      schemeType = "MCQ_KEY";
    }
    Object schemeBody = "POINTS".equals(schemeType) ? scheme.get("marking_points") : scheme;

    Long questionId =
        jdbc.query(
            """
            INSERT INTO question (
              specification_id, topic_id, source_type, tier, marks_available, question_type,
              command_word, question_text, options_json, answer_format, answer_spec_json, review_status, licence_status
            ) VALUES (?, ?, 'AI_GENERATED', ?, ?, ?, ?, ?, ?::jsonb, ?, ?::jsonb, 'PENDING_QC', 'OWN')
            RETURNING question_id
            """,
            rs -> rs.next() ? rs.getLong(1) : null,
            specificationId,
            topicId,
            mapTier(tier),
            (short) marks,
            questionType,
            commandWord,
            questionText,
            options instanceof List<?> ? ai.toJson(options) : null,
            answerFormat,
            mcqAnswerSpec(options));

    jdbc.update(
        """
        INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, model_answer, origin)
        VALUES (?, ?, ?, ?::jsonb, ?, 'GENERATED')
        """,
        questionId,
        schemeType,
        (short) marks,
        schemeBody == null ? "[]" : ai.toJson(schemeBody),
        ai.asText(result.get("model_answer")));

    jdbc.update(
        """
        INSERT INTO question_generation_log (question_id, blueprint_id, model_name, prompt_versions_json)
        VALUES (?, ?, ?, ?::jsonb)
        ON CONFLICT (question_id) DO UPDATE
          SET model_name = EXCLUDED.model_name,
              prompt_versions_json = EXCLUDED.prompt_versions_json
        """,
        questionId,
        blueprintId,
        GatewayAiSupport.model(gw),
        ai.toJson(Map.of("promptId", "P-QG-02", "promptVersion", ai.asText(gw.get("promptVersion")), "output", result)));

    jdbc.update(
        "UPDATE blueprint SET status = 'GENERATED', question_id = ? WHERE blueprint_id = ?",
        questionId,
        blueprintId);

    List<String> codeIssues = GenerationCodeChecks.check(result, questionType, commandWord, marks);
    jdbc.update(
        "INSERT INTO qc_check_result (question_id, check_id, passed, issues_json) VALUES (?, 'CODE', ?, ?::jsonb)",
        questionId,
        codeIssues.isEmpty(),
        ai.toJson(codeIssues));
    boolean qcPassed = codeIssues.isEmpty() && runGroundingQc(questionId, ctx, result);
    if (qcPassed) {
      jdbc.update(
          "UPDATE question SET review_status = 'APPROVED', reviewed_at = ?, updated_at = ? WHERE question_id = ?",
          SqlTime.ts(clock.instant()),
          SqlTime.ts(clock.instant()),
          questionId);
      jdbc.update("UPDATE blueprint SET status = 'PUBLISHED' WHERE blueprint_id = ?", blueprintId);
      embeddings.upsertForQuestion(questionId, "BANK");
    } else {
      // Visible in E-01 with its qc_check_result rows; never served to students.
      jdbc.update(
          "UPDATE question SET review_status = 'QC_FAILED', updated_at = ? WHERE question_id = ?",
          SqlTime.ts(clock.instant()),
          questionId);
    }

    Map<String, Object> stats = new HashMap<>();
    stats.put("blueprints", 1);
    stats.put("questionId", questionId);
    stats.put("qcPassed", qcPassed);
    stats.put("codeIssues", codeIssues);
    stats.put("promptId", "P-QG-02");
    finishRun(runId, stats);

    Map<String, Object> out = new HashMap<>();
    out.put("runId", runId);
    out.put("blueprintId", blueprintId);
    out.put("questionId", questionId);
    out.put("qcPassed", qcPassed);
    out.put("status", qcPassed ? "COMPLETED" : "QC_FAILED");
    return out;
  }

  public Map<String, Object> getRun(AccountPrincipal principal, UUID runId) {
    requireContent(principal);
    Map<String, Object> run =
        jdbc.query(
            """
            SELECT run_id, kind, started_at, finished_at, stats_json, triggered_by
            FROM generation_run WHERE run_id = ?
            """,
            rs -> {
              if (!rs.next()) {
                return null;
              }
              Map<String, Object> m = new HashMap<>();
              m.put("runId", rs.getObject("run_id"));
              m.put("kind", rs.getString("kind"));
              m.put("startedAt", rs.getTimestamp("started_at"));
              m.put("finishedAt", rs.getTimestamp("finished_at"));
              m.put("statsJson", rs.getString("stats_json"));
              m.put("triggeredBy", rs.getObject("triggered_by"));
              return m;
            },
            runId);
    if (run == null) {
      throw AppException.notFound("Generation run not found");
    }
    return run;
  }

  /**
   * Approves pending questions whose latest QC1 passed and that have no failed check. A question
   * that was never checked stays pending.
   */
  @Transactional
  public int promoteApprovedPending(int limit) {
    List<Long> ids =
        jdbc.query(
            """
            SELECT q.question_id FROM question q
            WHERE q.review_status = 'PENDING_QC'
              AND EXISTS (
                SELECT 1 FROM qc_check_result c
                WHERE c.question_id = q.question_id AND c.check_id = 'QC1_GROUNDING' AND c.passed = TRUE
              )
              AND NOT EXISTS (
                SELECT 1 FROM qc_check_result c WHERE c.question_id = q.question_id AND c.passed = FALSE
              )
            ORDER BY q.question_id LIMIT ?
            """,
            (rs, i) -> rs.getLong(1),
            limit);
    int n = 0;
    for (Long id : ids) {
      n +=
          jdbc.update(
              "UPDATE question SET review_status = 'APPROVED', reviewed_at = ?, updated_at = ? WHERE question_id = ?",
              SqlTime.ts(clock.instant()),
              SqlTime.ts(clock.instant()),
              id);
      embeddings.upsertForQuestion(id, "BANK");
    }
    return n;
  }

  /** QC1 (P-QG-04). A gateway failure records a failed check — it never approves. */
  private boolean runGroundingQc(long questionId, Map<String, Object> ctx, Map<String, Object> generated) {
    try {
      Map<?, ?> gw = gateway.run("P-QG-04", qcVariables(ctx, generated), null);
      Map<String, Object> result = ai.requireResult(gw, "P-QG-04");
      boolean passed = ai.qcPassed(result);
      jdbc.update(
          """
          INSERT INTO qc_check_result (question_id, check_id, prompt_version, passed, issues_json)
          VALUES (?, 'QC1_GROUNDING', ?, ?, ?::jsonb)
          """,
          questionId,
          "P-QG-04@" + ai.asText(gw.get("promptVersion")),
          passed,
          ai.toJson(result));
      return passed;
    } catch (Exception e) {
      log.warn("QC1 failed to run for question {}: {}", questionId, e.getClass().getSimpleName());
      jdbc.update(
          """
          INSERT INTO qc_check_result (question_id, check_id, passed, issues_json)
          VALUES (?, 'QC1_GROUNDING', FALSE, ?::jsonb)
          """,
          questionId,
          ai.toJson(Map.of("error", "QC1 could not run")));
      return false;
    }
  }

  /** P-QG-04 inputs: style profile, spec point, objective, exemplars used, and the item itself. */
  Map<String, Object> qcVariables(Map<String, Object> ctx, Map<String, Object> generated) {
    Map<String, Object> specPoint = new LinkedHashMap<>();
    specPoint.put("ref", ai.asText(ctx.get("topicNumber")));
    specPoint.put("title", ai.asText(ctx.get("topicName")));
    specPoint.put("statement", ai.asText(ctx.get("specStatement")));
    specPoint.put("tier_rule", Boolean.TRUE.equals(ctx.get("higherTierOnly")) ? "HIGHER_ONLY" : "BOTH");
    Map<String, Object> vars = new HashMap<>();
    vars.put("style_profile", ai.asText(ctx.get("styleProfile")));
    vars.put("spec_point", specPoint);
    vars.put("objective", Map.of("text", ai.asText(ctx.get("objectiveText")), "tier", ai.asText(ctx.get("tier"))));
    vars.put("exemplars_used", ai.asText(ctx.get("exemplars")));
    vars.put("item", generated);
    return vars;
  }

  /**
   * Picks the requested objective, or (nightly/top-up) the objective whose topic has the fewest
   * approved questions, preferring question types the pipeline can publish.
   */
  private Map<String, Object> loadGenerationContext(Map<String, Object> body) {
    Long topicId =
        body.get("topicId") != null ? Long.parseLong(body.get("topicId").toString()) : null;
    Long objectiveId =
        body.get("objectiveId") != null ? Long.parseLong(body.get("objectiveId").toString()) : null;

    Map<String, Object> row =
        jdbc.query(
            """
            SELECT t.topic_id, t.specification_id, t.topic_name, t.spec_statement, t.topic_number,
                   t.higher_tier_only, o.objective_id, o.objective_text, o.mark_min, o.mark_max,
                   COALESCE(
                     (SELECT x FROM unnest(o.allowed_question_types) x WHERE x <> 'CALCULATION' LIMIT 1),
                     o.allowed_question_types[1]) AS qtype,
                   o.allowed_command_words[1] AS cword,
                   COALESCE(bsp.question_wording_notes,'') || E'\\n' || COALESCE(bsp.mark_scheme_format_notes,'') AS style_notes,
                   (SELECT COUNT(*) FROM question qq WHERE qq.topic_id = t.topic_id AND qq.review_status = 'APPROVED') AS approved
            FROM spec_topic t
            JOIN spec_point_objective o ON o.spec_topic_id = t.topic_id
            LEFT JOIN board_style_profile bsp ON bsp.specification_id = t.specification_id
            WHERE (?::bigint IS NULL OR t.topic_id = ?)
              AND (?::bigint IS NULL OR o.objective_id = ?)
            ORDER BY approved ASC, t.topic_id, o.objective_id
            LIMIT 1
            """,
            rs -> {
              if (!rs.next()) {
                return null;
              }
              Map<String, Object> m = new HashMap<>();
              m.put("topicId", rs.getLong("topic_id"));
              m.put("specificationId", rs.getLong("specification_id"));
              m.put("topicName", rs.getString("topic_name"));
              m.put("topicNumber", rs.getString("topic_number"));
              m.put("specStatement", rs.getString("spec_statement"));
              m.put("higherTierOnly", rs.getBoolean("higher_tier_only"));
              m.put("objectiveId", rs.getLong("objective_id"));
              m.put("objectiveText", rs.getString("objective_text"));
              m.put(
                  "questionType",
                  rs.getString("qtype") != null ? rs.getString("qtype") : "SHORT_ANSWER");
              m.put("commandWord", rs.getString("cword") != null ? rs.getString("cword") : "State");
              short markMin = rs.getShort("mark_min");
              short markMax = rs.getShort("mark_max");
              // A single-correct MCQ is worth 1 mark on every board; asking for more made the model refuse.
              m.put(
                  "marks",
                  "MULTIPLE_CHOICE".equals(m.get("questionType"))
                      ? 1
                      : markMax > 0 ? markMax : Math.max(markMin, 2));
              m.put("styleProfile", rs.getString("style_notes"));
              m.put("tier", rs.getBoolean("higher_tier_only") ? "HIGHER" : "BOTH");
              m.put("targetGradeBand", body.getOrDefault("targetGradeBand", "4-5").toString());
              return m;
            },
            topicId,
            topicId,
            objectiveId,
            objectiveId);
    if (row == null) {
      return null;
    }
    long tid = ((Number) row.get("topicId")).longValue();
    List<String> avoid =
        jdbc.query(
            """
            SELECT left(question_text, 240) FROM question
            WHERE topic_id = ? AND review_status = 'APPROVED'
            ORDER BY question_id DESC LIMIT 10
            """,
            (rs, i) -> rs.getString(1),
            tid);
    row.put("avoidList", String.join("\n---\n", avoid));
    List<String> exemplars =
        jdbc.query(
            """
            SELECT left(question_text, 400) FROM question
            WHERE topic_id = ? AND review_status = 'APPROVED'
            ORDER BY question_id DESC LIMIT 3
            """,
            (rs, i) -> "<exemplar id=\"" + (i + 1) + "\">" + rs.getString(1) + "</exemplar>",
            tid);
    row.put("exemplars", String.join("\n", exemplars));
    return row;
  }

  private void finishRun(UUID runId, Map<String, Object> stats) {
    jdbc.update(
        "UPDATE generation_run SET finished_at = ?, stats_json = ?::jsonb WHERE run_id = ?",
        SqlTime.ts(clock.instant()),
        ai.toJson(stats),
        runId);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> castMap(Map<?, ?> m) {
    return (Map<String, Object>) m;
  }

  private static String mapTier(String tier) {
    if (tier == null) {
      return "HIGHER";
    }
    return switch (tier.toUpperCase()) {
      case "FOUNDATION" -> "FOUNDATION";
      case "HIGHER", "HIGHER_ONLY" -> "HIGHER";
      default -> "HIGHER";
    };
  }

  private void requireContent(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content access required");
    }
  }

  private void requireContentOrSys(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles()) && !principal.roles().contains("SYS")) {
      throw AppException.forbidden("Content or system access required");
    }
  }

  /** {"correctKey": "C"} for an MCQ, matching hand-authored items; null when there is no single correct option. */
  private String mcqAnswerSpec(Object options) {
    if (!(options instanceof List<?> list)) {
      return null;
    }
    String key = null;
    for (Object o : list) {
      if (o instanceof Map<?, ?> m && Boolean.TRUE.equals(m.get("correct"))) {
        if (key != null) {
          return null;
        }
        key = String.valueOf(m.get("key"));
      }
    }
    return key == null ? null : ai.toJson(Map.of("correctKey", key));
  }
}
