package com.karsaaz.studyloop.learning.entrance.domain;

/**
 * D-04 lock-down rules for 11+ entrance tests: no skip, no back, quota end.
 * Pure code — unit-tested without Spring.
 */
public final class EntranceLockRules {
  private EntranceLockRules() {}

  public static boolean allowsSkip() {
    return false;
  }

  public static boolean allowsBack() {
    return false;
  }

  public static boolean isComplete(int answeredCount, int quotaItems) {
    if (quotaItems <= 0) {
      throw new IllegalArgumentException("quotaItems must be positive");
    }
    return answeredCount >= quotaItems;
  }

  public static void assertAnswerForwardOnly(int previousAnswered, int attemptedIndex) {
    if (attemptedIndex != previousAnswered) {
      throw new IllegalStateException("NO_BACK: answers must be sequential; no revisit");
    }
  }

  public static void assertNotSkipped(boolean answerPresent) {
    if (!answerPresent) {
      throw new IllegalStateException("NO_SKIP: an answer is required");
    }
  }
}
