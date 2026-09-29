package com.karsaaz.studyloop.mastery.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Bayesian Knowledge Tracing — deterministic mastery update (D-26). */
public final class BktEngine {
  public static final double P_INIT = 0.3;
  public static final double P_LEARN = 0.15;
  public static final double P_GUESS = 0.2;
  public static final double P_SLIP = 0.1;

  private BktEngine() {}

  public record State(double masteryProbability, int masteryLevel) {}

  public static State initial() {
    return new State(P_INIT, masteryLevelFromP(P_INIT));
  }

  public static State update(double priorMastery, boolean correct) {
    double p = clamp(priorMastery);
    double pKnow = p;
    double pNotKnow = 1.0 - p;
    double pObsGivenKnow = correct ? (1.0 - P_SLIP) : P_SLIP;
    double pObsGivenNotKnow = correct ? P_GUESS : (1.0 - P_GUESS);
    double numerator = pKnow * pObsGivenKnow;
    double denominator = numerator + pNotKnow * pObsGivenNotKnow;
    double posterior = denominator == 0 ? p : numerator / denominator;
    if (correct) {
      posterior = posterior + (1.0 - posterior) * P_LEARN;
    }
    posterior = clamp(posterior);
    return new State(posterior, masteryLevelFromP(posterior));
  }

  public static int masteryLevelFromP(double p) {
    if (p < 0.35) {
      return 0;
    }
    if (p < 0.55) {
      return 1;
    }
    if (p < 0.75) {
      return 2;
    }
    return 3;
  }

  public static int reviewDaysForLevel(int level) {
    return switch (level) {
      case 0 -> 1;
      case 1 -> 3;
      case 2 -> 7;
      default -> 14;
    };
  }

  public static double clamp(double p) {
    if (p < 0) {
      return 0;
    }
    if (p > 1) {
      return 1;
    }
    return p;
  }

  public static BigDecimal toDecimal(double p) {
    return BigDecimal.valueOf(p).setScale(4, RoundingMode.HALF_UP);
  }
}
