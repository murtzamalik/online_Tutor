package com.karsaaz.studyloop.common.id;

import java.util.UUID;

public final class Ids {
  private Ids() {}

  public static UUID newId() {
    return UUID.randomUUID();
  }

  public static UUID parse(String raw) {
    return UUID.fromString(raw);
  }
}
