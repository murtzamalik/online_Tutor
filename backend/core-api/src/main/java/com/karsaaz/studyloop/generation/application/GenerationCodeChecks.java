package com.karsaaz.studyloop.generation.application;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Deterministic checks run before any QC model call (question_generation/10_code_side_checks.md).
 * Implemented here: C2 blueprint match, C3 marks arithmetic, C4 MCQ shape.
 */
public final class GenerationCodeChecks {
  private GenerationCodeChecks() {}

  /** @return human-readable issues; empty when the item passes. */
  public static List<String> check(
      Map<String, Object> item, String blueprintType, String blueprintCommandWord, int blueprintMarks) {
    List<String> issues = new ArrayList<>();
    String type = str(item.get("question_type"));
    if (!blueprintType.equalsIgnoreCase(type)) {
      issues.add("C2: question_type " + type + " != blueprint " + blueprintType);
    }
    String word = str(item.get("command_word"));
    if (!blueprintCommandWord.equalsIgnoreCase(word)) {
      issues.add("C2: command_word " + word + " != blueprint " + blueprintCommandWord);
    }
    int marks = num(item.get("marks"));
    if (marks != blueprintMarks) {
      issues.add("C2: marks " + marks + " != blueprint " + blueprintMarks);
    }

    if (!(item.get("mark_scheme") instanceof Map<?, ?> scheme)) {
      issues.add("C3: mark_scheme missing");
    } else if ("POINTS".equalsIgnoreCase(str(scheme.get("scheme_type")))) {
      int sum = 0;
      int count = 0;
      if (scheme.get("marking_points") instanceof List<?> points) {
        for (Object o : points) {
          if (o instanceof Map<?, ?> p) {
            sum += num(p.get("marks"));
            count++;
          }
        }
      }
      if (count == 0) {
        issues.add("C3: no marking points");
      } else if (sum != blueprintMarks) {
        issues.add("C3: marking points sum to " + sum + ", item is worth " + blueprintMarks);
      }
    }

    if ("MULTIPLE_CHOICE".equalsIgnoreCase(type)) {
      int options = 0;
      int correct = 0;
      if (item.get("options") instanceof List<?> list) {
        for (Object o : list) {
          if (o instanceof Map<?, ?> opt) {
            options++;
            if (Boolean.TRUE.equals(opt.get("correct"))) {
              correct++;
            }
          }
        }
      }
      if (options != 4 || correct != 1) {
        issues.add("C4: MCQ needs 4 options with exactly one correct (got " + options + "/" + correct + ")");
      }
    }
    return issues;
  }

  private static String str(Object o) {
    return o == null ? "" : String.valueOf(o).trim();
  }

  private static int num(Object o) {
    if (o instanceof Number n) {
      return n.intValue();
    }
    try {
      return o == null ? -1 : Integer.parseInt(o.toString().trim());
    } catch (NumberFormatException e) {
      return -1;
    }
  }
}
