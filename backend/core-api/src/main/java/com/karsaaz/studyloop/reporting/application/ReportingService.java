package com.karsaaz.studyloop.reporting.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportingService {
  private final JdbcTemplate jdbc;

  public ReportingService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> getNotificationPreferences(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasParentRole(principal.roles())) {
      throw AppException.forbidden("Parent access required");
    }
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT channel, kind, enabled FROM notification_preference WHERE account_id = ?
        ORDER BY channel, kind
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("channel", rs.getString("channel"));
          m.put("kind", rs.getString("kind"));
          m.put("enabled", rs.getBoolean("enabled"));
          return m;
        },
        principal.accountId());
    if (items.isEmpty()) {
      return List.of(
          Map.of("channel", "EMAIL", "kind", "WEEKLY_REPORT", "enabled", true),
          Map.of("channel", "EMAIL", "kind", "ALERT", "enabled", true),
          Map.of("channel", "IN_APP", "kind", "BILLING", "enabled", true));
    }
    return items;
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> putNotificationPreferences(
      AccountPrincipal principal, Map<String, Object> body) {
    if (!StudentAccessHelper.hasParentRole(principal.roles())) {
      throw AppException.forbidden("Parent access required");
    }
    List<Map<String, Object>> prefs = body.get("items") instanceof List<?> list
        ? (List<Map<String, Object>>) list
        : List.of(body);
    for (Map<String, Object> p : prefs) {
      if (p.get("channel") == null || p.get("kind") == null) {
        continue;
      }
      boolean enabled = !Boolean.FALSE.equals(p.get("enabled"));
      jdbc.update(
          """
          INSERT INTO notification_preference (account_id, channel, kind, enabled)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (account_id, channel, kind) DO UPDATE SET enabled = EXCLUDED.enabled
          """,
          principal.accountId(),
          p.get("channel").toString(),
          p.get("kind").toString(),
          enabled);
    }
    return getNotificationPreferences(principal);
  }
}
