package com.karsaaz.studyloop.consent.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParentControlsService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;

  public ParentControlsService(JdbcTemplate jdbc, StudentAccessHelper access) {
    this.jdbc = jdbc;
    this.access = access;
  }

  public Map<String, Object> getAiControls(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    ensureControls(studentId);
    return jdbc.query(
        "SELECT chat_enabled, voice_enabled, daily_minutes_limit, quiet_hours_json, daily_goal_nudge FROM parent_ai_controls WHERE student_id = ?",
        rs -> {
          rs.next();
          Map<String, Object> m = new HashMap<>();
          m.put("chatEnabled", rs.getBoolean(1));
          m.put("voiceEnabled", rs.getBoolean(2));
          m.put("dailyMinutesLimit", rs.getObject(3));
          m.put("quietHours", rs.getString(4));
          m.put("dailyGoalNudge", rs.getBoolean(5));
          return m;
        },
        studentId);
  }

  @Transactional
  public Map<String, Object> putAiControls(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    access.assertParentOwns(principal, studentId);
    ensureControls(studentId);
    Boolean chat = body.get("chatEnabled") == null ? null : Boolean.TRUE.equals(body.get("chatEnabled"));
    Boolean voice = body.get("voiceEnabled") == null ? null : Boolean.TRUE.equals(body.get("voiceEnabled"));
    if (Boolean.TRUE.equals(voice)) {
      Integer c = jdbc.queryForObject(
          "SELECT COUNT(*) FROM voice_consent WHERE student_id = ? AND withdrawn_at IS NULL", Integer.class, studentId);
      if (c == null || c == 0) {
        throw AppException.badRequest("VOICE_CONSENT_REQUIRED", "Grant voice consent before enabling voice");
      }
    }
    jdbc.update(
        """
        UPDATE parent_ai_controls SET
          chat_enabled = COALESCE(?, chat_enabled),
          voice_enabled = COALESCE(?, voice_enabled),
          daily_minutes_limit = COALESCE(?, daily_minutes_limit),
          quiet_hours_json = COALESCE(?::jsonb, quiet_hours_json),
          daily_goal_nudge = COALESCE(?, daily_goal_nudge),
          updated_by = ?, updated_at = now()
        WHERE student_id = ?
        """,
        chat, voice,
        body.get("dailyMinutesLimit") == null ? null : ((Number) body.get("dailyMinutesLimit")).intValue(),
        body.get("quietHours") == null ? null : body.get("quietHours").toString(),
        body.get("dailyGoalNudge") == null ? null : Boolean.TRUE.equals(body.get("dailyGoalNudge")),
        principal.accountId(), studentId);
    return getAiControls(principal, studentId);
  }

  public Map<String, Object> getPrivacy(AccountPrincipal principal, UUID studentId) {
    access.assertParentOrStudent(principal, studentId);
    ensurePrivacy(studentId);
    return jdbc.query(
        "SELECT telemetry_level, cohort_benchmark_opt_in, teacher_visibility FROM privacy_settings WHERE student_id = ?",
        rs -> {
          rs.next();
          return Map.<String, Object>of(
              "telemetryLevel", rs.getString(1),
              "cohortBenchmarkOptIn", rs.getBoolean(2),
              "teacherVisibility", rs.getBoolean(3));
        },
        studentId);
  }

  @Transactional
  public Map<String, Object> putPrivacy(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    access.assertParentOwns(principal, studentId);
    ensurePrivacy(studentId);
    jdbc.update(
        """
        UPDATE privacy_settings SET
          telemetry_level = COALESCE(?, telemetry_level),
          cohort_benchmark_opt_in = COALESCE(?, cohort_benchmark_opt_in),
          teacher_visibility = COALESCE(?, teacher_visibility),
          updated_by = ?, updated_at = now()
        WHERE student_id = ?
        """,
        body.get("telemetryLevel") == null ? null : body.get("telemetryLevel").toString(),
        body.get("cohortBenchmarkOptIn") == null ? null : Boolean.TRUE.equals(body.get("cohortBenchmarkOptIn")),
        body.get("teacherVisibility") == null ? null : Boolean.TRUE.equals(body.get("teacherVisibility")),
        principal.accountId(), studentId);
    return getPrivacy(principal, studentId);
  }

  public Map<String, Object> aiUsage(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    Long chatTurns = jdbc.queryForObject(
        "SELECT COALESCE(SUM(turn_count),0) FROM tutor_session WHERE student_id = ? AND channel = 'CHAT'", Long.class, studentId);
    Long voiceSessions = jdbc.queryForObject(
        """
        SELECT COUNT(*) FROM voice_session v
        JOIN tutor_session t ON t.tutor_session_id = v.tutor_session_id
        WHERE t.student_id = ?
        """, Long.class, studentId);
    return Map.of("chatTurns", chatTurns, "voiceSessions", voiceSessions);
  }

  private void ensureControls(UUID studentId) {
    jdbc.update(
        """
        INSERT INTO parent_ai_controls (student_id) VALUES (?)
        ON CONFLICT (student_id) DO NOTHING
        """,
        studentId);
  }

  private void ensurePrivacy(UUID studentId) {
    jdbc.update(
        """
        INSERT INTO privacy_settings (student_id) VALUES (?)
        ON CONFLICT (student_id) DO NOTHING
        """,
        studentId);
  }
}
