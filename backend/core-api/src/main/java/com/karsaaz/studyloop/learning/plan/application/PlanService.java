package com.karsaaz.studyloop.learning.plan.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Weekly plan built in code from mastery/enrolment; AI may only write rationale text (no PII).
 */
@Service
public class PlanService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final GatewayClient gateway;
  private final Clock clock;

  public PlanService(JdbcTemplate jdbc, StudentAccessHelper access, GatewayClient gateway, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.gateway = gateway;
    this.clock = clock;
  }

  @Transactional
  public Map<String, Object> generate(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    UUID enrolmentId = body.get("enrolmentId") != null
        ? UUID.fromString(body.get("enrolmentId").toString())
        : jdbc.query(
            """
            SELECT enrolment_id FROM student_enrolment
            WHERE student_id = ? AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1
            """,
            rs -> rs.next() ? (UUID) rs.getObject(1) : null,
            sid);
    if (enrolmentId == null) {
      throw AppException.notFound("No active enrolment");
    }
    LocalDate weekStart = LocalDate.now(clock).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    jdbc.update(
        "UPDATE weekly_plan SET status = 'SUPERSEDED' WHERE student_id = ? AND enrolment_id = ? AND status = 'ACTIVE'",
        sid,
        enrolmentId);
    UUID planId = UUID.randomUUID();
    List<Map<String, Object>> weakTopics = jdbc.query(
        """
        SELECT t.topic_id, t.topic_name, COALESCE(m.mastery_probability, 0.2) AS p
        FROM student_enrolment se
        JOIN spec_topic t ON t.specification_id = se.specification_id AND t.topic_level = 1
        LEFT JOIN mastery_state m ON m.topic_id = t.topic_id AND m.student_id = se.student_id AND m.model_type = 'BKT'
        WHERE se.enrolment_id = ?
        ORDER BY p ASC, t.display_order NULLS LAST
        LIMIT 5
        """,
        (rs, i) -> Map.of(
            "topicId", rs.getLong("topic_id"),
            "topicName", rs.getString("topic_name"),
            "mastery", rs.getBigDecimal("p")),
        enrolmentId);
    if (weakTopics.isEmpty()) {
      weakTopics = jdbc.query(
          """
          SELECT t.topic_id, t.topic_name, 0.2 AS p
          FROM student_enrolment se
          JOIN spec_topic t ON t.specification_id = se.specification_id AND t.topic_level = 1
          WHERE se.enrolment_id = ?
          ORDER BY t.display_order NULLS LAST LIMIT 3
          """,
          (rs, i) -> Map.of(
              "topicId", rs.getLong("topic_id"),
              "topicName", rs.getString("topic_name"),
              "mastery", rs.getBigDecimal("p")),
          enrolmentId);
    }
    String rationale = buildRationale(weakTopics);
    jdbc.update(
        """
        INSERT INTO weekly_plan (plan_id, student_id, enrolment_id, week_start, rationale_text, status)
        VALUES (?, ?, ?, ?, ?, 'ACTIVE')
        """,
        planId,
        sid,
        enrolmentId,
        weekStart,
        rationale);
    String[] kinds = {"PRACTICE", "FLASHCARDS", "NOTES", "PRACTICE", "REVIEW", "PRACTICE", "MOCK"};
    short[] minutes = {20, 10, 15, 25, 15, 20, 45};
    List<Map<String, Object>> items = new ArrayList<>();
    for (int day = 1; day <= 7; day++) {
      Map<String, Object> topic = weakTopics.get((day - 1) % weakTopics.size());
      UUID itemId = UUID.randomUUID();
      jdbc.update(
          """
          INSERT INTO weekly_plan_item (item_id, plan_id, day_of_week, topic_id, activity_kind, minutes)
          VALUES (?, ?, ?, ?, ?, ?)
          """,
          itemId,
          planId,
          (short) day,
          topic.get("topicId"),
          kinds[day - 1],
          minutes[day - 1]);
      Map<String, Object> item = new HashMap<>();
      item.put("itemId", itemId);
      item.put("dayOfWeek", day);
      item.put("topicId", topic.get("topicId"));
      item.put("topicName", topic.get("topicName"));
      item.put("activityKind", kinds[day - 1]);
      item.put("minutes", (int) minutes[day - 1]);
      item.put("completedAt", null);
      items.add(item);
    }
    Map<String, Object> out = new HashMap<>();
    out.put("planId", planId);
    out.put("studentId", sid);
    out.put("enrolmentId", enrolmentId);
    out.put("weekStart", weekStart.toString());
    out.put("rationaleText", rationale);
    out.put("items", items);
    out.put("status", "ACTIVE");
    return out;
  }

  public Map<String, Object> current(AccountPrincipal principal, UUID studentId) {
    UUID sid = access.resolveStudentId(principal, studentId);
    access.assertParentOrStudent(principal, sid);
    Map<String, Object> plan = jdbc.query(
        """
        SELECT plan_id, enrolment_id, week_start, rationale_text, status
        FROM weekly_plan WHERE student_id = ? AND status = 'ACTIVE'
        ORDER BY created_at DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("planId", rs.getObject("plan_id"));
          m.put("enrolmentId", rs.getObject("enrolment_id"));
          m.put("weekStart", rs.getDate("week_start").toLocalDate().toString());
          m.put("rationaleText", rs.getString("rationale_text"));
          m.put("status", rs.getString("status"));
          return m;
        },
        sid);
    if (plan == null) {
      return Map.of("studentId", sid, "plan", null, "items", List.of());
    }
    UUID planId = (UUID) plan.get("planId");
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT i.item_id, i.day_of_week, i.topic_id, t.topic_name, i.activity_kind, i.minutes, i.completed_at
        FROM weekly_plan_item i
        LEFT JOIN spec_topic t ON t.topic_id = i.topic_id
        WHERE i.plan_id = ?
        ORDER BY i.day_of_week
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("itemId", rs.getObject("item_id"));
          m.put("dayOfWeek", rs.getShort("day_of_week"));
          m.put("topicId", rs.getObject("topic_id"));
          m.put("topicName", rs.getString("topic_name"));
          m.put("activityKind", rs.getString("activity_kind"));
          m.put("minutes", rs.getShort("minutes"));
          m.put("completedAt", rs.getTimestamp("completed_at"));
          return m;
        },
        planId);
    Map<String, Object> out = new HashMap<>(plan);
    out.put("studentId", sid);
    out.put("items", items);
    return out;
  }

  @Transactional
  public Map<String, Object> patchItem(AccountPrincipal principal, UUID itemId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID planStudent = jdbc.query(
        """
        SELECT p.student_id FROM weekly_plan_item i
        JOIN weekly_plan p ON p.plan_id = i.plan_id WHERE i.item_id = ?
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        itemId);
    if (planStudent == null || !planStudent.equals(principal.studentId())) {
      throw AppException.forbidden("Forbidden");
    }
    if (Boolean.TRUE.equals(body.get("completed")) || "complete".equalsIgnoreCase(String.valueOf(body.get("action")))) {
      jdbc.update("UPDATE weekly_plan_item SET completed_at = now() WHERE item_id = ?", itemId);
    }
    if (body.get("dayOfWeek") instanceof Number n) {
      jdbc.update("UPDATE weekly_plan_item SET day_of_week = ? WHERE item_id = ?", n.shortValue(), itemId);
    }
    return Map.of("itemId", itemId, "updated", true);
  }

  /** Deterministic plan slots; rationale text may use gateway with anonymous topic stats only. */
  String buildRationale(List<Map<String, Object>> weakTopics) {
    List<String> names = weakTopics.stream().map(t -> String.valueOf(t.get("topicName"))).toList();
    try {
      Map<?, ?> resp = gateway.run(
          "P-RP-04",
          Map.of("weakTopicLabels", names, "itemCount", weakTopics.size()),
          "weekly_plan_rationale_v1");
      Object result = resp.get("result");
      if (result instanceof Map<?, ?> m && m.get("rationale") != null) {
        return m.get("rationale").toString();
      }
    } catch (Exception ignored) {
      // fall through to code rationale
    }
    return "This week focuses on "
        + String.join(", ", names)
        + " based on your current mastery (built in code; accuracy claims remain unvalidated).";
  }

  /** Pure helper for unit tests — plan day count and minutes are code-owned. */
  public static int totalPlanMinutes(short[] minutes) {
    int sum = 0;
    for (short m : minutes) {
      sum += m;
    }
    return sum;
  }

  public static LocalDate weekStartFor(LocalDate today) {
    return today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
  }
}
