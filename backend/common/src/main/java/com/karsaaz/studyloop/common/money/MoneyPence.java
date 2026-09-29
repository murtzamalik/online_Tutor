package com.karsaaz.studyloop.common.money;

import java.util.Objects;

/** Monetary amount as integer pence + ISO currency. Never use floating point. */
public record MoneyPence(long amountPence, String currency) {
  public MoneyPence {
    Objects.requireNonNull(currency, "currency");
    if (currency.length() != 3) {
      throw new IllegalArgumentException("currency must be ISO-4217");
    }
  }

  public static MoneyPence gbp(long pence) {
    return new MoneyPence(pence, "GBP");
  }

  public MoneyPence plus(MoneyPence other) {
    if (!currency.equals(other.currency)) {
      throw new IllegalArgumentException("currency mismatch");
    }
    return new MoneyPence(Math.addExact(amountPence, other.amountPence), currency);
  }
}
