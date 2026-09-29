package com.karsaaz.studyloop.mastery.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BktEngineTest {
  @Test
  void initialStateUsesPilotParams() {
    BktEngine.State s = BktEngine.initial();
    assertThat(s.masteryProbability()).isEqualTo(BktEngine.P_INIT);
    assertThat(s.masteryLevel()).isZero();
  }

  @Test
  void correctAnswerIncreasesMastery() {
    BktEngine.State after = BktEngine.update(BktEngine.P_INIT, true);
    assertThat(after.masteryProbability()).isGreaterThan(BktEngine.P_INIT);
  }

  @Test
  void incorrectAnswerDoesNotExceedOne() {
    BktEngine.State s = BktEngine.initial();
    for (int i = 0; i < 20; i++) {
      s = BktEngine.update(s.masteryProbability(), true);
    }
    assertThat(s.masteryProbability()).isLessThanOrEqualTo(1.0);
  }

  @Test
  void reviewDaysIncreaseWithLevel() {
    assertThat(BktEngine.reviewDaysForLevel(0)).isLessThan(BktEngine.reviewDaysForLevel(3));
  }
}
