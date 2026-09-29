package com.karsaaz.studyloop.billing.domain;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/** Dunning state machine — child keeps access during grace (C-09). */
public final class DunningStateMachine {
  public enum Step {
    NONE,
    RETRY_1,
    RETRY_2,
    FINAL_NOTICE,
    GRACE_EXPIRED
  }

  private DunningStateMachine() {}

  public static Step next(Step current) {
    return switch (current) {
      case NONE -> Step.RETRY_1;
      case RETRY_1 -> Step.RETRY_2;
      case RETRY_2 -> Step.FINAL_NOTICE;
      case FINAL_NOTICE, GRACE_EXPIRED -> Step.GRACE_EXPIRED;
    };
  }

  public static Instant graceUntil(Instant failedAt, int graceDays) {
    return failedAt.plus(graceDays, ChronoUnit.DAYS);
  }

  public static boolean withinGrace(Instant graceUntil, Instant now) {
    return graceUntil != null && now.isBefore(graceUntil);
  }

  public static int stepNumber(Step step) {
    return switch (step) {
      case NONE -> 0;
      case RETRY_1 -> 1;
      case RETRY_2 -> 2;
      case FINAL_NOTICE -> 3;
      case GRACE_EXPIRED -> 4;
    };
  }

  public static Step fromNumber(int n) {
    return switch (n) {
      case 1 -> Step.RETRY_1;
      case 2 -> Step.RETRY_2;
      case 3 -> Step.FINAL_NOTICE;
      case 4 -> Step.GRACE_EXPIRED;
      default -> Step.NONE;
    };
  }
}
