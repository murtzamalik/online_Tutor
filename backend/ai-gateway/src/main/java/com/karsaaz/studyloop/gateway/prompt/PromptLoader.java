package com.karsaaz.studyloop.gateway.prompt;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PromptLoader {
  private final Path promptsPath;
  private final JdbcTemplate jdbc;
  private final Map<String, String> cache = new ConcurrentHashMap<>();

  public PromptLoader(@Value("${studyloop.gateway.prompts-path}") String promptsPath, JdbcTemplate jdbc) {
    this.promptsPath = Path.of(promptsPath);
    this.jdbc = jdbc;
  }

  public String loadBody(String promptId) {
    return cache.computeIfAbsent(promptId, this::resolve);
  }

  private String resolve(String promptId) {
    try {
      String fromDb = jdbc.query(
          "SELECT body_text FROM prompt_version WHERE prompt_id = ? AND status = 'LIVE' LIMIT 1",
          rs -> rs.next() ? rs.getString(1) : null,
          promptId);
      if (fromDb != null && !fromDb.isBlank()) {
        return fromDb;
      }
    } catch (Exception ignored) {
      // DB may be empty in early W0
    }
    try {
      if (Files.isDirectory(promptsPath)) {
        try (var stream = Files.walk(promptsPath)) {
          return stream
              .filter(p -> p.getFileName().toString().startsWith(promptId))
              .findFirst()
              .map(p -> {
                try {
                  return Files.readString(p);
                } catch (IOException e) {
                  return "PROMPT_MISSING";
                }
              })
              .orElse("PROMPT_STUB:" + promptId);
        }
      }
    } catch (IOException e) {
      return "PROMPT_STUB:" + promptId;
    }
    return "PROMPT_STUB:" + promptId;
  }
}
