package com.karsaaz.studyloop.marking.application;

import java.math.BigDecimal;

public final class PassCompare {
  public enum Outcome { AGREE, LOW_CONFIDENCE, PASS_DISAGREEMENT }

  public record Decision(Outcome outcome, BigDecimal finalMarks, double confidence) {}

  private PassCompare() {}

  public static Decision compare(
      BigDecimal marksA,
      double confA,
      BigDecimal marksB,
      double confB,
      BigDecimal marksAvailable) {
    double minConf = Math.min(confA, confB);
    if (minConf < 0.70) {
      return new Decision(Outcome.LOW_CONFIDENCE, marksA, minConf);
    }
    if (marksA.subtract(marksB).abs().compareTo(new BigDecimal("0.5")) > 0
        || Math.abs(confA - confB) > 0.15) {
      return new Decision(Outcome.PASS_DISAGREEMENT, marksA, minConf);
    }
    return new Decision(Outcome.AGREE, marksA.max(marksB).min(marksAvailable), (confA + confB) / 2.0);
  }
}
