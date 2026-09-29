package com.karsaaz.studyloop.common.db;

import java.sql.Timestamp;
import java.time.Instant;

/** JDBC bind helper — PostgreSQL driver cannot infer Instant without an explicit SQL type. */
public final class SqlTime {
  private SqlTime() {}

  public static Timestamp ts(Instant instant) {
    return instant == null ? null : Timestamp.from(instant);
  }
}
