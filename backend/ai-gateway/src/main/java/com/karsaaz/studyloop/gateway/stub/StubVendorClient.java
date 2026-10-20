package com.karsaaz.studyloop.gateway.stub;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * Local/CI stand-in for a model: returns the schema-shaped output in {@code fixtures/<promptId>.json}.
 * The gateway still renders the prompt first, so variable mismatches fail in stub mode too.
 */
@Component
public class StubVendorClient {
  private final ObjectMapper mapper;

  public StubVendorClient(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> run(String promptId, Map<String, Object> variables) {
    Map<String, Object> out = readFixture(promptId);
    int marksAvailable = marksAvailable(variables);
    // Full marks so both passes agree and local learning loops can clear wrong-answer pools.
    if ("P-MK-01".equals(promptId) || "P-MK-02".equals(promptId)) {
      // Evidence must quote the answer, as core-api checks it is a substring.
      String answer = variables == null ? "" : String.valueOf(variables.getOrDefault("student_answer", ""));
      String evidence = answer.length() > 40 ? answer.substring(0, 40) : answer;
      out.put(
          "points",
          List.of(
              Map.of(
                  "id", "M1",
                  "awarded", marksAvailable,
                  "max", marksAvailable,
                  "evidence", evidence,
                  "reason", "Stub fixture: full marks.",
                  "ecf_from", "")));
      out.put("total_marks", marksAvailable);
      out.put("max_marks", marksAvailable);
    } else if ("P-MK-04".equals(promptId)) {
      out.put("provisional_marks", marksAvailable);
      out.put("max_marks", marksAvailable);
    }
    return out;
  }

  @SuppressWarnings("unchecked")
  private Map<String, Object> readFixture(String promptId) {
    var resource = new ClassPathResource("fixtures/" + promptId + ".json");
    if (!resource.exists()) {
      throw new GatewayException(
          GatewayException.VENDOR_ERROR, 501, "No stub fixture for " + promptId + " (stub mode)");
    }
    try (InputStream in = resource.getInputStream()) {
      return new HashMap<>(mapper.readValue(in, Map.class));
    } catch (Exception e) {
      throw new GatewayException(GatewayException.VENDOR_ERROR, 500, "Bad stub fixture " + promptId, e);
    }
  }

  private static int marksAvailable(Map<String, Object> variables) {
    Object v = variables == null ? null : variables.get("marksAvailable");
    if (v instanceof Number n) {
      return Math.max(1, n.intValue());
    }
    try {
      return v == null ? 1 : Math.max(1, Integer.parseInt(v.toString().trim()));
    } catch (NumberFormatException e) {
      return 1;
    }
  }
}
