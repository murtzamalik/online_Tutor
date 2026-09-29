package com.karsaaz.studyloop.generation.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GenerationService {
  private final JdbcTemplate jdbc;

  public GenerationService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> coverage(long topicId) {
    return jdbc.query(
        """
        SELECT review_status, COUNT(*) AS cnt
        FROM question WHERE topic_id = ? GROUP BY review_status
        """,
        (rs, i) -> Map.of("reviewStatus", rs.getString("review_status"), "count", rs.getLong("cnt")),
        topicId);
  }

  public Map<String, Object> coverageSummary(AccountPrincipal principal) {
    requireContent(principal);
    List<Map<String, Object>> approved = jdbc.query(
        """
        SELECT topic_id, COUNT(*) AS approved_count
        FROM question WHERE review_status = 'APPROVED'
        GROUP BY topic_id ORDER BY topic_id
        """,
        (rs, i) -> Map.of("topicId", rs.getLong("topic_id"), "approvedCount", rs.getLong("approved_count")));
    return Map.of("byTopic", approved);
  }

  @Transactional
  public Map<String, Object> createRun(AccountPrincipal principal, Map<String, Object> body) {
    requireContentOrSys(principal);
    String kind = body.getOrDefault("kind", "MANUAL").toString();
    UUID runId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO generation_run (run_id, kind, triggered_by, stats_json) VALUES (?, ?, ?, '{}'::jsonb)",
        runId,
        kind,
        principal.accountId());
    String blueprintId = "BP-W1-DEMO-" + runId.toString().substring(0, 8);
    Long topicId = jdbc.query(
        "SELECT topic_id FROM spec_topic ORDER BY topic_id LIMIT 1",
        rs -> rs.next() ? rs.getLong(1) : null);
    Long objectiveId = jdbc.query(
        "SELECT objective_id FROM spec_point_objective ORDER BY objective_id LIMIT 1",
        rs -> rs.next() ? rs.getLong(1) : null);
    if (topicId != null && objectiveId != null) {
      jdbc.update(
          """
          INSERT INTO blueprint (blueprint_id, run_id, spec_topic_id, objective_id, question_type, marks,
            command_word, target_grade_band, blueprint_json, status)
          VALUES (?, ?, ?, ?, 'SHORT_ANSWER', 2, 'State', '4-5', '{}'::jsonb, 'PUBLISHED')
          ON CONFLICT (blueprint_id) DO UPDATE SET status = 'PUBLISHED', run_id = EXCLUDED.run_id
          """,
          blueprintId,
          runId,
          topicId,
          objectiveId);
    }
    Map<String, Object> out = new HashMap<>();
    out.put("runId", runId);
    out.put("blueprintId", blueprintId);
    out.put("status", "STARTED");
    return out;
  }

  private void requireContent(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content access required");
    }
  }

  private void requireContentOrSys(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())
        && !principal.roles().contains("SYS")) {
      throw AppException.forbidden("Content or system access required");
    }
  }
}
