package com.karsaaz.studyloop.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.karsaaz.studyloop.support.MigrationPaths;
import com.karsaaz.studyloop.testkit.PostgresTestSupport;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class FlywayMigrateIT {
  @Container
  static PostgreSQLContainer<?> postgres = PostgresTestSupport.create();

  @Test
  void migratesCleanFromEmpty() {
    Flyway flyway = Flyway.configure()
        .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
        .locations(MigrationPaths.filesystemUri())
        .load();
    var result = flyway.migrate();
    assertThat(result.migrationsExecuted).isGreaterThanOrEqualTo(12);
    try (var conn = postgres.createConnection("")) {
      try (var st = conn.createStatement();
           var rs = st.executeQuery("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")) {
        rs.next();
        assertThat(rs.getInt(1)).isGreaterThan(100);
      }
    } catch (Exception e) {
      throw new AssertionError(e);
    }
  }
}
