package com.karsaaz.studyloop.billing.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.security.SecureRandom;
import org.junit.jupiter.api.Test;

class ReferralCodesTest {
  @Test
  void generatesPrefixedCode() {
    String code = ReferralCodes.generate("SL", new SecureRandom());
    assertThat(code).startsWith("SL-");
    assertThat(code.length()).isGreaterThan(6);
  }

  @Test
  void rewardOnlyAfterPaidInvoice() {
    assertThat(ReferralCodes.rewardEligible("INVITED", true)).isFalse();
    assertThat(ReferralCodes.rewardEligible("SIGNED_UP", false)).isFalse();
    assertThat(ReferralCodes.rewardEligible("SIGNED_UP", true)).isTrue();
  }
}
