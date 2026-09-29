package com.karsaaz.studyloop.marking.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PassCompareTest {
  @Test
  void agreesWhenMarksAndConfidenceAlign() {
    PassCompare.Decision d = PassCompare.compare(
        BigDecimal.valueOf(3), 0.9, BigDecimal.valueOf(3), 0.88, BigDecimal.valueOf(4));
    assertThat(d.outcome()).isEqualTo(PassCompare.Outcome.AGREE);
  }

  @Test
  void flagsLowConfidence() {
    PassCompare.Decision d = PassCompare.compare(
        BigDecimal.valueOf(2), 0.65, BigDecimal.valueOf(2), 0.9, BigDecimal.valueOf(4));
    assertThat(d.outcome()).isEqualTo(PassCompare.Outcome.LOW_CONFIDENCE);
  }

  @Test
  void flagsPassDisagreementOnMarks() {
    PassCompare.Decision d = PassCompare.compare(
        BigDecimal.valueOf(1), 0.9, BigDecimal.valueOf(3), 0.9, BigDecimal.valueOf(4));
    assertThat(d.outcome()).isEqualTo(PassCompare.Outcome.PASS_DISAGREEMENT);
  }
}
