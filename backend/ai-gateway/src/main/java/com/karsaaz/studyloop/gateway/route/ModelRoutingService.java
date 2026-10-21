package com.karsaaz.studyloop.gateway.route;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Resolves vendor/model from {@code model_routing} (V010 seed, V019/V020 updates; D-28). */
@Service
public class ModelRoutingService {
  private static final Logger log = LoggerFactory.getLogger(ModelRoutingService.class);
  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;

  public ModelRoutingService(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  public record Route(
      String taskKey,
      String vendor,
      String modelId,
      double temperature,
      String modelTier,
      String fallbackModelId,
      int maxTokens) {}

  public Optional<Route> resolveByTaskKey(String taskKey) {
    if (taskKey == null || taskKey.isBlank()) {
      return Optional.empty();
    }
    try {
      return Optional.ofNullable(
          jdbc.query(
              """
              SELECT task_key, vendor, model_id, model_tier, fallback_model_id,
                     params_json::text AS params
              FROM model_routing WHERE task_key = ?
              """,
              rs -> {
                if (!rs.next()) {
                  return null;
                }
                String tier = rs.getString("model_tier");
                JsonNode params = parseParams(rs.getString("params"));
                double temperature = params.path("temperature").asDouble(0.0);
                int maxTokens = params.path("max_tokens").asInt(defaultMaxTokens(tier));
                return new Route(
                    rs.getString("task_key"),
                    rs.getString("vendor"),
                    rs.getString("model_id"),
                    temperature,
                    tier,
                    rs.getString("fallback_model_id"),
                    maxTokens);
              },
              taskKey));
    } catch (Exception e) {
      log.error("model_routing DB lookup failed for taskKey={}", taskKey, e);
      return Optional.empty();
    }
  }

  /** One string value from a task's {@code params_json}, e.g. the TTS voice name. */
  public String param(String taskKey, String key, String defaultValue) {
    try {
      String json = jdbc.query(
          "SELECT params_json::text FROM model_routing WHERE task_key = ?",
          rs -> rs.next() ? rs.getString(1) : null,
          taskKey);
      String v = parseParams(json).path(key).asText("");
      return v.isBlank() ? defaultValue : v;
    } catch (Exception e) {
      return defaultValue;
    }
  }

  static int defaultMaxTokens(String tier) {
    return "small".equals(tier) ? 1024 : 4096;
  }

  private JsonNode parseParams(String json) {
    if (json == null || json.isBlank()) {
      return mapper.createObjectNode();
    }
    try {
      return mapper.readTree(json);
    } catch (Exception e) {
      log.warn("Invalid model_routing.params_json; using defaults");
      return mapper.createObjectNode();
    }
  }
}
