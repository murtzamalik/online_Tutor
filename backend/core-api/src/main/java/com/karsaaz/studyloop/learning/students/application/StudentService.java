package com.karsaaz.studyloop.learning.students.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.identity.infra.PasswordHasher;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.Period;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StudentService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final PasswordHasher passwordHasher;
  private final Clock clock;
  private final SecureRandom random = new SecureRandom();

  public StudentService(
      JdbcTemplate jdbc, StudentAccessHelper access, PasswordHasher passwordHasher, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.passwordHasher = passwordHasher;
    this.clock = clock;
  }

  public List<Map<String, Object>> listChildren(AccountPrincipal principal) {
    access.requireParent(principal);
    return jdbc.query(
        """
        SELECT sp.student_id, sp.display_name, sp.year_group, sp.age_band, sp.visual_tier, sp.status,
               sp.avatar_key, sp.birth_month
        FROM student_profile sp
        JOIN parent_student_link psl ON psl.student_id = sp.student_id
        WHERE psl.parent_account_id = ?
        ORDER BY sp.created_at
        """,
        (rs, i) -> enrichStudentRow(rs),
        principal.accountId());
  }

  @Transactional
  public Map<String, Object> createChild(AccountPrincipal principal, Map<String, Object> req) {
    access.requireParent(principal);
    String status = jdbc.queryForObject(
        "SELECT status FROM account WHERE account_id = ?", String.class, principal.accountId());
    if (!"ACTIVE".equals(status)) {
      throw AppException.forbidden("Parent account must be verified");
    }
    String displayName = String.valueOf(req.get("displayName"));
    LocalDate birthMonth = req.get("birthMonth") != null
        ? LocalDate.parse(req.get("birthMonth").toString())
        : null;
    String yearGroup = req.get("yearGroup") != null ? req.get("yearGroup").toString() : null;
    String ageBand = computeAgeBand(birthMonth);
    UUID studentId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO student_profile (student_id, display_name, year_group, birth_month, age_band, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        """,
        studentId,
        displayName,
        yearGroup,
        birthMonth,
        ageBand);
    jdbc.update(
        "INSERT INTO parent_student_link (parent_account_id, student_id) VALUES (?, ?)",
        principal.accountId(),
        studentId);
    jdbc.update(
        "INSERT INTO daily_goal (student_id, target_questions) VALUES (?, 10) ON CONFLICT DO NOTHING",
        studentId);
    jdbc.update(
        "INSERT INTO privacy_settings (student_id) VALUES (?) ON CONFLICT DO NOTHING",
        studentId);
    jdbc.update(
        "INSERT INTO parent_ai_controls (student_id) VALUES (?) ON CONFLICT DO NOTHING",
        studentId);
    Map<String, Object> out = new HashMap<>();
    out.put("studentId", studentId);
    out.put("displayName", displayName);
    out.put("ageBand", ageBand);
    out.put("requiresUnder13Consent", "U13".equals(ageBand) && !hasUnder13Consent(studentId));
    return out;
  }

  @Transactional
  public Map<String, Object> setPicturePin(AccountPrincipal principal, UUID studentId, List<String> pictureKeys) {
    access.assertParentOwns(principal, studentId);
    if (pictureKeys == null || pictureKeys.size() < 3) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Picture sequence too short");
    }
    String joined = String.join("|", pictureKeys);
    String hash = passwordHasher.hash(joined.toCharArray());
    String handle = generateHandle(studentId);
    jdbc.update("DELETE FROM student_credential WHERE student_id = ?", studentId);
    jdbc.update(
        """
        INSERT INTO student_credential (credential_id, student_id, kind, secret_hash, login_handle)
        VALUES (?, ?, 'PICTURE_PIN', ?, ?)
        """,
        UUID.randomUUID(),
        studentId,
        hash,
        handle);
    return Map.of("studentId", studentId, "loginHandle", handle);
  }

  public Map<String, Object> getStudent(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudentOrTeacher(principal, sid);
    return jdbc.query(
        """
        SELECT student_id, display_name, year_group, age_band, visual_tier, status, avatar_key, birth_month
        FROM student_profile WHERE student_id = ?
        """,
        rs -> rs.next() ? enrichStudentRow(rs) : null,
        sid);
  }

  public List<Map<String, Object>> listEnrolments(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    return jdbc.query(
        """
        SELECT e.enrolment_id, e.specification_id, e.tier, e.goal_type, e.target_grade, e.exam_date, e.status,
               s.spec_code, s.title
        FROM student_enrolment e
        JOIN specification s ON s.specification_id = e.specification_id
        WHERE e.student_id = ? AND e.status <> 'ENDED'
        ORDER BY e.created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("specificationId", rs.getLong("specification_id"));
          m.put("specCode", rs.getString("spec_code"));
          m.put("title", rs.getString("title"));
          m.put("tier", rs.getString("tier"));
          m.put("goalType", rs.getString("goal_type"));
          m.put("targetGrade", rs.getString("target_grade"));
          m.put("examDate", rs.getDate("exam_date"));
          m.put("status", rs.getString("status"));
          return m;
        },
        sid);
  }

  @Transactional
  public Map<String, Object> createEnrolment(AccountPrincipal principal, UUID studentId, Map<String, Object> req) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    if (requiresUnder13Consent(sid)) {
      throw AppException.forbidden("Under-13 parental consent required before enrolment");
    }
    long specificationId = Long.parseLong(req.get("specificationId").toString());
    String tier = req.get("tier") != null ? req.get("tier").toString() : null;
    ensureComplimentaryEntitlement(sid, specificationId);
    UUID existing = jdbc.query(
        "SELECT enrolment_id FROM student_enrolment WHERE student_id = ? AND specification_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        sid,
        specificationId);
    UUID enrolmentId;
    if (existing != null) {
      jdbc.update(
          "UPDATE student_enrolment SET status = 'ACTIVE', tier = COALESCE(?, tier) WHERE enrolment_id = ?",
          tier,
          existing);
      enrolmentId = existing;
    } else {
      enrolmentId = UUID.randomUUID();
      jdbc.update(
          """
          INSERT INTO student_enrolment (enrolment_id, student_id, specification_id, tier, goal_type, status)
          VALUES (?, ?, ?, ?, 'EXAM_PREP', 'ACTIVE')
          """,
          enrolmentId,
          sid,
          specificationId,
          tier);
    }
    return Map.of("enrolmentId", enrolmentId, "studentId", sid, "specificationId", specificationId);
  }

  public Map<String, Object> home(AccountPrincipal principal, UUID studentId) {
    access.requireStudent(principal);
    UUID sid = access.resolveStudentId(principal, studentId);
    var goal = dailyGoalSummary(principal, sid);
    List<Map<String, Object>> due = jdbc.query(
        """
        SELECT topic_id, next_review_due_at FROM mastery_state
        WHERE student_id = ? AND next_review_due_at <= ? LIMIT 5
        """,
        (rs, i) -> Map.of("topicId", rs.getLong("topic_id"), "dueAt", rs.getTimestamp("next_review_due_at")),
        sid,
        clock.instant());
    return Map.of(
        "studentId", sid,
        "dailyGoal", goal,
        "reviewsDue", due,
        "continueSession", null);
  }

  public Map<String, Object> dailyGoal(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    return dailyGoalSummary(principal, sid);
  }

  @Transactional
  public Map<String, Object> patchStudent(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    access.assertParentOwns(principal, studentId);
    if (body.get("displayName") != null) {
      jdbc.update(
          "UPDATE student_profile SET display_name = ? WHERE student_id = ?",
          body.get("displayName").toString(),
          studentId);
    }
    if (body.get("yearGroup") != null) {
      jdbc.update(
          "UPDATE student_profile SET year_group = ? WHERE student_id = ?",
          body.get("yearGroup").toString(),
          studentId);
    }
    if (body.get("avatarKey") != null) {
      jdbc.update(
          "UPDATE student_profile SET avatar_key = ? WHERE student_id = ?",
          body.get("avatarKey").toString(),
          studentId);
    }
    return getStudent(principal, studentId);
  }

  @Transactional
  public Map<String, Object> patchEnrolment(
      AccountPrincipal principal, UUID enrolmentId, Map<String, Object> body) {
    UUID studentId = jdbc.query(
        "SELECT student_id FROM student_enrolment WHERE enrolment_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        enrolmentId);
    if (studentId == null) {
      throw AppException.notFound("Enrolment not found");
    }
    access.assertParentOrStudent(principal, studentId);
    if (body.get("goalType") != null) {
      jdbc.update(
          "UPDATE student_enrolment SET goal_type = ? WHERE enrolment_id = ?",
          body.get("goalType").toString(),
          enrolmentId);
    }
    if (body.get("targetGrade") != null) {
      access.assertParentOwns(principal, studentId);
      jdbc.update(
          "UPDATE student_enrolment SET target_grade = ? WHERE enrolment_id = ?",
          body.get("targetGrade").toString(),
          enrolmentId);
    }
    if (body.get("examDate") != null) {
      jdbc.update(
          "UPDATE student_enrolment SET exam_date = ?::date WHERE enrolment_id = ?",
          body.get("examDate").toString(),
          enrolmentId);
    }
    if (body.get("goalDetailJson") != null) {
      try {
        String json = body.get("goalDetailJson") instanceof String s
            ? s
            : new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(body.get("goalDetailJson"));
        jdbc.update(
            "UPDATE student_enrolment SET goal_detail_json = ?::jsonb WHERE enrolment_id = ?",
            json,
            enrolmentId);
      } catch (Exception e) {
        throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid goalDetailJson");
      }
    }
    return jdbc.query(
        """
        SELECT enrolment_id, student_id, specification_id, tier, goal_type, target_grade, exam_date, status
        FROM student_enrolment WHERE enrolment_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Enrolment not found");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("studentId", rs.getObject("student_id"));
          m.put("specificationId", rs.getLong("specification_id"));
          m.put("tier", rs.getString("tier"));
          m.put("goalType", rs.getString("goal_type"));
          m.put("targetGrade", rs.getString("target_grade"));
          m.put("examDate", rs.getDate("exam_date"));
          m.put("status", rs.getString("status"));
          return m;
        },
        enrolmentId);
  }

  @Transactional
  public Map<String, Object> putDailyGoal(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    short target = Short.parseShort(body.getOrDefault("targetQuestions", "10").toString());
    boolean enabled = body.get("enabled") == null || Boolean.TRUE.equals(body.get("enabled"))
        || "true".equalsIgnoreCase(String.valueOf(body.get("enabled")));
    jdbc.update(
        """
        INSERT INTO daily_goal (student_id, target_questions, enabled)
        VALUES (?, ?, ?)
        ON CONFLICT (student_id) DO UPDATE SET target_questions = EXCLUDED.target_questions,
          enabled = EXCLUDED.enabled, updated_at = now()
        """,
        sid,
        target,
        enabled);
    return dailyGoalSummary(principal, sid);
  }

  private Map<String, Object> dailyGoalSummary(AccountPrincipal principal, UUID sid) {
    LocalDate today = LocalDate.now(clock);
    return jdbc.query(
        """
        SELECT dg.target_questions, COALESCE(dgp.answered, 0) AS answered
        FROM daily_goal dg
        LEFT JOIN daily_goal_progress dgp ON dgp.student_id = dg.student_id AND dgp.day = ?
        WHERE dg.student_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return Map.of("target", 10, "answered", 0, "day", today);
          }
          return Map.of(
              "target", rs.getShort("target_questions"),
              "answered", rs.getShort("answered"),
              "day", today);
        },
        today,
        sid);
  }

  private void ensureComplimentaryEntitlement(UUID studentId, long specificationId) {
    var spec = jdbc.query(
        "SELECT qualification_id, subject_id FROM specification WHERE specification_id = ?",
        rs -> rs.next()
            ? Map.of("qualificationId", rs.getLong("qualification_id"), "subjectId", rs.getLong("subject_id"))
            : null,
        specificationId);
    if (spec == null) {
      throw AppException.notFound("Specification not found");
    }
    jdbc.update(
        """
        INSERT INTO entitlement (entitlement_id, student_id, subject_id, qualification_id, source, includes_mock_tests)
        VALUES (?, ?, ?, ?, 'COMPLIMENTARY', TRUE)
        ON CONFLICT (student_id, subject_id, qualification_id, source) DO NOTHING
        """,
        UUID.randomUUID(),
        studentId,
        spec.get("subjectId"),
        spec.get("qualificationId"));
  }

  private boolean requiresUnder13Consent(UUID studentId) {
    String band = jdbc.queryForObject(
        "SELECT age_band FROM student_profile WHERE student_id = ?", String.class, studentId);
    return "U13".equals(band) && !hasUnder13Consent(studentId);
  }

  private boolean hasUnder13Consent(UUID studentId) {
    Integer c = jdbc.queryForObject(
        """
        SELECT COUNT(*) FROM consent_record
        WHERE student_id = ? AND consent_type = 'UNDER13_DATA_PROCESSING' AND granted = TRUE AND withdrawn_at IS NULL
        """,
        Integer.class,
        studentId);
    return c != null && c > 0;
  }

  private String computeAgeBand(LocalDate birthMonth) {
    if (birthMonth == null) {
      return "U13";
    }
    int age = Period.between(birthMonth, LocalDate.now(clock)).getYears();
    if (age < 13) {
      return "U13";
    }
    if (age < 16) {
      return "13_15";
    }
    if (age < 18) {
      return "16_17";
    }
    return "18_PLUS";
  }

  private Map<String, Object> enrichStudentRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    UUID studentId = (UUID) rs.getObject("student_id");
    Map<String, Object> m = new HashMap<>();
    m.put("studentId", studentId);
    m.put("displayName", rs.getString("display_name"));
    m.put("yearGroup", rs.getString("year_group"));
    m.put("ageBand", rs.getString("age_band"));
    m.put("visualTier", rs.getShort("visual_tier"));
    m.put("status", rs.getString("status"));
    m.put("avatarKey", rs.getString("avatar_key"));
    m.put("requiresUnder13Consent", "U13".equals(rs.getString("age_band")) && !hasUnder13Consent(studentId));
    return m;
  }

  private String generateHandle(UUID studentId) {
    String suffix = String.format("%04d", random.nextInt(10000));
    return "learner-" + studentId.toString().substring(0, 4) + "-" + suffix;
  }

  public static String sha256Sequence(List<String> keys, String salt) {
    try {
      String payload = salt + "|" + String.join("|", keys);
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest(payload.getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }

  @Transactional
  public Map<String, Object> deleteEnrolment(AccountPrincipal principal, UUID enrolmentId) {
    access.requireParent(principal);
    UUID studentId = jdbc.query(
        "SELECT student_id FROM student_enrolment WHERE enrolment_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        enrolmentId);
    if (studentId == null) {
      throw AppException.notFound("Enrolment not found");
    }
    access.assertParentOwns(principal, studentId);
    jdbc.update(
        "UPDATE student_enrolment SET status = 'ENDED' WHERE enrolment_id = ?",
        enrolmentId);
    return Map.of("enrolmentId", enrolmentId, "status", "ENDED");
  }

  public Map<String, Object> accessibility(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    String json = jdbc.query(
        "SELECT accessibility_json::text FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getString(1) : "{}",
        sid);
    return Map.of("studentId", sid, "accessibilityJson", json == null ? "{}" : json);
  }
}
