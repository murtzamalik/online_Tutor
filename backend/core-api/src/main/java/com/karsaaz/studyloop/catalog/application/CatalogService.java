package com.karsaaz.studyloop.catalog.application;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CatalogService {
  private final JdbcTemplate jdbc;

  public CatalogService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> qualifications() {
    return jdbc.query(
        "SELECT qualification_id, code, display_name, visual_tier FROM qualification ORDER BY qualification_id",
        (rs, i) -> Map.of(
            "qualificationId", rs.getLong("qualification_id"),
            "code", rs.getString("code"),
            "displayName", rs.getString("display_name"),
            "visualTier", rs.getShort("visual_tier")));
  }

  public List<Map<String, Object>> boards(Long qualificationId, Long subjectId) {
    String sql =
        """
        SELECT DISTINCT b.board_id, b.code, b.display_name
        FROM exam_board b
        JOIN specification s ON s.board_id = b.board_id
        WHERE (?::bigint IS NULL OR s.qualification_id = ?)
          AND (?::bigint IS NULL OR s.subject_id = ?)
          AND s.is_active = TRUE
        ORDER BY b.display_name
        """;
    return jdbc.query(
        sql,
        (rs, i) -> Map.of(
            "boardId", rs.getLong("board_id"),
            "code", rs.getString("code"),
            "displayName", rs.getString("display_name")),
        qualificationId,
        qualificationId,
        subjectId,
        subjectId);
  }

  public List<Map<String, Object>> subjects() {
    return jdbc.query(
        """
        SELECT subject_id, code, display_name, is_combined_science, is_pilot
        FROM subject ORDER BY display_name
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("subjectId", rs.getLong("subject_id"));
          m.put("code", rs.getString("code"));
          m.put("displayName", rs.getString("display_name"));
          m.put("isCombinedScience", rs.getBoolean("is_combined_science"));
          m.put("isPilot", rs.getBoolean("is_pilot"));
          return m;
        });
  }

  public List<Map<String, Object>> specifications(Long qualificationId, Long boardId, Long subjectId) {
    return jdbc.query(
        """
        SELECT specification_id, spec_code, title, tier_scheme, qualification_id, board_id, subject_id
        FROM specification
        WHERE is_active = TRUE
          AND (?::bigint IS NULL OR qualification_id = ?)
          AND (?::bigint IS NULL OR board_id = ?)
          AND (?::bigint IS NULL OR subject_id = ?)
        ORDER BY title
        """,
        (rs, i) -> Map.of(
            "specificationId", rs.getLong("specification_id"),
            "specCode", rs.getString("spec_code"),
            "title", rs.getString("title"),
            "tierScheme", rs.getString("tier_scheme"),
            "qualificationId", rs.getLong("qualification_id"),
            "boardId", rs.getLong("board_id"),
            "subjectId", rs.getLong("subject_id")),
        qualificationId,
        qualificationId,
        boardId,
        boardId,
        subjectId,
        subjectId);
  }

  public List<Map<String, Object>> topicTree(long specificationId) {
    List<Map<String, Object>> flat = jdbc.query(
        """
        SELECT topic_id, parent_topic_id, topic_level, topic_number, topic_name, unit_id
        FROM spec_topic WHERE specification_id = ?
        ORDER BY display_order NULLS LAST, topic_id
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("topicId", rs.getLong("topic_id"));
          m.put("parentTopicId", rs.getObject("parent_topic_id"));
          m.put("level", rs.getShort("topic_level"));
          m.put("number", rs.getString("topic_number"));
          m.put("name", rs.getString("topic_name"));
          m.put("unitId", rs.getObject("unit_id"));
          m.put("children", new java.util.ArrayList<Map<String, Object>>());
          return m;
        },
        specificationId);
    Map<Long, Map<String, Object>> byId = new HashMap<>();
    for (Map<String, Object> t : flat) {
      byId.put((Long) t.get("topicId"), t);
    }
    List<Map<String, Object>> roots = new java.util.ArrayList<>();
    for (Map<String, Object> t : flat) {
      Object parent = t.get("parentTopicId");
      if (parent == null) {
        roots.add(t);
      } else {
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> children =
            (List<Map<String, Object>>) byId.get((Long) parent).get("children");
        children.add(t);
      }
    }
    return roots;
  }

  public List<Map<String, Object>> examDates(String region) {
    return jdbc.query(
        """
        SELECT exam_date_id, qualification_id, region, exam_name, exam_on
        FROM exam_date
        WHERE (? IS NULL OR region = ?)
        ORDER BY exam_on
        """,
        (rs, i) -> Map.of(
            "examDateId", rs.getLong("exam_date_id"),
            "qualificationId", rs.getLong("qualification_id"),
            "region", rs.getString("region"),
            "examName", rs.getString("exam_name"),
            "examOn", rs.getDate("exam_on").toLocalDate()),
        region,
        region);
  }

  public List<Map<String, Object>> pricing() {
    return jdbc.query(
        """
        SELECT p.plan_id, p.code, p.display_name, p.tab, pr.billing_cycle, pr.amount_pence, pr.currency
        FROM pricing_plan p
        JOIN pricing_price pr ON pr.plan_id = p.plan_id
        ORDER BY p.sort_order NULLS LAST, p.plan_id
        """,
        (rs, i) -> Map.of(
            "planId", rs.getLong("plan_id"),
            "code", rs.getString("code"),
            "displayName", rs.getString("display_name"),
            "tab", rs.getString("tab"),
            "billingCycle", rs.getString("billing_cycle"),
            "pricePence", rs.getInt("amount_pence"),
            "currency", rs.getString("currency")));
  }
}
