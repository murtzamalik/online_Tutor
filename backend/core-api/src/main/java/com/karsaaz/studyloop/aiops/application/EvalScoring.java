package com.karsaaz.studyloop.aiops.application;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Compares an AI marking of a gold item with the examiner's per-point marks (D-19 KPI). */
public final class EvalScoring {
  private EvalScoring() {}

  public record ItemScore(int pointsAgreed, int pointsTotal, boolean exactTotal, boolean overMarked, boolean underMarked) {}

  /**
   * @param aiPoints parsed AI points ({@code id}, {@code awarded})
   * @param examinerPoints gold points; {@code awarded} when present, else {@code marks} (synthetic gold
   *     items store the full scheme, i.e. a full-marks answer)
   */
  public static ItemScore score(
      List<Map<String, Object>> aiPoints, BigDecimal aiTotal, List<Map<String, Object>> examinerPoints, BigDecimal examinerTotal) {
    Map<String, Integer> ai = new HashMap<>();
    for (Map<String, Object> p : aiPoints) {
      ai.put(String.valueOf(p.get("id")), intOf(p.get("awarded")));
    }
    int agreed = 0;
    for (Map<String, Object> p : examinerPoints) {
      Object v = p.containsKey("awarded") ? p.get("awarded") : p.get("marks");
      Integer mine = ai.get(String.valueOf(p.get("id")));
      if (mine != null && mine == intOf(v)) {
        agreed++;
      }
    }
    int cmp = aiTotal.compareTo(examinerTotal);
    return new ItemScore(agreed, examinerPoints.size(), cmp == 0, cmp > 0, cmp < 0);
  }

  private static int intOf(Object v) {
    if (v instanceof Number n) {
      return (int) Math.round(n.doubleValue());
    }
    try {
      return v == null ? 0 : (int) Math.round(Double.parseDouble(v.toString()));
    } catch (NumberFormatException e) {
      return 0;
    }
  }
}
