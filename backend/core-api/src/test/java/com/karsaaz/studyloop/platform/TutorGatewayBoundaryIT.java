package com.karsaaz.studyloop.platform;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.karsaaz.studyloop.support.MigrationPaths;
import com.karsaaz.studyloop.testkit.PostgresTestSupport;
import java.sql.DriverManager;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class TutorGatewayBoundaryIT {
  @Container
  static PostgreSQLContainer<?> postgres = PostgresTestSupport.create();

  @BeforeAll
  static void migrate() throws Exception {
    Flyway.configure()
        .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
        .locations(MigrationPaths.filesystemUri())
        .load()
        .migrate();
    try (var c = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
         var st = c.createStatement()) {
      st.execute(
          "DO $$ BEGIN "
              + "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_gateway_login') THEN "
              + "CREATE ROLE tutor_gateway_login LOGIN PASSWORD 'gw'; "
              + "END IF; END $$;");
      st.execute("GRANT tutor_gateway TO tutor_gateway_login");
    }
  }

  @Test
  void gatewayCannotSelectLearnerTables() throws Exception {
    try (var c = DriverManager.getConnection(postgres.getJdbcUrl(), "tutor_gateway_login", "gw");
         var st = c.createStatement()) {
      assertThatThrownBy(() -> st.executeQuery("SELECT * FROM student_profile"))
          .isInstanceOf(Exception.class);
      assertThatThrownBy(() -> st.executeQuery("SELECT * FROM account"))
          .isInstanceOf(Exception.class);
      st.executeQuery("SELECT 1 FROM prompt_version LIMIT 1").close();
    }
  }

  /** V012's default privileges leaked SELECT on later tables (V017 billing) until V020. */
  @Test
  void gatewayCannotSelectTablesAddedAfterV012() throws Exception {
    try (var c = DriverManager.getConnection(postgres.getJdbcUrl(), "tutor_gateway_login", "gw");
         var st = c.createStatement()) {
      assertThatThrownBy(() -> st.executeQuery("SELECT * FROM micro_subscription"))
          .isInstanceOf(Exception.class);
      st.executeUpdate("DELETE FROM ai_gateway_payload WHERE expires_at < now()");
    }
  }
}
