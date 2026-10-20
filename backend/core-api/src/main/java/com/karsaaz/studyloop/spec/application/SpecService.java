package com.karsaaz.studyloop.spec.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpecService {
  private final JdbcTemplate jdbc;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;

  public SpecService(JdbcTemplate jdbc, GatewayClient gateway, GatewayAiSupport ai) {
    this.jdbc = jdbc;
    this.gateway = gateway;
    this.ai = ai;
  }

  public List<Map<String, Object>> listSpecs(AccountPrincipal principal) {
    requireContent(principal);
    return jdbc.query(
        """
        SELECT s.specification_id, s.spec_code, s.title,
               b.code AS board_code, sub.code AS subject_code, q.code AS qualification_code
        FROM specification s
        JOIN exam_board b ON b.board_id = s.board_id
        JOIN subject sub ON sub.subject_id = s.subject_id
        JOIN qualification q ON q.qualification_id = s.qualification_id
        ORDER BY s.spec_code
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("specificationId", rs.getLong("specification_id"));
          m.put("specCode", rs.getString("spec_code"));
          m.put("title", rs.getString("title"));
          m.put("boardCode", rs.getString("board_code"));
          m.put("subjectCode", rs.getString("subject_code"));
          m.put("qualificationCode", rs.getString("qualification_code"));
          return m;
        });
  }

  @Transactional
  public Map<String, Object> createSpec(AccountPrincipal principal, Map<String, Object> body) {
    requireContent(principal);
    throw AppException.badRequest(
        ProblemCode.VALIDATION_FAILED,
        "Creating new board specs is ops-gated; use seeded catalogue in W1");
  }

  public Map<String, Object> tree(AccountPrincipal principal, long specificationId) {
    requireContent(principal);
    List<Map<String, Object>> topics = jdbc.query(
        """
        SELECT topic_id, parent_topic_id, topic_level, topic_number, topic_name, tagging_status, display_order
        FROM spec_topic WHERE specification_id = ?
        ORDER BY topic_level, display_order NULLS LAST, topic_number
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("topicId", rs.getLong("topic_id"));
          m.put("parentTopicId", rs.getObject("parent_topic_id"));
          m.put("topicLevel", rs.getShort("topic_level"));
          m.put("topicNumber", rs.getString("topic_number"));
          m.put("title", rs.getString("topic_name"));
          m.put("taggingStatus", rs.getString("tagging_status"));
          m.put("displayOrder", rs.getObject("display_order"));
          return m;
        },
        specificationId);
    return Map.of("specificationId", specificationId, "topics", topics);
  }

  @Transactional
  public Map<String, Object> addTopic(
      AccountPrincipal principal, long specificationId, Map<String, Object> body) {
    requireContent(principal);
    String title = body.get("title") != null ? body.get("title").toString() : "New topic";
    short level = Short.parseShort(body.getOrDefault("topicLevel", "1").toString());
    String number = body.getOrDefault("topicNumber", "X").toString();
    Long parent = body.get("parentTopicId") != null
        ? Long.parseLong(body.get("parentTopicId").toString())
        : null;
    Long topicId = jdbc.query(
        """
        INSERT INTO spec_topic (
          specification_id, parent_topic_id, topic_level, topic_number, topic_name, tagging_status
        ) VALUES (?, ?, ?, ?, ?, 'TODO')
        RETURNING topic_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        parent,
        level,
        number,
        title);
    return Map.of("topicId", topicId, "specificationId", specificationId, "title", title);
  }

  @Transactional
  public Map<String, Object> patchTopic(
      AccountPrincipal principal, long topicId, Map<String, Object> body) {
    requireContent(principal);
    if (body.get("title") != null) {
      jdbc.update(
          "UPDATE spec_topic SET topic_name = ? WHERE topic_id = ?",
          body.get("title").toString(),
          topicId);
    }
    if (body.get("taggingStatus") != null) {
      jdbc.update(
          "UPDATE spec_topic SET tagging_status = ? WHERE topic_id = ?",
          body.get("taggingStatus").toString(),
          topicId);
    }
    return jdbc.query(
        "SELECT topic_id, topic_name, tagging_status FROM spec_topic WHERE topic_id = ?",
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Topic not found");
          }
          return Map.of(
              "topicId", rs.getLong("topic_id"),
              "title", rs.getString("topic_name"),
              "taggingStatus", rs.getString("tagging_status"));
        },
        topicId);
  }

  @Transactional
  public Map<String, Object> importDocument(
      AccountPrincipal principal, long specificationId, Map<String, Object> body) {
    requireContent(principal);
    String fileKey = body.getOrDefault("fileKey", "w1-stub-spec.pdf").toString();
    String sourceUrl = body.getOrDefault("sourceUrl", "https://www.aqa.org.uk/").toString();
    Long docId = jdbc.query(
        """
        INSERT INTO spec_document (specification_id, file_key, source_url, extract_status)
        VALUES (?, ?, ?, 'NOT_STARTED')
        RETURNING doc_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        fileKey,
        sourceUrl);
    return Map.of("docId", docId, "specificationId", specificationId, "status", "NOT_STARTED");
  }

  @Transactional
  public Map<String, Object> decompose(AccountPrincipal principal, long topicId) {
    requireContent(principal);
    Map<String, Object> topic =
        jdbc.query(
            """
            SELECT t.topic_id, t.topic_number, t.topic_name, t.spec_statement, t.higher_tier_only,
                   t.specification_id, s.spec_code, s.title AS spec_title,
                   b.code AS board_code, q.code AS qualification_code,
                   COALESCE(bsp.question_wording_notes,'') AS style_notes
            FROM spec_topic t
            JOIN specification s ON s.specification_id = t.specification_id
            JOIN exam_board b ON b.board_id = s.board_id
            JOIN qualification q ON q.qualification_id = s.qualification_id
            LEFT JOIN board_style_profile bsp ON bsp.specification_id = s.specification_id
            WHERE t.topic_id = ?
            """,
            rs -> {
              if (!rs.next()) {
                return null;
              }
              Map<String, Object> m = new HashMap<>();
              m.put("topicId", rs.getLong("topic_id"));
              m.put("topicNumber", rs.getString("topic_number"));
              m.put("topicName", rs.getString("topic_name"));
              m.put("specStatement", rs.getString("spec_statement"));
              m.put("higherTierOnly", rs.getBoolean("higher_tier_only"));
              m.put("specCode", rs.getString("spec_code"));
              m.put("boardCode", rs.getString("board_code"));
              m.put("qualificationCode", rs.getString("qualification_code"));
              m.put("styleNotes", rs.getString("style_notes"));
              return m;
            },
            topicId);
    if (topic == null) {
      throw AppException.notFound("Topic not found");
    }
    Map<?, ?> gw =
        gateway.run(
            "P-QG-01",
            Map.of(
                "board", ai.asText(topic.get("boardCode")),
                "qualification", ai.asText(topic.get("qualificationCode")),
                "spec_code", ai.asText(topic.get("specCode")),
                "spec_point_ref", ai.asText(topic.get("topicNumber")),
                "spec_point_title", ai.asText(topic.get("topicName")),
                "spec_point_text",
                    topic.get("specStatement") != null
                        ? ai.asText(topic.get("specStatement"))
                        : ai.asText(topic.get("topicName")),
                "tier_rule",
                    Boolean.TRUE.equals(topic.get("higherTierOnly")) ? "HIGHER_ONLY" : "BOTH",
                "parent_topic_context", "",
                "style_profile", ai.asText(topic.get("styleNotes"))),
            "schemas/spec_point_objectives.schema.json");
    Map<String, Object> result = ai.requireResult(gw, "P-QG-01");
    Object objectives = result.get("objectives");
    if (!(objectives instanceof List<?> list) || list.isEmpty()) {
      throw new IllegalStateException("P-QG-01 returned no objectives");
    }
    List<Long> created = new ArrayList<>();
    for (Object o : list) {
      if (!(o instanceof Map<?, ?> obj)) {
        continue;
      }
      String text = ai.asText(obj.get("objective_text"));
      if (text.isBlank()) {
        continue;
      }
      Object types = obj.get("allowed_question_types");
      Object words = obj.get("allowed_command_words");
      Object markRange = obj.get("mark_range");
      int markMin = 1;
      int markMax = 2;
      // Schema shape is [min, max]; the {min, max} object form is kept for older fixtures.
      if (markRange instanceof List<?> mrList && mrList.size() == 2) {
        markMin = ai.asInt(mrList.get(0), 1);
        markMax = ai.asInt(mrList.get(1), Math.max(markMin, 2));
      } else if (markRange instanceof Map<?, ?> mr) {
        markMin = ai.asInt(mr.get("min"), 1);
        markMax = ai.asInt(mr.get("max"), Math.max(markMin, 2));
      }
      String typeCsv =
          types instanceof List<?> tl && !tl.isEmpty()
              ? tl.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse("SHORT_ANSWER")
              : "SHORT_ANSWER";
      String wordCsv =
          words instanceof List<?> wl && !wl.isEmpty()
              ? wl.stream().map(String::valueOf).reduce((a, b) -> a + "," + b).orElse("State")
              : "State";
      Long objectiveId =
          jdbc.query(
              """
              INSERT INTO spec_point_objective (
                spec_topic_id, objective_text, allowed_question_types, allowed_command_words,
                mark_min, mark_max, prompt_version
              ) VALUES (?, ?, string_to_array(?, ','), string_to_array(?, ','), ?, ?, 'P-QG-01')
              RETURNING objective_id
              """,
              rs -> rs.next() ? rs.getLong(1) : null,
              topicId,
              text,
              typeCsv,
              wordCsv,
              (short) markMin,
              (short) markMax);
      if (objectiveId != null) {
        created.add(objectiveId);
      }
    }
    if (created.isEmpty()) {
      throw new IllegalStateException("P-QG-01 produced no persistable objectives");
    }
    jdbc.update("UPDATE spec_topic SET tagging_status = 'IN_PROGRESS' WHERE topic_id = ?", topicId);
    return Map.of(
        "topicId",
        topicId,
        "objectiveId",
        created.get(0),
        "objectiveIds",
        created,
        "count",
        created.size(),
        "status",
        "IN_PROGRESS");
  }

  public Map<String, Object> taggingProgress(AccountPrincipal principal) {
    requireContent(principal);
    List<Map<String, Object>> bySpec = jdbc.query(
        """
        SELECT s.specification_id, s.spec_code, s.title,
               COUNT(*) FILTER (WHERE t.tagging_status = 'DONE') AS done_count,
               COUNT(*) FILTER (WHERE t.tagging_status = 'IN_PROGRESS') AS in_progress_count,
               COUNT(*) FILTER (WHERE t.tagging_status = 'TODO') AS todo_count,
               COUNT(t.topic_id) AS total_topics
        FROM specification s
        LEFT JOIN spec_topic t ON t.specification_id = s.specification_id
        GROUP BY s.specification_id, s.spec_code, s.title
        ORDER BY s.spec_code
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("specificationId", rs.getLong("specification_id"));
          m.put("specCode", rs.getString("spec_code"));
          m.put("title", rs.getString("title"));
          m.put("doneCount", rs.getLong("done_count"));
          m.put("inProgressCount", rs.getLong("in_progress_count"));
          m.put("todoCount", rs.getLong("todo_count"));
          m.put("totalTopics", rs.getLong("total_topics"));
          return m;
        });
    return Map.of("items", bySpec);
  }

  private void requireContent(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content access required");
    }
  }
}
