package com.karsaaz.studyloop.marking.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class NumericMarker {
  private final ObjectMapper objectMapper;

  public NumericMarker(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public record ObjectiveResult(
      boolean applicable,
      BigDecimal marksAwarded,
      BigDecimal marksAvailable,
      List<Map<String, Object>> points,
      double confidence) {}

  public ObjectiveResult mark(String answerSpecJson, String answerStructuredJson, short marksAvailable) {
    if (answerSpecJson == null || answerSpecJson.isBlank()) {
      return notApplicable(marksAvailable);
    }
    try {
      JsonNode spec = objectMapper.readTree(answerSpecJson);
      if (!"NUMBER".equals(spec.path("kind").asText()) && !spec.has("value")) {
        return notApplicable(marksAvailable);
      }
      BigDecimal expected = spec.has("value")
          ? spec.get("value").decimalValue()
          : new BigDecimal(spec.path("expected").asText("0"));
      BigDecimal given = extractNumeric(answerStructuredJson, answerSpecJson);
      if (given == null) {
        return zero(marksAvailable);
      }
      BigDecimal tolerance = spec.has("tolerance")
          ? spec.get("tolerance").decimalValue()
          : BigDecimal.valueOf(0.01);
      boolean correct = given.subtract(expected).abs().compareTo(tolerance) <= 0;
      BigDecimal awarded = correct ? BigDecimal.valueOf(marksAvailable) : BigDecimal.ZERO;
      List<Map<String, Object>> points = List.of(Map.of(
          "id", "NUM",
          "awarded", awarded,
          "max", marksAvailable,
          "evidence", given.toPlainString()));
      return new ObjectiveResult(true, awarded, BigDecimal.valueOf(marksAvailable), points, 1.0);
    } catch (Exception e) {
      return notApplicable(marksAvailable);
    }
  }

  private BigDecimal extractNumeric(String structured, String specJson) {
    if (structured != null && !structured.isBlank()) {
      try {
        JsonNode n = objectMapper.readTree(structured);
        if (n.has("value")) {
          return n.get("value").decimalValue();
        }
        if (n.has("numeric")) {
          return new BigDecimal(n.get("numeric").asText());
        }
      } catch (Exception ignored) {
        // fall through
      }
    }
    return null;
  }

  private ObjectiveResult notApplicable(short marksAvailable) {
    return new ObjectiveResult(false, BigDecimal.ZERO, BigDecimal.valueOf(marksAvailable), List.of(), 0);
  }

  private ObjectiveResult zero(short marksAvailable) {
    return new ObjectiveResult(
        true,
        BigDecimal.ZERO,
        BigDecimal.valueOf(marksAvailable),
        List.of(Map.of("id", "NUM", "awarded", 0, "max", marksAvailable)),
        1.0);
  }
}
