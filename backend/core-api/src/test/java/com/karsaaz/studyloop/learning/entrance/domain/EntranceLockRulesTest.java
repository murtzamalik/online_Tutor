package com.karsaaz.studyloop.learning.entrance.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class EntranceLockRulesTest {
  @Test
  void neverAllowsSkipOrBack() {
    assertThat(EntranceLockRules.allowsSkip()).isFalse();
    assertThat(EntranceLockRules.allowsBack()).isFalse();
  }

  @Test
  void completesAtQuota() {
    assertThat(EntranceLockRules.isComplete(19, 20)).isFalse();
    assertThat(EntranceLockRules.isComplete(20, 20)).isTrue();
  }

  @Test
  void rejectsBackAndSkip() {
    assertThatThrownBy(() -> EntranceLockRules.assertAnswerForwardOnly(3, 2))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("NO_BACK");
    assertThatThrownBy(() -> EntranceLockRules.assertNotSkipped(false))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("NO_SKIP");
  }
}
