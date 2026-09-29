package com.karsaaz.studyloop.gateway.redact;

import com.karsaaz.studyloop.common.security.PiiPatterns;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RedactionPipeline {
  public record Result(Map<String, Object> variables, List<String> events) {}

  public Result redact(Map<String, Object> variables) {
    Map<String, Object> out = new LinkedHashMap<>();
    List<String> events = new ArrayList<>();
    if (variables == null) {
      return new Result(out, events);
    }
    for (var e : variables.entrySet()) {
      Object v = e.getValue();
      if (v instanceof String s) {
        String redacted = PiiPatterns.EMAIL.matcher(s).replaceAll("[REDACTED_EMAIL]");
        redacted = PiiPatterns.UK_PHONE.matcher(redacted).replaceAll("[REDACTED_PHONE]");
        redacted = PiiPatterns.DOB_ISO.matcher(redacted).replaceAll("[REDACTED_DOB]");
        if (!redacted.equals(s)) {
          events.add(e.getKey());
        }
        out.put(e.getKey(), redacted);
      } else {
        out.put(e.getKey(), v);
      }
    }
    return new Result(out, events);
  }
}
