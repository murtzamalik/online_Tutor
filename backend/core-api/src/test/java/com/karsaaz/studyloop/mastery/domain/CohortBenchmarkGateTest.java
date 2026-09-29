package com.karsaaz.studyloop.mastery.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CohortBenchmarkGateTest {
  @Test
  void requiresOptInAndSampleSize() {
    assertThat(CohortBenchmarkGate.canShow(false, 100, 50)).isFalse();
    assertThat(CohortBenchmarkGate.canShow(true, 49, 50)).isFalse();
    assertThat(CohortBenchmarkGate.canShow(true, 50, 50)).isTrue();
  }

  @Test
  void honestEmptyReasons() {
    assertThat(CohortBenchmarkGate.honestEmptyReason(false, 100, 50)).isEqualTo("NOT_OPTED_IN");
    assertThat(CohortBenchmarkGate.honestEmptyReason(true, 10, 50)).isEqualTo("SAMPLE_TOO_SMALL");
    assertThat(CohortBenchmarkGate.honestEmptyReason(true, 50, 50)).isEqualTo("AVAILABLE");
  }
}
