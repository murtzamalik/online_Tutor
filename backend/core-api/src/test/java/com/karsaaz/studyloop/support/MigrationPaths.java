package com.karsaaz.studyloop.support;

import java.nio.file.Files;
import java.nio.file.Path;

public final class MigrationPaths {
  private MigrationPaths() {}

  public static String filesystemUri() {
    Path[] candidates = new Path[] {
        Path.of("db/migrations"),
        Path.of("../db/migrations"),
        Path.of("../../db/migrations"),
        Path.of("../../../db/migrations")
    };
    for (Path p : candidates) {
      if (Files.isDirectory(p)) {
        return "filesystem:" + p.toAbsolutePath().normalize();
      }
    }
    throw new IllegalStateException("Cannot locate db/migrations");
  }
}
