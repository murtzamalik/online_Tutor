package com.karsaaz.studyloop.billing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class EntitlementMathTest {
  @Test
  void previewAppliesSiblingAndVatInPence() {
    var preview = EntitlementMath.preview(
        List.of(
            new EntitlementMath.Line(1, 1, 3999),
            new EntitlementMath.Line(1, 1, 3999)),
        2, 10, 0, 20);
    assertThat(preview.subtotalPence()).isEqualTo(7998);
    assertThat(preview.siblingDiscountPence()).isEqualTo(799);
    assertThat(preview.vatPence()).isEqualTo(1439);
    assertThat(preview.totalPence()).isEqualTo(7199 + 1439);
  }

  @Test
  void grantsAccessDuringGrace() {
    assertThat(EntitlementMath.grantsAccess("PAST_DUE", false, true)).isTrue();
    assertThat(EntitlementMath.grantsAccess("PAST_DUE", false, false)).isFalse();
    assertThat(EntitlementMath.grantsAccess("TRIALING", false, false)).isTrue();
  }
}
