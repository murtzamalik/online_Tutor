package com.karsaaz.studyloop.marking.application;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Turns schema-validated marker output into marks computed by code (D-26): every point is clamped to
 * [0, max], the total is the sum, capped at the question's marks. Anything the model got
 * inconsistent becomes a flag, and any flag sends the answer to the exception queue.
 */
public final class AiMarkParser {
  /** Internal flags added by code (model flags come from the schema enum). */
  public static final String TOTAL_MISMATCH = "TOTAL_MISMATCH";
  public static final String EVIDENCE_NOT_IN_ANSWER = "EVIDENCE_NOT_IN_ANSWER";
  public static final String POINT_OVER_MAX = "POINT_OVER_MAX";

  public record Parsed(
      BigDecimal marks,
      double confidence,
      List<Map<String, Object>> points,
      List<String> flags,
      boolean cannotComplete) {}

  private AiMarkParser() {}

  /** P-MK-01 / P-MK-02 ({@code marking_result} schema). */
  public static Parsed points(Map<String, Object> result, int marksAvailable, String answerText) {
    if (cannotComplete(result)) {
      return new Parsed(BigDecimal.ZERO, 0.0, List.of(), List.of(), true);
    }
    List<String> flags = new ArrayList<>(stringList(result.get("flags")));
    List<Map<String, Object>> points = new ArrayList<>();
    int total = 0;
    for (Map<String, Object> p : mapList(result.get("points"))) {
      int max = Math.max(0, intOf(p.get("max"), 0));
      int awarded = intOf(p.get("awarded"), 0);
      if (awarded > max) {
        addOnce(flags, POINT_OVER_MAX);
      }
      awarded = Math.max(0, Math.min(awarded, max));
      String evidence = p.get("evidence") == null ? "" : String.valueOf(p.get("evidence"));
      if (awarded > 0 && !evidenceInAnswer(evidence, answerText)) {
        addOnce(flags, EVIDENCE_NOT_IN_ANSWER);
      }
      total += awarded;
      Map<String, Object> point = new LinkedHashMap<>();
      point.put("id", String.valueOf(p.get("id")));
      point.put("awarded", awarded);
      point.put("max", max);
      point.put("evidence", evidence);
      point.put("reason", p.get("reason") == null ? "" : String.valueOf(p.get("reason")));
      points.add(point);
    }
    Object modelTotal = result.get("total_marks");
    if (modelTotal instanceof Number n && n.intValue() != total) {
      addOnce(flags, TOTAL_MISMATCH);
    }
    int capped = Math.max(0, Math.min(total, marksAvailable));
    return new Parsed(BigDecimal.valueOf(capped), confidenceOf(result), points, flags, false);
  }

  /** P-MK-04 ({@code alevel_marking_result} schema): total is the sum of the marking trail. */
  public static Parsed aLevel(Map<String, Object> result, int marksAvailable) {
    if (cannotComplete(result)) {
      return new Parsed(BigDecimal.ZERO, 0.0, List.of(), List.of(), true);
    }
    List<String> flags = new ArrayList<>(stringList(result.get("flags")));
    List<Map<String, Object>> trail = new ArrayList<>();
    int sum = 0;
    for (Map<String, Object> step : mapList(result.get("marking_trail"))) {
      int marks = Math.max(0, intOf(step.get("marks"), 0));
      sum += marks;
      Map<String, Object> s = new LinkedHashMap<>();
      s.put("step", String.valueOf(step.get("step")));
      s.put("ao", String.valueOf(step.get("ao")));
      s.put("evidence", step.get("evidence") == null ? "" : String.valueOf(step.get("evidence")));
      s.put("credit", step.get("credit") == null ? "" : String.valueOf(step.get("credit")));
      s.put("marks", marks);
      trail.add(s);
    }
    int provisional = intOf(result.get("provisional_marks"), 0);
    int total = trail.isEmpty() ? provisional : sum;
    if (!trail.isEmpty() && provisional != sum) {
      addOnce(flags, TOTAL_MISMATCH);
    }
    int capped = Math.max(0, Math.min(total, marksAvailable));
    return new Parsed(BigDecimal.valueOf(capped), confidenceOf(result), trail, flags, false);
  }

  static boolean cannotComplete(Map<String, Object> result) {
    return result == null || "cannot_complete".equalsIgnoreCase(String.valueOf(result.get("status")));
  }

  /** Missing or invalid confidence counts as no confidence — it must never pass as "high". */
  static double confidenceOf(Map<String, Object> result) {
    Object c = result.get("confidence");
    if (c instanceof Number n) {
      double d = n.doubleValue();
      return Double.isNaN(d) ? 0.0 : Math.max(0.0, Math.min(1.0, d));
    }
    return 0.0;
  }

  /** Evidence must be a quote from the answer (case and whitespace insensitive), or empty. */
  static boolean evidenceInAnswer(String evidence, String answer) {
    String e = normalise(evidence);
    if (e.isEmpty()) {
      return false;
    }
    return normalise(answer).contains(e);
  }

  private static String normalise(String s) {
    return s == null ? "" : s.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
  }

  private static void addOnce(List<String> flags, String flag) {
    if (!flags.contains(flag)) {
      flags.add(flag);
    }
  }

  private static int intOf(Object v, int dflt) {
    if (v instanceof Number n) {
      return (int) Math.round(n.doubleValue());
    }
    if (v != null) {
      try {
        return (int) Math.round(Double.parseDouble(v.toString().trim()));
      } catch (NumberFormatException ignored) {
        // fall through
      }
    }
    return dflt;
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> mapList(Object v) {
    List<Map<String, Object>> out = new ArrayList<>();
    if (v instanceof List<?> list) {
      for (Object o : list) {
        if (o instanceof Map<?, ?> m) {
          out.add((Map<String, Object>) m);
        }
      }
    }
    return out;
  }

  private static List<String> stringList(Object v) {
    List<String> out = new ArrayList<>();
    if (v instanceof List<?> list) {
      for (Object o : list) {
        if (o != null && !String.valueOf(o).isBlank() && !"NONE".equalsIgnoreCase(String.valueOf(o))) {
          out.add(String.valueOf(o));
        }
      }
    }
    return out;
  }
}
