package com.karsaaz.studyloop.marking.application;

/** Pure routing for A-Level provisional marking when feature flag is on. */
public final class ALevelProvisionalRouter {
  private ALevelProvisionalRouter() {}

  public static boolean shouldQueueForReview(boolean aLevelReviewEnabled, String qualificationCode) {
    return aLevelReviewEnabled && "A_LEVEL".equalsIgnoreCase(qualificationCode);
  }

  public static String provisionalStatus() {
    return "MARKED_PROVISIONAL";
  }

  public static int defaultSlaHours() {
    return 48;
  }
}
