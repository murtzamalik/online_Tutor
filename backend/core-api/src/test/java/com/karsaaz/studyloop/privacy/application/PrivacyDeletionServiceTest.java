package com.karsaaz.studyloop.privacy.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.junit.jupiter.api.Test;

class PrivacyDeletionServiceTest {
  @Test
  void coolOffSchedulesFourteenDaysByDefault() {
    Instant now = Instant.parse("2026-09-29T12:00:00Z");
    assertThat(PrivacyDeletionService.scheduledFor(now, 14))
        .isEqualTo(now.plus(14, ChronoUnit.DAYS));
  }

  @Test
  void canCancelDuringCoolOffOnly() {
    Instant now = Instant.parse("2026-09-29T12:00:00Z");
    Instant scheduled = now.plus(14, ChronoUnit.DAYS);
    assertThat(PrivacyDeletionService.canCancel("COOLING_OFF", now, scheduled)).isTrue();
    assertThat(PrivacyDeletionService.canCancel("COOLING_OFF", scheduled.plusSeconds(1), scheduled))
        .isFalse();
    assertThat(PrivacyDeletionService.canCancel("COMPLETED", now, scheduled)).isFalse();
  }
}
