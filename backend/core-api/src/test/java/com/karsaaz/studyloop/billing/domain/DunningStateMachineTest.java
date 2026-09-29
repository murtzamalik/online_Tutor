package com.karsaaz.studyloop.billing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class DunningStateMachineTest {
  @Test
  void advancesThroughRetriesThenExpires() {
    assertThat(DunningStateMachine.next(DunningStateMachine.Step.NONE))
        .isEqualTo(DunningStateMachine.Step.RETRY_1);
    assertThat(DunningStateMachine.next(DunningStateMachine.Step.FINAL_NOTICE))
        .isEqualTo(DunningStateMachine.Step.GRACE_EXPIRED);
  }

  @Test
  void graceWindow() {
    Instant failed = Instant.parse("2026-09-01T00:00:00Z");
    Instant grace = DunningStateMachine.graceUntil(failed, 14);
    assertThat(DunningStateMachine.withinGrace(grace, Instant.parse("2026-09-10T00:00:00Z"))).isTrue();
    assertThat(DunningStateMachine.withinGrace(grace, Instant.parse("2026-09-20T00:00:00Z"))).isFalse();
  }
}
