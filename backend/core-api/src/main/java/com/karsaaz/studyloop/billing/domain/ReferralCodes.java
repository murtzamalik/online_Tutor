package com.karsaaz.studyloop.billing.domain;

import java.security.SecureRandom;
import java.util.Locale;

/**
 * C-07 referral code generation from config prefix (no dark patterns).
 */
public final class ReferralCodes {
  private static final char[] ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();

  private ReferralCodes() {}

  public static String generate(String prefix, SecureRandom random) {
    String p = prefix == null || prefix.isBlank() ? "SL" : prefix.trim().toUpperCase(Locale.UK);
    StringBuilder sb = new StringBuilder(p);
    sb.append('-');
    for (int i = 0; i < 6; i++) {
      sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
    }
    return sb.toString();
  }

  /** Reward only after referee's first paid invoice — not on signup alone. */
  public static boolean rewardEligible(String referralStatus, boolean refereeHasPaidInvoice) {
    return "SIGNED_UP".equals(referralStatus) && refereeHasPaidInvoice;
  }
}
