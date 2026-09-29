package com.karsaaz.studyloop.marking.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ALevelProvisionalRouterTest {
  @Test
  void queuesOnlyWhenFlagOnAndALevel() {
    assertThat(ALevelProvisionalRouter.shouldQueueForReview(true, "A_LEVEL")).isTrue();
    assertThat(ALevelProvisionalRouter.shouldQueueForReview(false, "A_LEVEL")).isFalse();
    assertThat(ALevelProvisionalRouter.shouldQueueForReview(true, "GCSE")).isFalse();
  }

  @Test
  void provisionalStatusAndSla() {
    assertThat(ALevelProvisionalRouter.provisionalStatus()).isEqualTo("MARKED_PROVISIONAL");
    assertThat(ALevelProvisionalRouter.defaultSlaHours()).isEqualTo(48);
  }
}
