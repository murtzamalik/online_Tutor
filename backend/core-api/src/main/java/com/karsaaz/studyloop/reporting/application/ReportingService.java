package com.karsaaz.studyloop.reporting.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportingService {
  private static final Logger log = LoggerFactory.getLogger(ReportingService.class);

  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;

  public ReportingService(
      JdbcTemplate jdbc, StudentAccessHelper access, GatewayClient gateway, GatewayAiSupport ai) {
    this.jdbc = jdbc;
    this.access = access;
    this.gateway = gateway;
    this.ai = ai;
  }

  public List<Map<String, Object>> getNotificationPreferences(AccountPrincipal principal) {
    access.requireParent(principal);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT channel, kind, enabled FROM notification_preference WHERE account_id = ?
        ORDER BY channel, kind
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("channel", rs.getString("channel"));
          m.put("kind", rs.getString("kind"));
          m.put("enabled", rs.getBoolean("enabled"));
          return m;
        },
        principal.accountId());
    if (items.isEmpty()) {
      return List.of(
          Map.of("channel", "EMAIL", "kind", "WEEKLY_REPORT", "enabled", true),
          Map.of("channel", "EMAIL", "kind", "ALERT", "enabled", true),
          Map.of("channel", "IN_APP", "kind", "BILLING", "enabled", true),
          Map.of("channel", "IN_APP", "kind", "SAFEGUARDING", "enabled", true));
    }
    return items;
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public List<Map<String, Object>> putNotificationPreferences(AccountPrincipal principal, Map<String, Object> body) {
    access.requireParent(principal);
    List<Map<String, Object>> prefs = body.get("items") instanceof List<?> list
        ? (List<Map<String, Object>>) list : List.of(body);
    for (Map<String, Object> p : prefs) {
      if (p.get("channel") == null || p.get("kind") == null) continue;
      boolean enabled = !Boolean.FALSE.equals(p.get("enabled"));
      jdbc.update(
          """
          INSERT INTO notification_preference (account_id, channel, kind, enabled)
          VALUES (?, ?, ?, ?)
          ON CONFLICT (account_id, channel, kind) DO UPDATE SET enabled = EXCLUDED.enabled
          """,
          principal.accountId(), p.get("channel").toString(), p.get("kind").toString(), enabled);
    }
    return getNotificationPreferences(principal);
  }

  public Map<String, Object> parentHome(AccountPrincipal principal) {
    access.requireParent(principal);
    List<Map<String, Object>> children = jdbc.query(
        """
        SELECT s.student_id, s.display_name, s.year_group, s.age_band, s.status
        FROM student_profile s
        JOIN parent_student_link l ON l.student_id = s.student_id
        WHERE l.parent_account_id = ?
        ORDER BY s.display_name
        """,
        (rs, i) -> {
          UUID sid = (UUID) rs.getObject("student_id");
          Map<String, Object> m = new HashMap<>();
          m.put("studentId", sid.toString());
          m.put("displayName", rs.getString("display_name"));
          m.put("yearGroup", rs.getString("year_group"));
          m.put("ageBand", rs.getString("age_band"));
          m.put("status", rs.getString("status"));
          Long alerts = jdbc.queryForObject(
              "SELECT COUNT(*) FROM alert WHERE student_id = ? AND status = 'NEW'", Long.class, sid);
          m.put("openAlerts", alerts);
          return m;
        },
        principal.accountId());
    return Map.of("children", children);
  }

  public Map<String, Object> actionPlan(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    List<Map<String, Object>> weak = jdbc.query(
        """
        SELECT m.topic_id, m.mastery_probability, m.mastery_level, t.topic_name, t.topic_number
        FROM mastery_state m JOIN spec_topic t ON t.topic_id = m.topic_id
        WHERE m.student_id = ? ORDER BY m.mastery_probability ASC NULLS LAST LIMIT 5
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("topicId", rs.getLong(1));
          m.put("pKnow", rs.getBigDecimal(2));
          m.put("level", rs.getShort(3));
          m.put("topicName", rs.getString(4));
          m.put("topicNumber", rs.getString(5));
          return m;
        },
        studentId);
    String weakest = weak.isEmpty() ? null : String.valueOf(weak.get(0).get("topicName"));
    boolean allMastered = !weak.isEmpty() && ((Number) weak.get(0).get("level")).intValue() >= 3;
    List<String> actions = weakest == null
        ? List.of("Start with a short practice session to find the starting point", "Review the mark scheme on any wrong answer")
        : allMastered
            ? List.of("Try a mixed set across all topics to keep them fresh", "Add a new topic or subject when ready")
            : List.of("Practise “" + weakest + "” for 15 minutes", "Review the mark scheme on the last wrong answer");
    return Map.of("studentId", studentId.toString(), "focusTopics", weak, "actions", actions);
  }

  public Map<String, Object> alerts(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT alert_id, kind, severity, message, status, created_at FROM alert
        WHERE student_id = ? ORDER BY created_at DESC LIMIT 50
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("alertId", rs.getObject(1).toString());
          m.put("kind", rs.getString(2));
          m.put("severity", rs.getString(3));
          m.put("message", rs.getString(4));
          m.put("status", rs.getString(5));
          m.put("createdAt", rs.getTimestamp(6));
          return m;
        },
        studentId);
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> ackAlert(AccountPrincipal principal, UUID alertId) {
    access.requireParent(principal);
    int n = jdbc.update(
        """
        UPDATE alert SET status = 'ACK' WHERE alert_id = ? AND student_id IN (
          SELECT student_id FROM parent_student_link WHERE parent_account_id = ?)
        """,
        alertId, principal.accountId());
    if (n == 0) throw AppException.notFound("Alert not found");
    return Map.of("alertId", alertId.toString(), "status", "ACK");
  }

  public Map<String, Object> weeklyList(AccountPrincipal principal, UUID studentId) {
    access.assertParentOrStudent(principal, studentId);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT report_id, week_start, created_at FROM weekly_report
        WHERE student_id = ? ORDER BY week_start DESC LIMIT 12
        """,
        (rs, i) -> Rows.of(
            "reportId", rs.getObject(1).toString(),
            "weekStart", rs.getDate(2).toString(),
            "createdAt", rs.getTimestamp(3).toString()),
        studentId);
    return Map.of("items", items);
  }

  public Map<String, Object> weeklyOne(AccountPrincipal principal, UUID studentId, UUID reportId) {
    access.assertParentOrStudent(principal, studentId);
    return jdbc.query(
        "SELECT report_id, week_start, facts_json, parent_text_md, student_text_md FROM weekly_report WHERE report_id = ? AND student_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Report not found");
          boolean parent = StudentAccessHelper.hasParentRole(principal.roles());
          Map<String, Object> m = new HashMap<>();
          m.put("reportId", rs.getObject(1).toString());
          m.put("weekStart", rs.getDate(2).toString());
          m.put("stats", rs.getString(3));
          m.put("narrative", parent ? rs.getString(4) : rs.getString(5));
          return m;
        },
        reportId, studentId);
  }

  public Map<String, Object> notifications(AccountPrincipal principal) {
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT notification_id, kind, title, body, read_at, created_at FROM notification
        WHERE recipient_account_id = ? OR recipient_student_id = ?
        ORDER BY created_at DESC LIMIT 50
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("notificationId", rs.getObject(1).toString());
          m.put("kind", rs.getString(2));
          m.put("title", rs.getString(3));
          m.put("body", rs.getString(4));
          m.put("readAt", rs.getTimestamp(5));
          m.put("createdAt", rs.getTimestamp(6));
          return m;
        },
        principal.accountId(), principal.studentId());
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> markRead(AccountPrincipal principal, UUID notificationId) {
    jdbc.update(
        """
        UPDATE notification SET read_at = now()
        WHERE notification_id = ? AND (recipient_account_id = ? OR recipient_student_id = ?)
        """,
        notificationId, principal.accountId(), principal.studentId());
    return Map.of("notificationId", notificationId.toString(), "read", true);
  }

  @Transactional
  public Map<String, Object> markAllRead(AccountPrincipal principal) {
    int n = jdbc.update(
        """
        UPDATE notification SET read_at = now()
        WHERE read_at IS NULL AND (recipient_account_id = ? OR recipient_student_id = ?)
        """,
        principal.accountId(), principal.studentId());
    return Map.of("updated", n);
  }

  @Transactional
  public Map<String, Object> registerDevice(AccountPrincipal principal, Map<String, Object> body) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO device_registration (device_id, account_id, student_id, onesignal_id, platform)
        VALUES (?,?,?,?,?)
        """,
        id, principal.accountId(), principal.studentId(),
        body.getOrDefault("onesignalId", "dev").toString(),
        body.getOrDefault("platform", "WEB").toString());
    return Map.of("deviceId", id.toString());
  }

  /** RPT-13 (SYS / owner). The scheduled job calls {@link #runWeeklyReports()} directly. */
  public Map<String, Object> runWeeklyReports(AccountPrincipal principal) {
    if (principal == null
        || (!principal.roles().contains("SYS") && !StudentAccessHelper.hasOwnerRole(principal.roles()))) {
      throw AppException.forbidden("System access required");
    }
    return runWeeklyReports();
  }

  /**
   * One report per active student for last week. Each student commits on its own, so one AI failure
   * does not roll back the others; the code-written fallback text is used and the failure is logged.
   */
  public Map<String, Object> runWeeklyReports() {
    LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).minusWeeks(1);
    List<UUID> students = jdbc.query(
        "SELECT student_id FROM student_profile WHERE status = 'ACTIVE'",
        (rs, i) -> (UUID) rs.getObject(1));
    int created = 0;
    int aiFailures = 0;
    for (UUID sid : students) {
      Integer exists = jdbc.queryForObject(
          "SELECT COUNT(*) FROM weekly_report WHERE student_id = ? AND week_start = ?",
          Integer.class, sid, Date.valueOf(weekStart));
      if (exists != null && exists > 0) continue;
      Map<String, Object> facts = weeklyFacts(sid, weekStart);
      int answered = ((Number) facts.get("answers")).intValue();
      String displayName = jdbc.query(
          "SELECT display_name FROM student_profile WHERE student_id = ?",
          rs -> rs.next() ? rs.getString(1) : null,
          sid);
      String narrativeParent = "This week: " + answered + " answers practised. Keep a steady cadence.";
      String narrativeStudent = "Nice work — you answered " + answered + " questions. Pick one weak topic next.";
      try {
        // Aggregates only (D-15): no name, id or free text goes to the model.
        Map<String, Object> vars = new HashMap<>();
        vars.put("facts", facts.get("items"));
        vars.put("goal_context", goalContext(sid));
        Map<String, Object> result = ai.requireResult(gateway.run("P-RP-01", vars, null), "P-RP-01");
        if (!GatewayAiSupport.cannotComplete(result)) {
          narrativeParent = withChildName(reportMarkdown(result), displayName);
        }
      } catch (Exception e) {
        aiFailures++;
        log.warn("Weekly report narrative failed for student {}: {}", sid, e.getClass().getSimpleName());
      }
      UUID reportId = UUID.randomUUID();
      jdbc.update(
          """
          INSERT INTO weekly_report (report_id, student_id, week_start, facts_json, parent_text_md, student_text_md)
          VALUES (?,?,?,?::jsonb,?,?)
          """,
          reportId, sid, Date.valueOf(weekStart),
          ai.toJson(facts),
          narrativeParent, narrativeStudent);
      UUID parentId = jdbc.query(
          "SELECT parent_account_id FROM parent_student_link WHERE student_id = ? LIMIT 1",
          rs -> rs.next() ? (UUID) rs.getObject(1) : null,
          sid);
      if (parentId != null) {
        jdbc.update(
            """
            INSERT INTO notification (notification_id, recipient_account_id, kind, title, body)
            VALUES (? ,?, 'WEEKLY_REPORT', 'Weekly report ready', 'Your child''s weekly report is ready to view.')
            """,
            UUID.randomUUID(), parentId);
      }
      created++;
    }
    return Map.of("created", created, "aiFailures", aiFailures, "weekStart", weekStart.toString());
  }

  /** Code-computed weekly facts; {@code items} carries the fact ids the narrative must cite. */
  private Map<String, Object> weeklyFacts(UUID sid, LocalDate weekStart) {
    Timestamp from = Timestamp.valueOf(weekStart.atStartOfDay());
    Timestamp to = Timestamp.valueOf(weekStart.plusWeeks(1).atStartOfDay());
    Map<String, Object> totals = jdbc.queryForMap(
        """
        SELECT COUNT(*) AS answers,
               COUNT(*) FILTER (WHERE is_correct) AS correct,
               COUNT(DISTINCT CAST(responded_at AS date)) AS active_days
        FROM student_response
        WHERE student_id = ? AND responded_at >= ? AND responded_at < ?
        """,
        sid, from, to);
    int answers = ((Number) totals.get("answers")).intValue();
    int correct = ((Number) totals.get("correct")).intValue();
    int activeDays = ((Number) totals.get("active_days")).intValue();
    List<String> topics = jdbc.query(
        """
        SELECT t.topic_name FROM student_response r
        JOIN question q ON q.question_id = r.question_id
        JOIN spec_topic t ON t.topic_id = q.topic_id
        WHERE r.student_id = ? AND r.responded_at >= ? AND r.responded_at < ?
        GROUP BY t.topic_name ORDER BY COUNT(*) DESC LIMIT 5
        """,
        (rs, i) -> rs.getString(1),
        sid, from, to);
    List<String> weakest = jdbc.query(
        """
        SELECT t.topic_name FROM mastery_state m JOIN spec_topic t ON t.topic_id = m.topic_id
        WHERE m.student_id = ? AND m.model_type = 'BKT'
        ORDER BY m.mastery_probability ASC LIMIT 3
        """,
        (rs, i) -> rs.getString(1),
        sid);
    List<Map<String, Object>> items = new java.util.ArrayList<>();
    items.add(Map.of("id", "F1", "fact", "answers_this_week", "value", answers));
    items.add(Map.of("id", "F2", "fact", "accuracy_percent", "value",
        answers == 0 ? 0L : Math.round(100.0 * correct / answers)));
    items.add(Map.of("id", "F3", "fact", "active_days", "value", activeDays));
    items.add(Map.of("id", "F4", "fact", "topics_practised", "value", topics));
    items.add(Map.of("id", "F5", "fact", "weakest_topics", "value", weakest));
    Map<String, Object> facts = new HashMap<>();
    facts.put("answers", answers);
    facts.put("correct", correct);
    facts.put("activeDays", activeDays);
    facts.put("items", items);
    return facts;
  }

  private Map<String, Object> goalContext(UUID sid) {
    Map<String, Object> goal = new HashMap<>();
    jdbc.query(
        """
        SELECT goal_type, target_grade, exam_date FROM student_enrolment
        WHERE student_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1
        """,
        rs -> {
          goal.put("goal_type", rs.getString("goal_type"));
          goal.put("target_grade", rs.getString("target_grade"));
          Date exam = rs.getDate("exam_date");
          // Relative days only — the model does not need the date itself.
          goal.put(
              "exam_in_days",
              exam == null ? null : java.time.temporal.ChronoUnit.DAYS.between(LocalDate.now(), exam.toLocalDate()));
        },
        sid);
    return goal;
  }

  /** Renders the {@code report_narrative} schema output as markdown. */
  static String reportMarkdown(Map<String, Object> result) {
    StringBuilder md = new StringBuilder();
    Object headline = result.get("headline");
    if (headline != null && !headline.toString().isBlank()) {
      md.append("## ").append(headline).append("\n\n");
    }
    if (result.get("paragraphs") instanceof List<?> paragraphs) {
      for (Object p : paragraphs) {
        md.append(p).append("\n\n");
      }
    }
    appendSection(md, "Wins", result.get("wins"));
    appendSection(md, "Focus areas", result.get("focus_areas"));
    appendSection(md, "How you can help", result.get("suggested_parent_actions"));
    return md.toString().trim();
  }

  private static void appendSection(StringBuilder md, String heading, Object items) {
    if (items instanceof List<?> list && !list.isEmpty()) {
      md.append("**").append(heading).append("**\n\n");
      for (Object o : list) {
        md.append("- ").append(o).append("\n");
      }
      md.append("\n");
    }
  }

  /** D-15: the model only ever sees {{child_name}}; the real name is filled in by code afterwards. */
  static String withChildName(String text, String displayName) {
    String name = displayName == null || displayName.isBlank() ? "Your child" : displayName;
    return text.replace("{{child_name}}", name);
  }

  public Map<String, Object> aiTranscripts(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT tutor_session_id, channel, mode, status, started_at, ended_at
        FROM tutor_session WHERE student_id = ?
        ORDER BY started_at DESC LIMIT 50
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("tutorSessionId", rs.getObject(1).toString());
          m.put("channel", rs.getString(2));
          m.put("mode", rs.getString(3));
          m.put("status", rs.getString(4));
          m.put("startedAt", rs.getTimestamp(5));
          m.put("endedAt", rs.getTimestamp(6));
          return m;
        },
        studentId);
    return Map.of("items", items);
  }

  public Map<String, Object> aiTranscript(AccountPrincipal principal, UUID studentId, UUID tutorSessionId) {
    access.assertParentOwns(principal, studentId);
    return jdbc.query(
        """
        SELECT m.seq, m.role, m.content_text, m.created_at
        FROM tutor_message m
        JOIN tutor_session t ON t.tutor_session_id = m.tutor_session_id
        WHERE t.tutor_session_id = ? AND t.student_id = ?
        ORDER BY m.seq
        """,
        rs -> {
          List<Map<String, Object>> msgs = new java.util.ArrayList<>();
          while (rs.next()) {
            msgs.add(Map.of(
                "seq", rs.getInt(1),
                "role", rs.getString(2),
                "text", rs.getString(3),
                "createdAt", rs.getTimestamp(4).toString()));
          }
          return Map.<String, Object>of("tutorSessionId", tutorSessionId.toString(), "messages", msgs);
        },
        tutorSessionId, studentId);
  }
}
