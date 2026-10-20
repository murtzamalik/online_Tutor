package com.karsaaz.studyloop.aiops.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class EvalScoringTest {

  @Test
  void comparesPerPointAndTotal() {
    var score =
        EvalScoring.score(
            List.of(Map.of("id", "M1", "awarded", 1), Map.of("id", "M2", "awarded", 1)),
            BigDecimal.valueOf(2),
            List.of(Map.of("id", "M1", "awarded", 1), Map.of("id", "M2", "awarded", 0)),
            BigDecimal.ONE);
    assertThat(score.pointsAgreed()).isEqualTo(1);
    assertThat(score.pointsTotal()).isEqualTo(2);
    assertThat(score.exactTotal()).isFalse();
    assertThat(score.overMarked()).isTrue();
  }

  @Test
  void syntheticGoldUsesSchemeMarksAsAwarded() {
    var score =
        EvalScoring.score(
            List.of(Map.of("id", "M1", "awarded", 2)),
            BigDecimal.valueOf(2),
            List.of(Map.of("id", "M1", "marks", 2, "point", "p")),
            BigDecimal.valueOf(2));
    assertThat(score.pointsAgreed()).isEqualTo(1);
    assertThat(score.exactTotal()).isTrue();
  }
}
