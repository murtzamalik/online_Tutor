package com.karsaaz.studyloop.common.time;

import java.time.Clock;

public final class Clocks {
  private Clocks() {}

  public static Clock utc() {
    return Clock.systemUTC();
  }
}
