package com.karsaaz.studyloop.learning.practice.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class KeepGoingConsistencyTest {
  @Test
  void requiresFullWindow() {
    assertThat(KeepGoingConsistency.meetsThreshold(new boolean[] {true, true}, 5, 80)).isFalse();
  }

  @Test
  void meetsEightyPercentOfFive() {
    boolean[] recent = {true, true, true, true, false};
    assertThat(KeepGoingConsistency.meetsThreshold(recent, 5, 80)).isTrue();
    boolean[] weak = {true, true, false, false, false};
    assertThat(KeepGoingConsistency.meetsThreshold(weak, 5, 80)).isFalse();
  }

  @Test
  void fatigueStop() {
    assertThat(KeepGoingConsistency.shouldStopForFatigue(4, 4)).isTrue();
    assertThat(KeepGoingConsistency.shouldStopForFatigue(3, 4)).isFalse();
  }
}
