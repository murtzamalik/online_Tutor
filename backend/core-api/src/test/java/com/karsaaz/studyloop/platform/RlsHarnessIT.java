package com.karsaaz.studyloop.platform;

import static org.assertj.core.api.Assertions.assertThat;

import com.karsaaz.studyloop.support.MigrationPaths;
import com.karsaaz.studyloop.testkit.PostgresTestSupport;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
class RlsHarnessIT {
  @Container
  static PostgreSQLContainer<?> postgres = PostgresTestSupport.create();

  static UUID schoolA;
  static UUID schoolB;
  static UUID classA;

  @BeforeAll
  static void migrateAndSeed() throws Exception {
    Flyway.configure()
        .dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())
        .locations(MigrationPaths.filesystemUri())
        .load()
        .migrate();
    try (Connection c = DriverManager.getConnection(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
         var st = c.createStatement()) {
      st.execute(
          "DO $$ BEGIN "
              + "IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tutor_app_login') THEN "
              + "CREATE ROLE tutor_app_login LOGIN PASSWORD 'app'; "
              + "END IF; END $$;");
      st.execute("GRANT tutor_app TO tutor_app_login");
      schoolA = UUID.randomUUID();
      schoolB = UUID.randomUUID();
      classA = UUID.randomUUID();
      st.executeUpdate(
          "INSERT INTO school (school_id, name, status) VALUES ('" + schoolA + "', 'School A', 'ACTIVE')");
      st.executeUpdate(
          "INSERT INTO school (school_id, name, status) VALUES ('" + schoolB + "', 'School B', 'ACTIVE')");
      st.executeUpdate(
          "INSERT INTO school_class (class_id, school_id, name, academic_year) VALUES ('"
              + classA
              + "', '"
              + schoolA
              + "', '11A', '2026/27')");
    }
  }

  @Test
  void teacherOfSchoolACannotSeeSchoolBRows() throws Exception {
    String url = postgres.getJdbcUrl();
    try (Connection c = DriverManager.getConnection(url, "tutor_app_login", "app")) {
      c.setAutoCommit(false);
      try (var st = c.createStatement()) {
        st.execute("SET LOCAL app.school_id = '" + schoolA + "'");
        st.execute("SET LOCAL app.rls_bypass = 'off'");
        try (var rs = st.executeQuery("SELECT COUNT(*) FROM school_class")) {
          rs.next();
          assertThat(rs.getInt(1)).isEqualTo(1);
        }
        st.execute("SET LOCAL app.school_id = '" + schoolB + "'");
        try (var rs = st.executeQuery("SELECT COUNT(*) FROM school_class")) {
          rs.next();
          assertThat(rs.getInt(1)).isEqualTo(0);
        }
      }
      c.rollback();
    }
  }
}
