package com.karsaaz.studyloop.spec.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SpecService {
  private final JdbcTemplate jdbc;

  public SpecService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
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
    Long objectiveId = jdbc.query(
        """
        INSERT INTO spec_point_objective (
          spec_topic_id, objective_text, allowed_question_types, allowed_command_words,
          mark_min, mark_max, prompt_version
        ) VALUES (?, 'W1 stub objective from decompose', ARRAY['SHORT_ANSWER']::TEXT[],
                  ARRAY['State']::TEXT[], 1, 2, 'W1-STUB')
        RETURNING objective_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        topicId);
    jdbc.update("UPDATE spec_topic SET tagging_status = 'IN_PROGRESS' WHERE topic_id = ?", topicId);
    return Map.of("topicId", topicId, "objectiveId", objectiveId, "status", "IN_PROGRESS");
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
