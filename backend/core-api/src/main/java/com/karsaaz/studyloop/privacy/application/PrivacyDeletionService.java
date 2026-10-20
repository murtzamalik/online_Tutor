package com.karsaaz.studyloop.privacy.application;

import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** L-02 deletion/export with cool-off; no dark patterns (clear cancel, no urgency copy). */
@Service
public class PrivacyDeletionService {
  public static final int DEFAULT_COOL_OFF_DAYS = 14;

  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final Clock clock;

  public PrivacyDeletionService(JdbcTemplate jdbc, StudentAccessHelper access, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.clock = clock;
  }

  public static Instant scheduledFor(Instant requestedAt, int coolOffDays) {
    return requestedAt.plus(coolOffDays, ChronoUnit.DAYS);
  }

  public static boolean canCancel(String status, Instant now, Instant scheduledFor) {
    if (!"COOLING_OFF".equals(status) && !"REQUESTED".equals(status)) {
      return false;
    }
    return scheduledFor == null || now.isBefore(scheduledFor);
  }

  private int coolOffDays() {
    Integer days = jdbc.query(
        "SELECT (value_json#>>'{}')::int FROM app_config WHERE config_key = 'deletion.cool_off_days'",
        rs -> rs.next() ? rs.getInt(1) : null);
    return days == null ? DEFAULT_COOL_OFF_DAYS : days;
  }

  @Transactional
  public Map<String, Object> requestDeletion(
      AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    access.assertParentOwns(principal, studentId);
    Integer open = jdbc.queryForObject(
        """
        SELECT COUNT(*) FROM deletion_request
        WHERE student_id = ? AND status IN ('REQUESTED','COOLING_OFF','PROCESSING')
        """,
        Integer.class,
        studentId);
    if (open != null && open > 0) {
      throw AppException.conflict("CONFLICT", "A deletion request is already open");
    }
    String scope = body.getOrDefault("scope", "FULL").toString();
    if (!List.of("FULL", "LEARNING_DATA_ONLY").contains(scope)) {
      scope = "FULL";
    }
    UUID deletionId = UUID.randomUUID();
    Instant now = clock.instant();
    Instant scheduled = scheduledFor(now, coolOffDays());
    jdbc.update(
        """
        INSERT INTO deletion_request (deletion_id, student_id, requested_by, scope, status, requested_at, scheduled_for)
        VALUES (?, ?, ?, ?, 'COOLING_OFF', ?, ?)
        """,
        deletionId,
        studentId,
        principal.accountId(),
        scope,
        SqlTime.ts(now),
        SqlTime.ts(scheduled));
    Map<String, Object> out = new HashMap<>();
    out.put("deletionId", deletionId);
    out.put("studentId", studentId);
    out.put("status", "COOLING_OFF");
    out.put("scope", scope);
    out.put("coolOffDays", coolOffDays());
    out.put("scheduledFor", scheduled.toString());
    out.put("canCancel", true);
    out.put(
        "message",
        "Your deletion is scheduled after a "
            + coolOffDays()
            + "-day cooling-off. You can cancel any time before then. There is no penalty for cancelling.");
    return out;
  }

  public Map<String, Object> getDeletion(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    Map<String, Object> row = jdbc.query(
        """
        SELECT deletion_id, scope, status, requested_at, scheduled_for, completed_at
        FROM deletion_request WHERE student_id = ?
        ORDER BY requested_at DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("deletionId", rs.getObject("deletion_id"));
          m.put("scope", rs.getString("scope"));
          m.put("status", rs.getString("status"));
          m.put("requestedAt", rs.getTimestamp("requested_at").toInstant().toString());
          Instant scheduled =
              rs.getTimestamp("scheduled_for") == null
                  ? null
                  : rs.getTimestamp("scheduled_for").toInstant();
          m.put("scheduledFor", scheduled == null ? null : scheduled.toString());
          m.put(
              "completedAt",
              rs.getTimestamp("completed_at") == null
                  ? null
                  : rs.getTimestamp("completed_at").toInstant().toString());
          m.put("canCancel", canCancel(rs.getString("status"), clock.instant(), scheduled));
          return m;
        },
        studentId);
    if (row == null) {
      return Map.of("studentId", studentId, "status", "NONE", "canCancel", false);
    }
    Map<String, Object> out = new HashMap<>(row);
    out.put("studentId", studentId);
    return out;
  }

  @Transactional
  public Map<String, Object> cancelDeletion(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    Map<String, Object> current = getDeletion(principal, studentId);
    if (!Boolean.TRUE.equals(current.get("canCancel"))) {
      throw AppException.badRequest("VALIDATION_FAILED", "Cooling-off ended or no cancellable request");
    }
    jdbc.update(
        """
        UPDATE deletion_request SET status = 'CANCELLED'
        WHERE student_id = ? AND status IN ('REQUESTED','COOLING_OFF')
        """,
        studentId);
    return Map.of("studentId", studentId, "status", "CANCELLED", "message", "Deletion cancelled. No further action needed.");
  }

  @Transactional
  public Map<String, Object> requestExport(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    UUID exportId = UUID.randomUUID();
    Instant now = clock.instant();
    String fileKey = "exports/" + studentId + "/" + exportId + ".json";
    jdbc.update(
        """
        INSERT INTO data_export_request (export_id, student_id, requested_by, status, file_key, requested_at, expires_at)
        VALUES (?, ?, ?, 'READY', ?, ?, ?)
        """,
        exportId,
        studentId,
        principal.accountId(),
        fileKey,
        SqlTime.ts(now),
        SqlTime.ts(now.plus(7, ChronoUnit.DAYS)));
    // Demo: mark READY immediately with a stub payload reference (no personal data in logs).
    return Map.of(
        "exportId",
        exportId,
        "studentId",
        studentId,
        "status",
        "READY",
        "fileKey",
        fileKey,
        "expiresAt",
        now.plus(7, ChronoUnit.DAYS).toString());
  }

  public Map<String, Object> getExport(AccountPrincipal principal, UUID studentId, UUID exportId) {
    access.assertParentOwns(principal, studentId);
    Map<String, Object> row = jdbc.query(
        """
        SELECT export_id, status, file_key, requested_at, expires_at
        FROM data_export_request WHERE export_id = ? AND student_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("exportId", rs.getObject("export_id"));
          m.put("status", rs.getString("status"));
          m.put("fileKey", rs.getString("file_key"));
          m.put("downloadUrl", "/api/v1/students/" + studentId + "/data-export/" + exportId);
          m.put("requestedAt", rs.getTimestamp("requested_at").toInstant().toString());
          m.put(
              "expiresAt",
              rs.getTimestamp("expires_at") == null
                  ? null
                  : rs.getTimestamp("expires_at").toInstant().toString());
          return m;
        },
        exportId,
        studentId);
    if (row == null) {
      throw AppException.notFound("Export not found");
    }
    return row;
  }

  /** Purge job hook: process cool-off expired requests. Idempotent; safe for scheduler. */
  @Transactional
  public Map<String, Object> runDuePurges() {
    List<UUID> due = jdbc.query(
        """
        SELECT deletion_id FROM deletion_request
        WHERE status = 'COOLING_OFF' AND scheduled_for <= ?
        """,
        (rs, i) -> (UUID) rs.getObject(1),
        SqlTime.ts(clock.instant()));
    int processed = 0;
    for (UUID id : due) {
      jdbc.update(
          "UPDATE deletion_request SET status = 'PROCESSING' WHERE deletion_id = ? AND status = 'COOLING_OFF'",
          id);
      // Soft purge hook: mark complete; hard DELETE of learner rows is ops-runbook gated.
      jdbc.update(
          """
          UPDATE deletion_request SET status = 'COMPLETED', completed_at = ?, certificate_ref = ?
          WHERE deletion_id = ?
          """,
          SqlTime.ts(clock.instant()),
          "purge-cert-" + id,
          id);
      processed++;
    }
    return Map.of("processed", processed, "hook", "PrivacyDeletionService.runDuePurges");
  }
}
