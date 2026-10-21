package com.karsaaz.studyloop.gateway.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.redact.RedactionPipeline;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Writes {@code ai_gateway_log}, the 14-day {@code ai_gateway_payload} copy (Q-02),
 * {@code redaction_event} rows and the daily {@code ai_usage_cost} roll-up. Ids only in logs.
 */
@Component
public class GatewayAuditLogger {
  private static final Logger log = LoggerFactory.getLogger(GatewayAuditLogger.class);

  private final JdbcTemplate jdbc;
  private final ObjectMapper mapper;

  public GatewayAuditLogger(JdbcTemplate jdbc, ObjectMapper mapper) {
    this.jdbc = jdbc;
    this.mapper = mapper;
  }

  /** One gateway call; {@code status} is an {@code ai_gateway_log.status} value. */
  public record Entry(
      String requestToken,
      String taskKey,
      String promptId,
      String promptVersion,
      String vendor,
      String model,
      boolean hasImages,
      Integer tokensIn,
      Integer tokensOut,
      long latencyMs,
      String status,
      String errorCode,
      Map<String, Object> redactedVariables,
      List<RedactionPipeline.Event> redactions,
      String route) {
    /** Text or image prompt run; the route is derived from {@code hasImages}. */
    public Entry(
        String requestToken, String taskKey, String promptId, String promptVersion, String vendor, String model,
        boolean hasImages, Integer tokensIn, Integer tokensOut, long latencyMs, String status, String errorCode,
        Map<String, Object> redactedVariables, List<RedactionPipeline.Event> redactions) {
      this(requestToken, taskKey, promptId, promptVersion, vendor, model, hasImages, tokensIn, tokensOut, latencyMs,
          status, errorCode, redactedVariables, redactions, hasImages ? "IMAGE" : "TEXT");
    }
  }

  public void record(Entry e) {
    try {
      UUID logId = UUID.randomUUID();
      String payloadJson = mapper.writeValueAsString(maskImages(e.redactedVariables()));
      jdbc.update(
          """
          INSERT INTO ai_gateway_log (log_id, request_token, task_key, prompt_id, prompt_version, vendor, model,
            route, tokens_in, tokens_out, latency_ms, status, redaction_count, payload_hash, error_code)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          logId,
          e.requestToken(),
          e.taskKey() == null ? "unknown" : e.taskKey(),
          e.promptId(),
          e.promptVersion(),
          e.vendor() == null ? "UNKNOWN" : e.vendor(),
          e.model(),
          e.route(),
          e.tokensIn(),
          e.tokensOut(),
          (int) Math.min(Integer.MAX_VALUE, e.latencyMs()),
          e.status(),
          e.redactions().size(),
          sha256(payloadJson),
          e.errorCode());
      jdbc.update(
          "INSERT INTO ai_gateway_payload (log_id, outbound_json, expires_at) VALUES (?, CAST(? AS jsonb), now() + interval '14 days')",
          logId,
          payloadJson);
      for (RedactionPipeline.Event r : e.redactions()) {
        jdbc.update(
            "INSERT INTO redaction_event (log_id, kind, method, placeholder) VALUES (?, ?, 'REGEX', ?)",
            logId,
            r.kind(),
            "[REDACTED_" + r.kind() + ":" + r.field() + "]");
      }
      if (e.model() != null && ("OK".equals(e.status()) || "FALLBACK_USED".equals(e.status()))) {
        jdbc.update(
            """
            INSERT INTO ai_usage_cost (day, task_key, vendor, model, calls, tokens_in, tokens_out, cost_pence)
            VALUES (CURRENT_DATE, ?, ?, ?, 1, ?, ?, 0)
            ON CONFLICT (day, task_key, vendor, model) DO UPDATE
              SET calls = ai_usage_cost.calls + 1,
                  tokens_in = ai_usage_cost.tokens_in + EXCLUDED.tokens_in,
                  tokens_out = ai_usage_cost.tokens_out + EXCLUDED.tokens_out
            """,
            e.taskKey(),
            e.vendor(),
            e.model(),
            e.tokensIn() == null ? 0L : e.tokensIn().longValue(),
            e.tokensOut() == null ? 0L : e.tokensOut().longValue());
      }
    } catch (Exception ex) {
      // Audit must never break the response; ids only.
      log.error("ai_gateway_log write failed for request {}: {}", e.requestToken(), ex.toString());
    }
  }

  /** Images are replaced by their hash — the DPO check needs proof of what was sent, not the photo. */
  static Map<String, Object> maskImages(Map<String, Object> vars) {
    Map<String, Object> out = new LinkedHashMap<>();
    if (vars == null) {
      return out;
    }
    for (var en : vars.entrySet()) {
      if (RedactionPipeline.IMAGE_KEYS.contains(en.getKey())) {
        Object v = en.getValue();
        if (v instanceof List<?> list) {
          out.put(en.getKey(), list.stream().map(o -> "[IMAGE sha256=" + sha256(String.valueOf(o)) + "]").toList());
        } else if (v != null) {
          out.put(en.getKey(), "[IMAGE sha256=" + sha256(String.valueOf(v)) + "]");
        }
      } else {
        out.put(en.getKey(), en.getValue());
      }
    }
    return out;
  }

  static String sha256(String s) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(s.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      return null;
    }
  }
}
