package com.karsaaz.studyloop.platform.feature;

import com.karsaaz.studyloop.common.error.AppException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class FeatureFlags {
  private final JdbcTemplate jdbc;

  public FeatureFlags(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean enabled(String flagKey) {
    Boolean on = jdbc.query(
        "SELECT enabled FROM feature_flag WHERE flag_key = ?",
        rs -> rs.next() && rs.getBoolean(1),
        flagKey);
    return Boolean.TRUE.equals(on);
  }

  public void require(String flagKey, String message) {
    if (!enabled(flagKey)) {
      throw AppException.featureDisabled(message);
    }
  }

  public int configInt(String key, int defaultValue) {
    Integer v = jdbc.query(
        "SELECT value_json::text FROM app_config WHERE config_key = ?",
        rs -> {
          if (!rs.next()) {
            return null;
          }
          String raw = rs.getString(1);
          if (raw == null) {
            return null;
          }
          raw = raw.trim().replace("\"", "");
          try {
            return Integer.parseInt(raw);
          } catch (NumberFormatException e) {
            return null;
          }
        },
        key);
    return v == null ? defaultValue : v;
  }

  public String configString(String key, String defaultValue) {
    String v = jdbc.query(
        "SELECT value_json::text FROM app_config WHERE config_key = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        key);
    if (v == null) {
      return defaultValue;
    }
    v = v.trim();
    if (v.startsWith("\"") && v.endsWith("\"") && v.length() >= 2) {
      return v.substring(1, v.length() - 1);
    }
    return v;
  }
}
