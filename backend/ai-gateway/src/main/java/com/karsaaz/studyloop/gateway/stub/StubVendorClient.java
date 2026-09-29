package com.karsaaz.studyloop.gateway.stub;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class StubVendorClient {
  private final ObjectMapper mapper;

  public StubVendorClient(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  @SuppressWarnings("unchecked")
  public Map<String, Object> run(String promptId, Map<String, Object> variables) {
    try {
      var resource = new ClassPathResource("fixtures/" + promptId + ".json");
      if (resource.exists()) {
        return mapper.readValue(resource.getInputStream(), Map.class);
      }
    } catch (Exception ignored) {
      // fall through
    }
    return Map.of(
        "status", "ok",
        "promptId", promptId,
        "result", Map.of("message", "stub response", "variablesEchoKeys", variables.keySet()));
  }
}
