package com.karsaaz.studyloop.billing.domain;

import java.util.List;

/** Pure entitlement / pricing math — amounts in pence only. */
public final class EntitlementMath {
  private EntitlementMath() {}

  public record Line(long subjectId, long qualificationId, long unitPence) {}

  public record Preview(
      long subtotalPence,
      long siblingDiscountPence,
      long promoDiscountPence,
      long vatPence,
      long totalPence,
      int childCount,
      int subjectCount) {}

  public static Preview preview(
      List<Line> lines,
      int uniqueChildren,
      int siblingDiscountPct,
      int promoPercentOff,
      int vatPct) {
    long subtotal = 0;
    for (Line line : lines) {
      subtotal = Math.addExact(subtotal, line.unitPence());
    }
    long sibling = 0;
    if (uniqueChildren > 1 && siblingDiscountPct > 0) {
      sibling = (subtotal * siblingDiscountPct) / 100L;
    }
    long afterSibling = subtotal - sibling;
    long promo = 0;
    if (promoPercentOff > 0) {
      promo = (afterSibling * promoPercentOff) / 100L;
    }
    long net = afterSibling - promo;
    long vat = (net * vatPct) / 100L;
    return new Preview(subtotal, sibling, promo, vat, net + vat, uniqueChildren, lines.size());
  }

  public static boolean grantsAccess(String status, boolean cancelAtPeriodEnd, boolean withinGrace) {
    if ("ACTIVE".equals(status) || "TRIALING".equals(status)) {
      return true;
    }
    if ("PAST_DUE".equals(status) && withinGrace) {
      return true;
    }
    return false;
  }
}
