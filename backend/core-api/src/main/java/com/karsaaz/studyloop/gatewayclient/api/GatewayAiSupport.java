package com.karsaaz.studyloop.gatewayclient.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.common.security.PiiPatterns;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Shared helpers for reading the AI gateway envelope ({@code result} is the model's JSON object). */
@Component
public class GatewayAiSupport {
  private final ObjectMapper mapper;

  public GatewayAiSupport(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  /**
   * The schema-validated model output. May be the {@code {"status":"cannot_complete"}} shape —
   * check with {@link #cannotComplete}.
   */
  @SuppressWarnings("unchecked")
  public Map<String, Object> requireResult(Map<?, ?> gatewayResponse, String promptId) {
    if (gatewayResponse == null) {
      throw new IllegalStateException("AI gateway returned null for " + promptId);
    }
    Object status = gatewayResponse.get("status");
    if (status != null && !"ok".equalsIgnoreCase(String.valueOf(status))) {
      throw new IllegalStateException("AI gateway status=" + status + " for " + promptId);
    }
    Object result = gatewayResponse.get("result");
    if (result instanceof Map<?, ?> m) {
      return new HashMap<>((Map<String, Object>) m);
    }
    throw new IllegalStateException("AI gateway returned no result for " + promptId);
  }

  public static boolean cannotComplete(Map<String, Object> result) {
    return result != null && "cannot_complete".equalsIgnoreCase(String.valueOf(result.get("status")));
  }

  /** Model that actually answered (after any fallback), for provenance columns. */
  public static String model(Map<?, ?> gatewayResponse) {
    Object m = gatewayResponse == null ? null : gatewayResponse.get("model");
    return m == null ? "unknown" : m.toString();
  }

  /**
   * QC1 (P-QG-04) verdict. Passes only on {@code verdict == PASS} with no BLOCKER issue — the
   * {@code status} field is "ok" for every completed check, including failed ones.
   */
  public boolean qcPassed(Map<String, Object> result) {
    if (result == null || cannotComplete(result)) {
      return false;
    }
    if (!"PASS".equalsIgnoreCase(asText(result.get("verdict")))) {
      return false;
    }
    for (Map<String, Object> issue : asMapList(result.get("issues"))) {
      if ("BLOCKER".equalsIgnoreCase(asText(issue.get("severity")))) {
        return false;
      }
    }
    return true;
  }

  /** Regex redaction applied in core before text leaves for the gateway (D-15, first line). */
  public static String redactPii(String text) {
    if (text == null) {
      return "";
    }
    String out = PiiPatterns.EMAIL.matcher(text).replaceAll("[REDACTED_EMAIL]");
    out = PiiPatterns.UK_PHONE.matcher(out).replaceAll("[REDACTED_PHONE]");
    return PiiPatterns.DOB_ISO.matcher(out).replaceAll("[REDACTED_DOB]");
  }

  public String toJson(Object value) {
    try {
      return mapper.writeValueAsString(value == null ? Map.of() : value);
    } catch (JsonProcessingException e) {
      throw new IllegalStateException("JSON serialize failed: " + e.getMessage(), e);
    }
  }

  /** Parsed JSON (maps, lists, scalars); null when the text is not valid JSON. */
  public Object parseJson(String json) {
    try {
      return json == null ? null : mapper.readValue(json, Object.class);
    } catch (JsonProcessingException e) {
      return null;
    }
  }

  public String asText(Object value) {
    return value == null ? "" : String.valueOf(value);
  }

  public int asInt(Object value, int defaultValue) {
    if (value instanceof Number n) {
      return n.intValue();
    }
    if (value != null) {
      try {
        return Integer.parseInt(value.toString().trim());
      } catch (NumberFormatException ignored) {
        // fall through
      }
    }
    return defaultValue;
  }

  public double asDouble(Object value, double defaultValue) {
    if (value instanceof Number n) {
      return n.doubleValue();
    }
    if (value != null) {
      try {
        return Double.parseDouble(value.toString().trim());
      } catch (NumberFormatException ignored) {
        // fall through
      }
    }
    return defaultValue;
  }

  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> asMapList(Object value) {
    List<Map<String, Object>> out = new ArrayList<>();
    if (value instanceof List<?> list) {
      for (Object o : list) {
        if (o instanceof Map<?, ?> m) {
          out.add((Map<String, Object>) m);
        }
      }
    }
    return out;
  }

  public List<String> asStringList(Object value) {
    List<String> out = new ArrayList<>();
    if (value instanceof List<?> list) {
      for (Object o : list) {
        if (o != null) {
          out.add(String.valueOf(o));
        }
      }
    }
    return out;
  }
}
