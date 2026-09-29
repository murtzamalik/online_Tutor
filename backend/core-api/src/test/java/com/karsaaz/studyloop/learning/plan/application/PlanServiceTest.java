package com.karsaaz.studyloop.learning.plan.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PlanServiceTest {
  @Test
  void weekStartsOnMonday() {
    assertThat(PlanService.weekStartFor(LocalDate.of(2026, 9, 29))).isEqualTo(LocalDate.of(2026, 9, 28));
  }

  @Test
  void totalPlanMinutesIsCodeOwned() {
    short[] minutes = {20, 10, 15, 25, 15, 20, 45};
    assertThat(PlanService.totalPlanMinutes(minutes)).isEqualTo(150);
  }
}
