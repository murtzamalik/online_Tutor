package com.karsaaz.studyloop.testkit;

import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

public final class PostgresTestSupport {
  private static final DockerImageName IMAGE =
      DockerImageName.parse("pgvector/pgvector:pg16").asCompatibleSubstituteFor("postgres");

  private PostgresTestSupport() {}

  @SuppressWarnings("resource")
  public static PostgreSQLContainer<?> create() {
    return new PostgreSQLContainer<>(IMAGE)
        .withDatabaseName("studyloop")
        .withUsername("studyloop_owner")
        .withPassword("test_owner");
  }
}
