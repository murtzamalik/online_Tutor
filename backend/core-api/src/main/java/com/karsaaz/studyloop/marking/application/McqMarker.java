package com.karsaaz.studyloop.marking.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class McqMarker {
  private final ObjectMapper objectMapper;

  public McqMarker(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public record ObjectiveResult(
      boolean applicable,
      BigDecimal marksAwarded,
      BigDecimal marksAvailable,
      List<Map<String, Object>> points,
      double confidence) {}

  public ObjectiveResult mark(String optionsJson, String answerStructuredJson, short marksAvailable) {
    if (optionsJson == null || optionsJson.isBlank()) {
      return notApplicable(marksAvailable);
    }
    try {
      JsonNode options = objectMapper.readTree(optionsJson);
      String selected = extractMcqKey(answerStructuredJson);
      if (selected == null) {
        return zero(marksAvailable);
      }
      boolean correct = false;
      if (options.isArray()) {
        for (JsonNode opt : options) {
          if (selected.equals(opt.path("key").asText()) && opt.path("correct").asBoolean(false)) {
            correct = true;
            break;
          }
        }
      }
      BigDecimal awarded = correct ? BigDecimal.valueOf(marksAvailable) : BigDecimal.ZERO;
      List<Map<String, Object>> points = new ArrayList<>();
      points.add(Map.of(
          "id", "MCQ",
          "awarded", awarded,
          "max", marksAvailable,
          "evidence", selected));
      return new ObjectiveResult(true, awarded, BigDecimal.valueOf(marksAvailable), points, 1.0);
    } catch (Exception e) {
      return notApplicable(marksAvailable);
    }
  }

  private static String extractMcqKey(String answerStructuredJson) {
    if (answerStructuredJson == null || answerStructuredJson.isBlank()) {
      return null;
    }
    try {
      JsonNode n = new ObjectMapper().readTree(answerStructuredJson);
      if (n.has("mcqKey")) {
        return n.get("mcqKey").asText();
      }
      if (n.has("selectedKey")) {
        return n.get("selectedKey").asText();
      }
      if (n.has("optionId")) {
        return n.get("optionId").asText();
      }
      if (n.has("key")) {
        return n.get("key").asText();
      }
    } catch (Exception ignored) {
      // fall through
    }
    return null;
  }

  private ObjectiveResult notApplicable(short marksAvailable) {
    return new ObjectiveResult(false, BigDecimal.ZERO, BigDecimal.valueOf(marksAvailable), List.of(), 0);
  }

  private ObjectiveResult zero(short marksAvailable) {
    List<Map<String, Object>> points = List.of(Map.of("id", "MCQ", "awarded", 0, "max", marksAvailable));
    return new ObjectiveResult(true, BigDecimal.ZERO, BigDecimal.valueOf(marksAvailable), points, 1.0);
  }
}
