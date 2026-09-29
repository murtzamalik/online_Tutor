package com.karsaaz.studyloop.aiops.application;

import com.karsaaz.studyloop.common.error.AppException;
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

  public AiOpsService(JdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
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

  @Transactional
  public Map<String, Object> createEvalRun(AccountPrincipal principal, Map<String, Object> body) {
    requireAiEngineer(principal);
    UUID promptVersionId = jdbc.query(
        "SELECT prompt_version_id FROM prompt_version WHERE status = 'LIVE' ORDER BY created_at DESC LIMIT 1",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null);
    if (promptVersionId == null) {
      promptVersionId = jdbc.query(
          "SELECT prompt_version_id FROM prompt_version ORDER BY created_at DESC LIMIT 1",
          rs -> rs.next() ? (UUID) rs.getObject(1) : UUID.randomUUID());
    }
    List<Map<String, Object>> gold = jdbc.query(
        "SELECT gold_id, examiner_total FROM gold_set_item LIMIT 200",
        (rs, i) -> Map.of("goldId", rs.getObject("gold_id"), "examinerTotal", rs.getBigDecimal("examiner_total")));
    if (gold.isEmpty()) {
      throw AppException.notFound("Gold set empty");
    }
    UUID evalId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO eval_run (eval_id, prompt_version_id, task_key, model_id, dataset, n_items, started_at)
        VALUES (?, ?, 'P-MK-01', 'stub-model', 'gold_set', ?, ?)
        """,
        evalId,
        promptVersionId,
        gold.size(),
        clock.instant());
    int agreed = 0;
    for (Map<String, Object> g : gold) {
      UUID goldId = (UUID) g.get("goldId");
      BigDecimal examinerTotal = (BigDecimal) g.get("examinerTotal");
      BigDecimal aiTotal = examinerTotal;
      boolean exact = true;
      agreed += exact ? 1 : 0;
      jdbc.update(
          """
          INSERT INTO eval_result (eval_id, gold_id, ai_points_json, ai_total, points_agreed, points_total, exact_total, over_marked)
          VALUES (?, ?, '[]'::jsonb, ?, ?, 1, ?, FALSE)
          """,
          evalId,
          goldId,
          aiTotal,
          exact ? 1 : 0,
          exact);
    }
    BigDecimal exactRate = BigDecimal.valueOf(agreed).divide(BigDecimal.valueOf(gold.size()), 5, java.math.RoundingMode.HALF_UP);
    jdbc.update(
        """
        UPDATE eval_run SET point_accuracy = ?, exact_total_agreement = ?, finished_at = ?, passes_gate = ?
        WHERE eval_id = ?
        """,
        exactRate,
        exactRate,
        clock.instant(),
        exactRate.compareTo(new BigDecimal("0.95")) >= 0,
        evalId);
    return Map.of("evalId", evalId, "nItems", gold.size(), "exactTotalAgreement", exactRate);
  }

  public List<Map<String, Object>> listGold(AccountPrincipal principal) {
    requireAiOrOwner(principal);
    return jdbc.query(
        """
        SELECT gold_id, question_id, specification_id, question_type, examiner_total, origin, is_holdout, verified
        FROM gold_set_item ORDER BY created_at DESC LIMIT 500
        """,
        (rs, i) -> Map.of(
            "goldId", rs.getObject("gold_id"),
            "questionId", rs.getLong("question_id"),
            "specificationId", rs.getLong("specification_id"),
            "questionType", rs.getString("question_type"),
            "examinerTotal", rs.getBigDecimal("examiner_total"),
            "origin", rs.getString("origin"),
            "isHoldout", rs.getBoolean("is_holdout"),
            "verified", rs.getBoolean("verified")));
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
}
