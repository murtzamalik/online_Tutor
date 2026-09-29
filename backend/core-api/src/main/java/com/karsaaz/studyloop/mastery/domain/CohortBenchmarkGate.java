package com.karsaaz.studyloop.mastery.domain;

/**
 * H-07 cohort benchmark visibility gate: opted-in AND sample size ≥ min (default 50).
 */
public final class CohortBenchmarkGate {
  public static final int DEFAULT_MIN_SAMPLE = 50;

  private CohortBenchmarkGate() {}

  public static boolean canShow(boolean optedIn, int sampleSize, int minSampleSize) {
    int min = minSampleSize > 0 ? minSampleSize : DEFAULT_MIN_SAMPLE;
    return optedIn && sampleSize >= min;
  }

  public static String honestEmptyReason(boolean optedIn, int sampleSize, int minSampleSize) {
    int min = minSampleSize > 0 ? minSampleSize : DEFAULT_MIN_SAMPLE;
    if (!optedIn) {
      return "NOT_OPTED_IN";
    }
    if (sampleSize < min) {
      return "SAMPLE_TOO_SMALL";
    }
    return "AVAILABLE";
  }
}
