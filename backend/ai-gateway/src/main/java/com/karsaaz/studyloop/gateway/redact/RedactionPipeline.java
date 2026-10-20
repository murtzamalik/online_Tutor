package com.karsaaz.studyloop.gateway.redact;

import com.karsaaz.studyloop.common.security.PiiPatterns;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Regex redaction of outbound variables (D-15 second line of defence; core-api redacts first).
 * Walks nested maps/lists. Image payloads are never touched — they are masked client-side.
 */
@Component
public class RedactionPipeline {
  public static final Set<String> IMAGE_KEYS = Set.of("image_base64", "images_base64");

  /** {@code kind} matches {@code redaction_event.kind}. */
  public record Event(String field, String kind) {}

  public record Result(Map<String, Object> variables, List<Event> events) {}

  private record Rule(String kind, Pattern pattern, String placeholder) {}

  private static final List<Rule> RULES =
      List.of(
          new Rule("EMAIL", PiiPatterns.EMAIL, "[REDACTED_EMAIL]"),
          new Rule("PHONE", PiiPatterns.UK_PHONE, "[REDACTED_PHONE]"),
          new Rule("DOB", PiiPatterns.DOB_ISO, "[REDACTED_DOB]"));

  public Result redact(Map<String, Object> variables) {
    List<Event> events = new ArrayList<>();
    Map<String, Object> out = new LinkedHashMap<>();
    if (variables != null) {
      for (var e : variables.entrySet()) {
        out.put(
            e.getKey(),
            IMAGE_KEYS.contains(e.getKey()) ? e.getValue() : redactValue(e.getKey(), e.getValue(), events));
      }
    }
    return new Result(out, events);
  }

  private Object redactValue(String field, Object value, List<Event> events) {
    if (value instanceof String s) {
      String redacted = s;
      for (Rule rule : RULES) {
        var m = rule.pattern().matcher(redacted);
        if (m.find()) {
          events.add(new Event(field, rule.kind()));
          redacted = m.replaceAll(rule.placeholder());
        }
      }
      return redacted;
    }
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> copy = new LinkedHashMap<>();
      for (var e : map.entrySet()) {
        copy.put(String.valueOf(e.getKey()), redactValue(field, e.getValue(), events));
      }
      return copy;
    }
    if (value instanceof List<?> list) {
      List<Object> copy = new ArrayList<>(list.size());
      for (Object o : list) {
        copy.add(redactValue(field, o, events));
      }
      return copy;
    }
    return value;
  }
}
