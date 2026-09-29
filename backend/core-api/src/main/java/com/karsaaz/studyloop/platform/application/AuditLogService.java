package com.karsaaz.studyloop.platform.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditLogService {
  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final ObjectMapper mapper;

  public AuditLogService(JdbcTemplate jdbc, Clock clock, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.clock = clock;
    this.mapper = mapper;
  }

  @Transactional
  public void append(UUID actorAccountId, String actorRole, String action, String targetType, String targetId,
                     Map<String, Object> metadata) {
    String prev = jdbc.query(
        "SELECT row_hash FROM audit_log ORDER BY audit_id DESC LIMIT 1",
        rs -> rs.next() ? rs.getString(1) : "");
    if (prev == null) {
      prev = "";
    }
    Instant now = clock.instant();
    String metaJson;
    try {
      metaJson = metadata == null ? null : mapper.writeValueAsString(metadata);
    } catch (Exception e) {
      throw new IllegalStateException("audit metadata serialize failed", e);
    }
    String canonical = String.join("|",
        prev,
        now.toString(),
        actorAccountId == null ? "" : actorAccountId.toString(),
        nullToEmpty(actorRole),
        action,
        nullToEmpty(targetType),
        nullToEmpty(targetId),
        nullToEmpty(metaJson));
    String rowHash = sha256(canonical);
    String sql = "INSERT INTO audit_log (occurred_at, actor_account_id, actor_role, action, target_type, target_id, metadata_json, prev_hash, row_hash) "
        + "VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?)";
    jdbc.update(sql, now, actorAccountId, actorRole, action, targetType, targetId, metaJson, prev, rowHash);
  }

  private static String nullToEmpty(String s) {
    return s == null ? "" : s;
  }

  private static String sha256(String input) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
