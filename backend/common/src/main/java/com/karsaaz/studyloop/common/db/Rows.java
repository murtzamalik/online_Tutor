package com.karsaaz.studyloop.common.db;

import java.util.LinkedHashMap;
import java.util.Map;

/** Row maps for JDBC results. Unlike {@code Map.of}, nullable columns are allowed (Map.of throws on null). */
public final class Rows {
  private Rows() {}

  /** Key/value pairs, in order: {@code Rows.of("id", id, "dueAt", maybeNull)}. */
  public static Map<String, Object> of(Object... keyValues) {
    if (keyValues.length % 2 != 0) {
      throw new IllegalArgumentException("Rows.of needs key/value pairs");
    }
    Map<String, Object> m = new LinkedHashMap<>();
    for (int i = 0; i < keyValues.length; i += 2) {
      m.put((String) keyValues[i], keyValues[i + 1]);
    }
    return m;
  }
}
