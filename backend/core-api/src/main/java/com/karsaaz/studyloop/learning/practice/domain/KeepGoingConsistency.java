package com.karsaaz.studyloop.learning.practice.domain;

/**
 * D-10 keep-going consistency: stop when rolling window meets threshold (or fatigue).
 */
public final class KeepGoingConsistency {
  private KeepGoingConsistency() {}

  /**
   * @param recentCorrect ordered oldest→newest boolean correctness in the window
   * @param windowSize required consecutive answers considered
   * @param minPct minimum correct percentage in window (e.g. 80)
   */
  public static boolean meetsThreshold(boolean[] recentCorrect, int windowSize, int minPct) {
    if (windowSize <= 0 || minPct < 0 || minPct > 100) {
      throw new IllegalArgumentException("invalid threshold config");
    }
    if (recentCorrect == null || recentCorrect.length < windowSize) {
      return false;
    }
    int correct = 0;
    int from = recentCorrect.length - windowSize;
    for (int i = from; i < recentCorrect.length; i++) {
      if (recentCorrect[i]) {
        correct++;
      }
    }
    int pct = (correct * 100) / windowSize;
    return pct >= minPct;
  }

  public static boolean shouldStopForFatigue(int consecutiveIncorrect, int fatigueLimit) {
    return consecutiveIncorrect >= Math.max(1, fatigueLimit);
  }
}
