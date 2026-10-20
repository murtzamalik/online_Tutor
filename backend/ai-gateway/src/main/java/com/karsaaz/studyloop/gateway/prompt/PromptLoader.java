package com.karsaaz.studyloop.gateway.prompt;

import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Reads the single LIVE {@code prompt_version} row for a prompt (Q-03 promotion flow). */
@Component
public class PromptLoader {
  private static final Logger log = LoggerFactory.getLogger(PromptLoader.class);
  private final JdbcTemplate jdbc;

  public PromptLoader(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public record LiveBody(String version, String body) {}

  public Optional<LiveBody> liveBody(String promptId) {
    try {
      return Optional.ofNullable(
          jdbc.query(
              "SELECT version, body_text FROM prompt_version WHERE prompt_id = ? AND status = 'LIVE' LIMIT 1",
              rs -> rs.next() && rs.getString(2) != null && !rs.getString(2).isBlank()
                  ? new LiveBody(rs.getString(1), rs.getString(2))
                  : null,
              promptId));
    } catch (Exception e) {
      log.warn("prompt_version lookup failed for {}; using repo file", promptId);
      return Optional.empty();
    }
  }
}
