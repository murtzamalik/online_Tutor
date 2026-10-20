package com.karsaaz.studyloop.aiops.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.marking.application.AiMarkParser;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiOpsService {
  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final ObjectMapper objectMapper;

  public AiOpsService(
      JdbcTemplate jdbc, Clock clock, GatewayClient gateway, GatewayAiSupport ai, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.clock = clock;
    this.gateway = gateway;
    this.ai = ai;
    this.objectMapper = objectMapper;
  }

  public Map<String, Object> evalSummary(AccountPrincipal principal) {
    requireAiOrOwner(principal);
    long goldCount = jdbc.queryForObject("SELECT COUNT(*) FROM gold_set_item", Long.class);
    var latest = jdbc.query(
        """
        SELECT eval_id, point_accuracy, exact_total_agreement, n_items, finished_at
        FROM eval_run ORDER BY started_at DESC LIMIT 1
        """,
        rs -> rs.next()
            ? Map.of(
                "evalId", rs.getObject("eval_id"),
                "pointAccuracy", rs.getBigDecimal("point_accuracy"),
                "exactTotalAgreement", rs.getBigDecimal("exact_total_agreement"),
                "nItems", rs.getInt("n_items"),
                "finishedAt", rs.getTimestamp("finished_at"))
            : Map.of());
    Map<String, Object> out = new HashMap<>();
    out.put("goldSetSize", goldCount);
    out.put("targetGoldSize", 2000);
    out.put("latestRun", latest);
    return out;
  }

  public List<Map<String, Object>> listEvalRuns(AccountPrincipal principal) {
    requireAiOrOwner(principal);
    return jdbc.query(
        """
        SELECT eval_id, task_key, model_id, n_items, point_accuracy, exact_total_agreement,
               passes_gate, started_at, finished_at
        FROM eval_run ORDER BY started_at DESC LIMIT 50
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("evalId", rs.getObject("eval_id"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("modelId", rs.getString("model_id"));
          m.put("nItems", rs.getInt("n_items"));
          m.put("pointAccuracy", rs.getBigDecimal("point_accuracy"));
          m.put("exactTotalAgreement", rs.getBigDecimal("exact_total_agreement"));
          m.put("passesGate", rs.getObject("passes_gate"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("finishedAt", rs.getTimestamp("finished_at"));
          return m;
        });
  }

  public Map<String, Object> evalDetail(AccountPrincipal principal, UUID evalId) {
    requireAiOrOwner(principal);
    Map<String, Object> run = jdbc.query(
        """
        SELECT eval_id, task_key, model_id, n_items, point_accuracy, exact_total_agreement,
               passes_gate, started_at, finished_at
        FROM eval_run WHERE eval_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("evalId", rs.getObject("eval_id"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("modelId", rs.getString("model_id"));
          m.put("nItems", rs.getInt("n_items"));
          m.put("pointAccuracy", rs.getBigDecimal("point_accuracy"));
          m.put("exactTotalAgreement", rs.getBigDecimal("exact_total_agreement"));
          m.put("passesGate", rs.getObject("passes_gate"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("finishedAt", rs.getTimestamp("finished_at"));
          return m;
        },
        evalId);
    if (run == null) {
      throw AppException.notFound("Eval run not found");
    }
    return run;
  }

  /**
   * Q-01 eval: runs P-MK-01 through the gateway on gold items and compares with the examiner per
   * point. The previous version wrote ai_total = examiner_total, so every run "passed" at 100%.
   */
  @Transactional
  public Map<String, Object> createEvalRun(AccountPrincipal principal, Map<String, Object> body) {
    requireAiEngineer(principal);
    UUID promptVersionId = jdbc.query(
        """
        SELECT prompt_version_id FROM prompt_version WHERE prompt_id = 'P-MK-01'
        ORDER BY (status = 'LIVE') DESC, created_at DESC LIMIT 1
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null);
    if (promptVersionId == null) {
      throw AppException.conflict("PROMPT_VERSION_MISSING", "No prompt_version row for P-MK-01; load prompts first");
    }
    int limit = Math.max(1, Math.min(200, ai.asInt(body.get("limit"), 50)));
    List<Map<String, Object>> gold = jdbc.query(
        """
        SELECT g.gold_id, g.answer_text, g.examiner_points_json::text AS examiner_points, g.examiner_total,
               q.question_text, q.marks_available,
               COALESCE(ms.marking_points_json::text, ms.model_answer, '') AS scheme
        FROM gold_set_item g
        JOIN question q ON q.question_id = g.question_id
        LEFT JOIN mark_scheme ms ON ms.question_id = g.question_id
        WHERE g.question_type NOT IN ('MULTIPLE_CHOICE', 'CALCULATION')
        ORDER BY g.created_at LIMIT ?
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("goldId", rs.getObject("gold_id"));
          m.put("answer", rs.getString("answer_text"));
          m.put("examinerPoints", rs.getString("examiner_points"));
          m.put("examinerTotal", rs.getBigDecimal("examiner_total"));
          m.put("question", rs.getString("question_text"));
          m.put("marks", rs.getInt("marks_available"));
          m.put("scheme", rs.getString("scheme"));
          return m;
        },
        limit);
    if (gold.isEmpty()) {
      throw AppException.notFound("Gold set has no written-answer items");
    }
    UUID evalId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO eval_run (eval_id, prompt_version_id, task_key, model_id, dataset, n_items, triggered_by, started_at)
        VALUES (?, ?, 'mk.pass_a', 'pending', 'gold_set', ?, ?, ?)
        """,
        evalId,
        promptVersionId,
        gold.size(),
        principal.accountId(),
        SqlTime.ts(clock.instant()));
    int agreed = 0;
    int pointsTotal = 0;
    int exact = 0;
    int over = 0;
    int under = 0;
    int failed = 0;
    String model = "unknown";
    String promptVersion = null;
    for (Map<String, Object> g : gold) {
      Map<String, Object> vars = new HashMap<>();
      vars.put("question_for_student", String.valueOf(g.get("question")));
      vars.put("mark_scheme", String.valueOf(g.get("scheme")));
      vars.put("calc_facts", "");
      vars.put("student_answer", String.valueOf(g.get("answer")));
      Map<String, Object> result;
      try {
        Map<?, ?> gw = gateway.run("P-MK-01", vars, null);
        model = GatewayAiSupport.model(gw);
        promptVersion = ai.asText(gw.get("promptVersion"));
        result = ai.requireResult(gw, "P-MK-01");
      } catch (Exception e) {
        failed++;
        continue;
      }
      var parsed = AiMarkParser.points(result, (Integer) g.get("marks"), String.valueOf(g.get("answer")));
      List<Map<String, Object>> examinerPoints = parseList(String.valueOf(g.get("examinerPoints")));
      var score = EvalScoring.score(parsed.points(), parsed.marks(), examinerPoints, (BigDecimal) g.get("examinerTotal"));
      agreed += score.pointsAgreed();
      pointsTotal += score.pointsTotal();
      exact += score.exactTotal() ? 1 : 0;
      over += score.overMarked() ? 1 : 0;
      under += score.underMarked() ? 1 : 0;
      jdbc.update(
          """
          INSERT INTO eval_result (eval_id, gold_id, ai_points_json, ai_total, points_agreed, points_total, exact_total, over_marked)
          VALUES (?, ?, ?::jsonb, ?, ?, ?, ?, ?)
          """,
          evalId,
          g.get("goldId"),
          ai.toJson(parsed.points()),
          parsed.marks(),
          (short) score.pointsAgreed(),
          (short) score.pointsTotal(),
          score.exactTotal(),
          score.overMarked());
    }
    int scored = gold.size() - failed;
    BigDecimal pointAccuracy = ratio(agreed, pointsTotal);
    BigDecimal exactRate = ratio(exact, scored);
    jdbc.update(
        """
        UPDATE eval_run SET model_id = ?, n_items = ?, point_accuracy = ?, exact_total_agreement = ?,
               over_marking_rate = ?, under_marking_rate = ?, metrics_json = ?::jsonb,
               finished_at = ?, passes_gate = ?
        WHERE eval_id = ?
        """,
        model,
        scored,
        pointAccuracy,
        exactRate,
        ratio(over, scored),
        ratio(under, scored),
        ai.toJson(Map.of("failedItems", failed, "gatewayPromptVersion", promptVersion == null ? "" : promptVersion)),
        SqlTime.ts(clock.instant()),
        // Gate (D-19): point accuracy >= 0.95 with every item scored. "Beats live" needs a baseline run.
        failed == 0 && scored > 0 && pointAccuracy.compareTo(new BigDecimal("0.95")) >= 0,
        evalId);
    Map<String, Object> out = new HashMap<>();
    out.put("evalId", evalId);
    out.put("nItems", scored);
    out.put("failedItems", failed);
    out.put("pointAccuracy", pointAccuracy);
    out.put("exactTotalAgreement", exactRate);
    out.put("model", model);
    return out;
  }

  private static BigDecimal ratio(int num, int den) {
    return den == 0
        ? BigDecimal.ZERO
        : BigDecimal.valueOf(num).divide(BigDecimal.valueOf(den), 5, java.math.RoundingMode.HALF_UP);
  }

  private List<Map<String, Object>> parseList(String json) {
    try {
      Object v = objectMapper.readValue(json, Object.class);
      return ai.asMapList(v);
    } catch (Exception e) {
      return List.of();
    }
  }

  public List<Map<String, Object>> listGold(AccountPrincipal principal) {
    requireAiOrOwner(principal);
    return jdbc.query(
        """
        SELECT gold_id, question_id, specification_id, question_type, examiner_total, origin, is_holdout, verified
        FROM gold_set_item ORDER BY created_at DESC LIMIT 500
        """,
        (rs, i) -> Rows.of(
            "goldId", rs.getObject("gold_id"),
            "questionId", rs.getLong("question_id"),
            "specificationId", rs.getLong("specification_id"),
            "questionType", rs.getString("question_type"),
            "examinerTotal", rs.getBigDecimal("examiner_total"),
            "origin", rs.getString("origin"),
            "isHoldout", rs.getBoolean("is_holdout"),
            "verified", rs.getBoolean("verified")));
  }

  public List<Map<String, Object>> gatewayLog(AccountPrincipal principal) {
    requireComplianceOrAi(principal);
    return jdbc.query(
        """
        SELECT log_id, task_key, prompt_id, prompt_version, vendor, model, route,
               latency_ms, status, boundary_ok, redaction_count, created_at
        FROM ai_gateway_log ORDER BY created_at DESC LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("logId", rs.getObject("log_id"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("promptId", rs.getString("prompt_id"));
          m.put("promptVersion", rs.getString("prompt_version"));
          m.put("vendor", rs.getString("vendor"));
          m.put("model", rs.getString("model"));
          m.put("route", rs.getString("route"));
          m.put("latencyMs", rs.getObject("latency_ms"));
          m.put("status", rs.getString("status"));
          m.put("boundaryOk", rs.getBoolean("boundary_ok"));
          m.put("redactionCount", rs.getShort("redaction_count"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
  }

  public Map<String, Object> gatewayLogDetail(AccountPrincipal principal, UUID logId) {
    requireCompliance(principal);
    Map<String, Object> row = jdbc.query(
        """
        SELECT log_id, task_key, prompt_id, prompt_version, vendor, model, route,
               latency_ms, status, boundary_ok, redaction_count, payload_hash, created_at
        FROM ai_gateway_log WHERE log_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("logId", rs.getObject("log_id"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("status", rs.getString("status"));
          m.put("boundaryOk", rs.getBoolean("boundary_ok"));
          m.put("payloadHash", rs.getString("payload_hash"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        },
        logId);
    if (row == null) {
      throw AppException.notFound("Gateway log not found");
    }
    return row;
  }

  public List<Map<String, Object>> redactions(AccountPrincipal principal) {
    requireCompliance(principal);
    return jdbc.query(
        """
        SELECT redaction_id, log_id, kind, method, placeholder, created_at
        FROM redaction_event ORDER BY created_at DESC LIMIT 100
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("redactionId", rs.getObject("redaction_id"));
          m.put("logId", rs.getObject("log_id"));
          m.put("kind", rs.getString("kind"));
          m.put("method", rs.getString("method"));
          m.put("placeholder", rs.getString("placeholder"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
  }

  public List<Map<String, Object>> boundaryAttestations(AccountPrincipal principal) {
    requireCompliance(principal);
    return jdbc.query(
        """
        SELECT attestation_id, day, checks_json, passed, created_at
        FROM boundary_attestation ORDER BY day DESC LIMIT 30
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("attestationId", rs.getObject("attestation_id"));
          m.put("day", rs.getDate("day"));
          m.put("checksJson", rs.getString("checks_json"));
          m.put("passed", rs.getBoolean("passed"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
  }

  public List<Map<String, Object>> listPrompts(AccountPrincipal principal) {
    requireAiEngineer(principal);
    return jdbc.query(
        """
        SELECT DISTINCT ON (prompt_id) prompt_id, prompt_version_id, version, task_key, status, created_at
        FROM prompt_version ORDER BY prompt_id, created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("promptId", rs.getString("prompt_id"));
          m.put("promptVersionId", rs.getObject("prompt_version_id"));
          m.put("version", rs.getString("version"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("status", rs.getString("status"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          return m;
        });
  }

  public List<Map<String, Object>> promptVersions(AccountPrincipal principal, String promptId) {
    requireAiEngineer(principal);
    return jdbc.query(
        """
        SELECT prompt_version_id, prompt_id, version, task_key, status, model_tier, created_at, promoted_at
        FROM prompt_version WHERE prompt_id = ? ORDER BY created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("promptVersionId", rs.getObject("prompt_version_id"));
          m.put("promptId", rs.getString("prompt_id"));
          m.put("version", rs.getString("version"));
          m.put("taskKey", rs.getString("task_key"));
          m.put("status", rs.getString("status"));
          m.put("modelTier", rs.getString("model_tier"));
          m.put("createdAt", rs.getTimestamp("created_at"));
          m.put("promotedAt", rs.getTimestamp("promoted_at"));
          return m;
        },
        promptId);
  }

  @Transactional
  public Map<String, Object> createPromptVersion(
      AccountPrincipal principal, String promptId, Map<String, Object> body) {
    requireAiEngineer(principal);
    UUID id = UUID.randomUUID();
    String version = body.getOrDefault("version", "w1-" + id.toString().substring(0, 8)).toString();
    String taskKey = body.getOrDefault("taskKey", "mark.gcse.pass_a").toString();
    String bodyText = body.getOrDefault("bodyText", "W1 draft prompt").toString();
    jdbc.update(
        """
        INSERT INTO prompt_version (
          prompt_version_id, prompt_id, version, task_key, body_text, model_tier,
          source_path, sha256, status, created_by
        ) VALUES (?, ?, ?, ?, ?, 'large', 'w1-console', ?, 'DRAFT', ?)
        """,
        id,
        promptId,
        version,
        taskKey,
        bodyText,
        Integer.toHexString(bodyText.hashCode()),
        principal.accountId());
    return Map.of("promptVersionId", id, "promptId", promptId, "version", version, "status", "DRAFT");
  }

  @Transactional
  public Map<String, Object> evaluatePromptVersion(AccountPrincipal principal, UUID versionId) {
    requireAiEngineer(principal);
    jdbc.update(
        "UPDATE prompt_version SET status = 'EVALUATING' WHERE prompt_version_id = ? AND status = 'DRAFT'",
        versionId);
    jdbc.update(
        "UPDATE prompt_version SET status = 'DRAFT', metrics_json = '{\"w1Stub\":true}'::jsonb WHERE prompt_version_id = ?",
        versionId);
    return Map.of("promptVersionId", versionId, "status", "EVALUATED_STUB");
  }

  @Transactional
  public Map<String, Object> promotePromptVersion(AccountPrincipal principal, UUID versionId) {
    requireAiEngineer(principal);
    String promptId = jdbc.query(
        "SELECT prompt_id FROM prompt_version WHERE prompt_version_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        versionId);
    if (promptId == null) {
      throw AppException.notFound("Prompt version not found");
    }
    jdbc.update(
        "UPDATE prompt_version SET status = 'RETIRED' WHERE prompt_id = ? AND status = 'LIVE'",
        promptId);
    jdbc.update(
        """
        UPDATE prompt_version SET status = 'LIVE', promoted_by = ?, promoted_at = ?
        WHERE prompt_version_id = ?
        """,
        principal.accountId(),
        SqlTime.ts(clock.instant()),
        versionId);
    return Map.of("promptVersionId", versionId, "status", "LIVE");
  }

  @Transactional
  public Map<String, Object> rollbackPromptVersion(AccountPrincipal principal, UUID versionId) {
    requireAiEngineer(principal);
    jdbc.update(
        "UPDATE prompt_version SET status = 'RETIRED' WHERE prompt_version_id = ? AND status = 'LIVE'",
        versionId);
    return Map.of("promptVersionId", versionId, "status", "RETIRED");
  }

  public List<Map<String, Object>> modelRouting(AccountPrincipal principal) {
    requireAiEngineer(principal);
    return jdbc.query(
        """
        SELECT task_key, model_tier, vendor, model_id, fallback_model_id, updated_at
        FROM model_routing ORDER BY task_key
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("taskKey", rs.getString("task_key"));
          m.put("modelTier", rs.getString("model_tier"));
          m.put("vendor", rs.getString("vendor"));
          m.put("modelId", rs.getString("model_id"));
          m.put("fallbackModelId", rs.getString("fallback_model_id"));
          m.put("updatedAt", rs.getTimestamp("updated_at"));
          return m;
        });
  }

  @Transactional
  public Map<String, Object> putModelRouting(
      AccountPrincipal principal, String taskKey, Map<String, Object> body) {
    requireAiEngineer(principal);
    if (body.get("modelId") == null) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "modelId required");
    }
    jdbc.update(
        """
        INSERT INTO model_routing (task_key, model_tier, vendor, model_id, updated_by, updated_at)
        VALUES (?, COALESCE(?, 'large'), COALESCE(?, 'ANTHROPIC'), ?, ?, now())
        ON CONFLICT (task_key) DO UPDATE SET
          model_id = EXCLUDED.model_id,
          model_tier = COALESCE(EXCLUDED.model_tier, model_routing.model_tier),
          vendor = COALESCE(EXCLUDED.vendor, model_routing.vendor),
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        """,
        taskKey,
        body.get("modelTier") != null ? body.get("modelTier").toString() : null,
        body.get("vendor") != null ? body.get("vendor").toString() : null,
        body.get("modelId").toString(),
        principal.accountId());
    return Map.of("taskKey", taskKey, "modelId", body.get("modelId").toString());
  }

  private void requireAiEngineer(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasAiEngineerRole(principal.roles())) {
      throw AppException.forbidden("AI engineer access required");
    }
  }

  private void requireAiOrOwner(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasAiEngineerRole(principal.roles())
        && !StudentAccessHelper.hasOwnerRole(principal.roles())) {
      throw AppException.forbidden("Forbidden");
    }
  }

  private void requireCompliance(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasComplianceRole(principal.roles())) {
      throw AppException.forbidden("Compliance access required");
    }
  }

  private void requireComplianceOrAi(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasComplianceRole(principal.roles())
        && !StudentAccessHelper.hasAiEngineerRole(principal.roles())) {
      throw AppException.forbidden("Forbidden");
    }
  }

  public Map<String, Object> aiCost(AccountPrincipal principal) {
    requireOwner(principal);
    List<Map<String, Object>> usage = jdbc.query(
        """
        SELECT day, task_key, vendor, model, calls, tokens_in, tokens_out, cost_pence
        FROM ai_usage_cost ORDER BY day DESC LIMIT 90
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("day", rs.getDate(1).toString());
          m.put("taskKey", rs.getString(2));
          m.put("vendor", rs.getString(3));
          m.put("model", rs.getString(4));
          m.put("calls", rs.getInt(5));
          m.put("tokensIn", rs.getLong(6));
          m.put("tokensOut", rs.getLong(7));
          m.put("costPence", rs.getLong(8));
          return m;
        });
    List<Map<String, Object>> budgets = jdbc.query(
        "SELECT budget_id, period, task_key, metric, budget_value, alert_at_pct FROM ai_budget ORDER BY period DESC",
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("budgetId", rs.getLong(1));
          m.put("period", rs.getString(2));
          m.put("taskKey", rs.getString(3));
          m.put("metric", rs.getString(4));
          m.put("budgetValue", rs.getBigDecimal(5));
          m.put("alertAtPct", rs.getShort(6));
          return m;
        });
    long total = usage.stream().mapToLong(u -> ((Number) u.get("costPence")).longValue()).sum();
    return Map.of("usage", usage, "budgets", budgets, "totalCostPence", total);
  }

  @Transactional
  public Map<String, Object> putBudget(AccountPrincipal principal, Map<String, Object> body) {
    requireOwner(principal);
    jdbc.update(
        """
        INSERT INTO ai_budget (period, task_key, metric, budget_value, alert_at_pct, set_by)
        VALUES (?,?,?,?,?,?)
        """,
        body.getOrDefault("period", "2026-09").toString(),
        body.get("taskKey") == null ? null : body.get("taskKey").toString(),
        body.getOrDefault("metric", "TOTAL_PENCE").toString(),
        new BigDecimal(body.getOrDefault("budgetValue", "100000").toString()),
        body.get("alertAtPct") == null ? 80 : ((Number) body.get("alertAtPct")).intValue(),
        principal.accountId());
    return aiCost(principal);
  }

  private void requireOwner(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasOwnerRole(principal.roles())
        && !principal.roles().contains("OWN")
        && !principal.roles().contains("PRODUCT_OWNER")
        && !principal.roles().contains("BUSINESS_OWNER")) {
      throw AppException.forbidden("Owner access required");
    }
  }

}
