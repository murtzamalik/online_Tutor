package com.karsaaz.studyloop.generation.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class GenerationCodeChecksTest {
  private static Map<String, Object> item(String type, String word, int marks, int... pointMarks) {
    List<Map<String, Object>> points = new java.util.ArrayList<>();
    for (int i = 0; i < pointMarks.length; i++) {
      points.add(Map.of("id", "M" + (i + 1), "marks", pointMarks[i]));
    }
    Map<String, Object> scheme = new HashMap<>();
    scheme.put("scheme_type", "POINTS");
    scheme.put("marking_points", points);
    Map<String, Object> item = new HashMap<>();
    item.put("question_type", type);
    item.put("command_word", word);
    item.put("marks", marks);
    item.put("mark_scheme", scheme);
    return item;
  }

  @Test
  void matchingItemPasses() {
    assertThat(GenerationCodeChecks.check(item("SHORT_ANSWER", "State", 2, 1, 1), "SHORT_ANSWER", "State", 2))
        .isEmpty();
  }

  @Test
  void blueprintDriftAndBadArithmeticAreCaught() {
    var issues = GenerationCodeChecks.check(item("SHORT_ANSWER", "Explain", 3, 1, 2), "SHORT_ANSWER", "State", 2);
    assertThat(issues).anyMatch(s -> s.startsWith("C2: command_word"));
    assertThat(issues).anyMatch(s -> s.startsWith("C2: marks"));
    assertThat(issues).anyMatch(s -> s.startsWith("C3"));
  }

  @Test
  void mcqNeedsFourOptionsAndOneCorrect() {
    Map<String, Object> mcq = item("MULTIPLE_CHOICE", "Identify", 1, 1);
    mcq.put("options", List.of(Map.of("key", "A", "correct", true), Map.of("key", "B", "correct", true)));
    assertThat(GenerationCodeChecks.check(mcq, "MULTIPLE_CHOICE", "Identify", 1)).anyMatch(s -> s.startsWith("C4"));
  }

  @Test
  void qcPassesOnlyOnVerdictPassWithoutBlockers() {
    GatewayAiSupport ai = new GatewayAiSupport(new ObjectMapper());
    // The old check passed whenever status == "ok" — true for failed checks too.
    assertThat(ai.qcPassed(Map.of("status", "ok", "verdict", "FAIL", "issues", List.of()))).isFalse();
    assertThat(ai.qcPassed(Map.of("status", "ok", "verdict", "PASS", "issues", List.of()))).isTrue();
    assertThat(ai.qcPassed(Map.of("status", "ok", "verdict", "PASS",
        "issues", List.of(Map.of("check", "A", "severity", "BLOCKER", "text", "t", "reason", "r"))))).isFalse();
    assertThat(ai.qcPassed(Map.of("status", "cannot_complete", "reason", "x"))).isFalse();
  }
}
