package com.karsaaz.studyloop.generation.application;

import com.karsaaz.studyloop.common.db.SqlTime;

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
public class GenerationService {
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public GenerationService(JdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
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
  public Map<String, Object> plan(AccountPrincipal principal, Map<String, Object> body) {
    requireContentOrSys(principal);
    long pending = jdbc.queryForObject(
        "SELECT COUNT(*) FROM question WHERE review_status = 'PENDING_QC'", Long.class);
    long approved = jdbc.queryForObject(
        "SELECT COUNT(*) FROM question WHERE review_status = 'APPROVED'", Long.class);
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
    promoteApprovedPending(1);
    jdbc.update(
        "UPDATE generation_run SET finished_at = ?, stats_json = ?::jsonb WHERE run_id = ?",
        SqlTime.ts(clock.instant()),
        "{\"promoted\":1,\"blueprints\":1}",
        runId);
    Map<String, Object> out = new HashMap<>();
    out.put("runId", runId);
    out.put("blueprintId", blueprintId);
    out.put("status", "COMPLETED");
    return out;
  }

  public Map<String, Object> getRun(AccountPrincipal principal, UUID runId) {
    requireContent(principal);
    Map<String, Object> run = jdbc.query(
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

  /** Nightly substitute: promote up to N PENDING_QC items that have no failing QC checks. */
  @Transactional
  public int promoteApprovedPending(int limit) {
    List<Long> ids = jdbc.query(
        """
        SELECT q.question_id FROM question q
        WHERE q.review_status = 'PENDING_QC'
          AND NOT EXISTS (
            SELECT 1 FROM qc_check_result c WHERE c.question_id = q.question_id AND c.passed = FALSE
          )
        ORDER BY q.question_id LIMIT ?
        """,
        (rs, i) -> rs.getLong(1),
        limit);
    int n = 0;
    for (Long id : ids) {
      n += jdbc.update(
          "UPDATE question SET review_status = 'APPROVED', reviewed_at = ?, updated_at = ? WHERE question_id = ?",
          SqlTime.ts(clock.instant()),
          SqlTime.ts(clock.instant()),
          id);
    }
    return n;
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
