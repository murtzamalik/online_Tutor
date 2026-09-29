package com.karsaaz.studyloop.common.tracing;

import java.util.UUID;

public final class TraceIds {
  public static final String HEADER = "X-Correlation-Id";
  public static final String MDC_KEY = "correlationId";

  private TraceIds() {}

  public static String newId() {
    return UUID.randomUUID().toString();
  }
}
