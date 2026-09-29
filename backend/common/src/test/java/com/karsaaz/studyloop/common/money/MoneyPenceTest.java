package com.karsaaz.studyloop.common.money;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class MoneyPenceTest {
  @Test
  void addsSameCurrency() {
    assertThat(MoneyPence.gbp(199).plus(MoneyPence.gbp(1)).amountPence()).isEqualTo(200L);
  }

  @Test
  void rejectsCurrencyMismatch() {
    assertThatThrownBy(() -> MoneyPence.gbp(1).plus(new MoneyPence(1, "USD")))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
