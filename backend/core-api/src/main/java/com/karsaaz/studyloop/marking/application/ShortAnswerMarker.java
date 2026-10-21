package com.karsaaz.studyloop.marking.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Deterministic full-marks check for short recall answers ("State the colour…" → "Blue").
 * Only ever awards full marks on an exact (normalised) match with the model answer or with every
 * marking point's accept list; anything else is not applicable and goes to the AI passes.
 */
@Component
public class ShortAnswerMarker {
  static final int MAX_MARKS = 2;

  private final ObjectMapper objectMapper;

  public ShortAnswerMarker(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public McqMarker.ObjectiveResult mark(
      String questionType, String answerText, String markingPointsJson, String modelAnswer, short marksAvailable) {
    if (!"SHORT_ANSWER".equals(questionType) || marksAvailable < 1 || marksAvailable > MAX_MARKS) {
      return notApplicable(marksAvailable);
    }
    String answer = normalise(answerText);
    if (answer.isEmpty()) {
      return notApplicable(marksAvailable);
    }
    if (modelAnswer != null && !normalise(modelAnswer).isEmpty() && answer.equals(normalise(modelAnswer))) {
      return full(marksAvailable, answerText, "MODEL_ANSWER");
    }
    List<JsonNode> points = points(markingPointsJson);
    if (points.isEmpty()) {
      return notApplicable(marksAvailable);
    }
    for (JsonNode p : points) {
      if (!acceptedBy(p, answer)) {
        return notApplicable(marksAvailable);
      }
    }
    return full(marksAvailable, answerText, "ACCEPT_LIST");
  }

  private boolean acceptedBy(JsonNode point, String answer) {
    List<String> candidates = new ArrayList<>();
    JsonNode accept = point.path("accept");
    if (accept.isArray()) {
      accept.forEach(a -> candidates.add(a.asText()));
    }
    candidates.add(point.path("point").asText(""));
    JsonNode reject = point.path("reject");
    if (reject.isArray()) {
      for (JsonNode r : reject) {
        if (answer.equals(normalise(r.asText()))) {
          return false;
        }
      }
    }
    return candidates.stream().map(ShortAnswerMarker::normalise).anyMatch(c -> !c.isEmpty() && c.equals(answer));
  }

  private List<JsonNode> points(String json) {
    List<JsonNode> out = new ArrayList<>();
    if (json == null || json.isBlank()) {
      return out;
    }
    try {
      JsonNode root = objectMapper.readTree(json);
      JsonNode list = root.isArray() ? root : root.path("points");
      if (list.isArray()) {
        list.forEach(out::add);
      }
    } catch (Exception e) {
      return List.of();
    }
    return out;
  }

  /** Lower case, punctuation stripped, single spaces, leading article dropped. */
  static String normalise(String s) {
    if (s == null) {
      return "";
    }
    String t = s.toLowerCase(Locale.ROOT)
        .replaceAll("['’]", "")
        .replaceAll("[^\\p{L}\\p{N}()+\\-. ]", " ")
        .replaceAll("\\s+", " ")
        .trim()
        .replaceAll("[.]+$", "")
        .trim();
    return t.replaceFirst("^(a|an|the|it is|it's|its) ", "").trim();
  }

  private static McqMarker.ObjectiveResult full(short marksAvailable, String answerText, String basis) {
    BigDecimal awarded = BigDecimal.valueOf(marksAvailable);
    List<Map<String, Object>> points = List.of(Map.of(
        "id", "M1",
        "point", "Matches the mark scheme answer",
        "awarded", awarded,
        "max", marksAvailable,
        "evidence", answerText == null ? "" : answerText.trim(),
        "basis", basis));
    return new McqMarker.ObjectiveResult(true, awarded, BigDecimal.valueOf(marksAvailable), points, 1.0);
  }

  private static McqMarker.ObjectiveResult notApplicable(short marksAvailable) {
    return new McqMarker.ObjectiveResult(false, BigDecimal.ZERO, BigDecimal.valueOf(marksAvailable), List.of(), 0.0);
  }
}
