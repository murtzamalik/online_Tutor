package com.karsaaz.studyloop.content.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContentService {
  private final JdbcTemplate jdbc;
  private final Clock clock;

  public ContentService(JdbcTemplate jdbc, Clock clock) {
    this.jdbc = jdbc;
    this.clock = clock;
  }

  public List<Map<String, Object>> listQcExceptions(AccountPrincipal principal) {
    requireContent(principal);
    return jdbc.query(
        """
        SELECT q.question_id, q.question_text, q.review_status, q.source_type, q.source_reference,
               q.specification_id, q.topic_id, q.marks_available, q.question_type
        FROM question q
        WHERE q.review_status IN ('PENDING_QC','QC_FAILED')
        ORDER BY q.updated_at DESC LIMIT 200
        """,
        (rs, i) -> questionRow(rs));
  }

  public Map<String, Object> qcExceptionDetail(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    Map<String, Object> q = getQuestion(questionId);
    List<Map<String, Object>> checks = jdbc.query(
        """
        SELECT result_id, check_id, passed, score, issues_json, run_at
        FROM qc_check_result WHERE question_id = ? ORDER BY run_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("resultId", rs.getLong("result_id"));
          m.put("checkId", rs.getString("check_id"));
          m.put("passed", rs.getBoolean("passed"));
          m.put("score", rs.getBigDecimal("score"));
          m.put("issuesJson", rs.getString("issues_json"));
          m.put("runAt", rs.getTimestamp("run_at"));
          return m;
        },
        questionId);
    Map<String, Object> out = new HashMap<>(q);
    out.put("qcChecks", checks);
    return out;
  }

  @Transactional
  public Map<String, Object> updateQuestion(
      AccountPrincipal principal, long questionId, Map<String, Object> body) {
    requireContent(principal);
    getQuestion(questionId);
    if (body.get("questionText") != null) {
      jdbc.update(
          "UPDATE question SET question_text = ?, updated_at = ? WHERE question_id = ?",
          body.get("questionText").toString(),
          clock.instant(),
          questionId);
    }
    if (body.get("reviewStatus") != null) {
      jdbc.update(
          "UPDATE question SET review_status = ?, updated_at = ? WHERE question_id = ?",
          body.get("reviewStatus").toString(),
          clock.instant(),
          questionId);
    }
    return getQuestion(questionId);
  }

  @Transactional
  public Map<String, Object> rerunQc(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    getQuestion(questionId);
    jdbc.update(
        """
        INSERT INTO qc_check_result (question_id, check_id, passed, issues_json)
        VALUES (?, 'CODE', TRUE, '{"rerun":"W1 stub pass"}'::jsonb)
        """,
        questionId);
    jdbc.update(
        "UPDATE question SET review_status = 'PENDING_QC', updated_at = ? WHERE question_id = ?",
        clock.instant(),
        questionId);
    return qcExceptionDetail(principal, questionId);
  }

  @Transactional
  public void rejectQuestion(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    int updated = jdbc.update(
        """
        UPDATE question SET review_status = 'REJECTED', reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE question_id = ? AND review_status IN ('PENDING_QC','QC_FAILED')
        """,
        principal.accountId(),
        clock.instant(),
        clock.instant(),
        questionId);
    if (updated == 0) {
      throw AppException.notFound("Question not found or not rejectable");
    }
  }

  @Transactional
  public void approveQuestion(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    int updated = jdbc.update(
        """
        UPDATE question SET review_status = 'APPROVED', reviewed_by = ?, reviewed_at = ?, updated_at = ?
        WHERE question_id = ? AND review_status IN ('PENDING_QC','QC_FAILED')
        """,
        principal.accountId(),
        clock.instant(),
        clock.instant(),
        questionId);
    if (updated == 0) {
      throw AppException.notFound("Question not found or not approvable");
    }
  }

  public List<Map<String, Object>> listQuestions(AccountPrincipal principal, String status) {
    requireContent(principal);
    if (status != null && !status.isBlank()) {
      return jdbc.query(
          """
          SELECT question_id, question_text, review_status, source_type, source_reference,
                 specification_id, topic_id, marks_available, question_type
          FROM question WHERE review_status = ? ORDER BY updated_at DESC LIMIT 200
          """,
          (rs, i) -> questionRow(rs),
          status);
    }
    return jdbc.query(
        """
        SELECT question_id, question_text, review_status, source_type, source_reference,
               specification_id, topic_id, marks_available, question_type
        FROM question ORDER BY updated_at DESC LIMIT 200
        """,
        (rs, i) -> questionRow(rs));
  }

  @Transactional
  public Map<String, Object> createQuestion(AccountPrincipal principal, Map<String, Object> body) {
    requireContent(principal);
    long specificationId = Long.parseLong(required(body, "specificationId"));
    long topicId = Long.parseLong(required(body, "topicId"));
    String questionText = required(body, "questionText");
    String questionType = body.getOrDefault("questionType", "SHORT_ANSWER").toString();
    short marks = Short.parseShort(body.getOrDefault("marksAvailable", "1").toString());
    String commandWord = body.getOrDefault("commandWord", "State").toString();
    Long qid = jdbc.query(
        """
        INSERT INTO question (
          specification_id, topic_id, source_type, tier, marks_available, question_type,
          command_word, question_text, answer_format, review_status, licence_status
        ) VALUES (?, ?, 'AUTHORED', ?, ?, ?, ?, ?, 'TEXT', 'PENDING_QC', 'OWN')
        RETURNING question_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        topicId,
        body.getOrDefault("tier", "FOUNDATION").toString(),
        marks,
        questionType,
        commandWord,
        questionText);
    jdbc.update(
        """
        INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, origin)
        VALUES (?, 'POINTS', ?, '[]'::jsonb, 'AUTHORED')
        """,
        qid,
        marks);
    return getQuestion(qid);
  }

  @Transactional
  public void retireQuestion(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    int updated = jdbc.update(
        """
        UPDATE question SET review_status = 'RETIRED', retired_at = ?, updated_at = ?
        WHERE question_id = ?
        """,
        clock.instant(),
        clock.instant(),
        questionId);
    if (updated == 0) {
      throw AppException.notFound("Question not found");
    }
  }

  public List<Map<String, Object>> listPastPapers(AccountPrincipal principal) {
    requireContent(principal);
    return jdbc.query(
        """
        SELECT paper_id, specification_id, series, exam_year, paper_code, title,
               licence_status, ingest_status, source_url
        FROM past_paper ORDER BY exam_year DESC, paper_id DESC LIMIT 100
        """,
        (rs, i) -> pastPaperRow(rs));
  }

  public Map<String, Object> getPastPaper(AccountPrincipal principal, long paperId) {
    requireContent(principal);
    Map<String, Object> paper = jdbc.query(
        """
        SELECT paper_id, specification_id, series, exam_year, paper_code, title,
               licence_status, ingest_status, source_url, licence_notes
        FROM past_paper WHERE paper_id = ?
        """,
        rs -> rs.next() ? pastPaperRow(rs) : null,
        paperId);
    if (paper == null) {
      throw AppException.notFound("Past paper not found");
    }
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT item_id, paper_id, question_id, q_ref, status, proposed_topic_id, tag_confidence
        FROM past_paper_item WHERE paper_id = ? ORDER BY q_ref
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("itemId", rs.getLong("item_id"));
          m.put("paperId", rs.getLong("paper_id"));
          m.put("questionId", rs.getObject("question_id"));
          m.put("qRef", rs.getString("q_ref"));
          m.put("status", rs.getString("status"));
          m.put("proposedTopicId", rs.getObject("proposed_topic_id"));
          m.put("tagConfidence", rs.getBigDecimal("tag_confidence"));
          return m;
        },
        paperId);
    paper.put("items", items);
    return paper;
  }

  @Transactional
  public Map<String, Object> registerPastPaper(AccountPrincipal principal, Map<String, Object> body) {
    requireContent(principal);
    long specificationId = Long.parseLong(required(body, "specificationId"));
    String series = required(body, "series");
    String paperCode = required(body, "paperCode");
    String sourceUrl = required(body, "sourceUrl");
    if (sourceUrl.toLowerCase().contains("physicsandmathstutor") || sourceUrl.toLowerCase().contains("/pmt/")) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "PMT sources are not permitted");
    }
    short year = Short.parseShort(body.getOrDefault("examYear", "2023").toString());
    Long paperId = jdbc.query(
        """
        INSERT INTO past_paper (
          specification_id, series, exam_year, paper_code, title, source_url,
          licence_status, ingest_status, imported_by
        ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING_BOARD_CONFIRMATION', 'NOT_STARTED', ?)
        RETURNING paper_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        series,
        year,
        paperCode,
        body.getOrDefault("title", paperCode).toString(),
        sourceUrl,
        principal.accountId());
    return getPastPaper(principal, paperId);
  }

  @Transactional
  public Map<String, Object> startIngest(AccountPrincipal principal, long paperId) {
    requireContent(principal);
    getPastPaper(principal, paperId);
    UUID jobId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO ingestion_job (job_id, paper_id, stage, status, started_at)
        VALUES (?, ?, 'SEGMENT', 'RUNNING', ?)
        """,
        jobId,
        paperId,
        clock.instant());
    jdbc.update(
        "UPDATE past_paper SET ingest_status = 'QUEUED' WHERE paper_id = ?", paperId);
    // Stub pipeline: create a NEEDS_REVIEW item and move statuses
    jdbc.update(
        """
        INSERT INTO past_paper_item (paper_id, q_ref, raw_text, status)
        VALUES (?, '01', 'W1 ingest stub stem', 'NEEDS_REVIEW')
        ON CONFLICT (paper_id, q_ref) DO UPDATE SET status = 'NEEDS_REVIEW'
        """,
        paperId);
    jdbc.update(
        """
        UPDATE ingestion_job SET status = 'SUCCEEDED', finished_at = ?, stage = 'REVIEW'
        WHERE job_id = ?
        """,
        clock.instant(),
        jobId);
    jdbc.update(
        "UPDATE past_paper SET ingest_status = 'NEEDS_REVIEW' WHERE paper_id = ?", paperId);
    return Map.of("jobId", jobId, "paperId", paperId, "status", "NEEDS_REVIEW");
  }

  public Map<String, Object> ingestStatus(AccountPrincipal principal, long paperId) {
    requireContent(principal);
    var jobs = jdbc.query(
        """
        SELECT job_id, stage, status, started_at, finished_at, error
        FROM ingestion_job WHERE paper_id = ? ORDER BY created_at DESC LIMIT 5
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("jobId", rs.getObject("job_id"));
          m.put("stage", rs.getString("stage"));
          m.put("status", rs.getString("status"));
          m.put("startedAt", rs.getTimestamp("started_at"));
          m.put("finishedAt", rs.getTimestamp("finished_at"));
          m.put("error", rs.getString("error"));
          return m;
        },
        paperId);
    String paperStatus = jdbc.query(
        "SELECT ingest_status FROM past_paper WHERE paper_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        paperId);
    if (paperStatus == null) {
      throw AppException.notFound("Past paper not found");
    }
    return Map.of("paperId", paperId, "ingestStatus", paperStatus, "jobs", jobs);
  }

  @Transactional
  public Map<String, Object> patchLicence(
      AccountPrincipal principal, long paperId, Map<String, Object> body) {
    requireContent(principal);
    String status = required(body, "licenceStatus");
    jdbc.update(
        "UPDATE past_paper SET licence_status = ?, licence_notes = COALESCE(?, licence_notes) WHERE paper_id = ?",
        status,
        body.get("licenceNotes") != null ? body.get("licenceNotes").toString() : null,
        paperId);
    return getPastPaper(principal, paperId);
  }

  @Transactional
  public Map<String, Object> patchPastPaperItem(
      AccountPrincipal principal, long itemId, Map<String, Object> body) {
    requireContent(principal);
    if (body.get("proposedTopicId") != null) {
      jdbc.update(
          "UPDATE past_paper_item SET proposed_topic_id = ? WHERE item_id = ?",
          Long.parseLong(body.get("proposedTopicId").toString()),
          itemId);
    }
    if (body.get("status") != null) {
      jdbc.update(
          "UPDATE past_paper_item SET status = ?, review_note = COALESCE(?, review_note) WHERE item_id = ?",
          body.get("status").toString(),
          body.get("reviewNote") != null ? body.get("reviewNote").toString() : null,
          itemId);
    }
    return jdbc.query(
        "SELECT item_id, paper_id, q_ref, status, proposed_topic_id FROM past_paper_item WHERE item_id = ?",
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Item not found");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("itemId", rs.getLong("item_id"));
          m.put("paperId", rs.getLong("paper_id"));
          m.put("qRef", rs.getString("q_ref"));
          m.put("status", rs.getString("status"));
          m.put("proposedTopicId", rs.getObject("proposed_topic_id"));
          return m;
        },
        itemId);
  }

  @Transactional
  public Map<String, Object> approvePastPaperItem(AccountPrincipal principal, long itemId) {
    requireContent(principal);
    int updated = jdbc.update(
        """
        UPDATE past_paper_item SET status = 'APPROVED', reviewed_by = ?
        WHERE item_id = ? AND status IN ('EXTRACTED','TAGGED','NEEDS_REVIEW')
        """,
        principal.accountId(),
        itemId);
    if (updated == 0) {
      throw AppException.notFound("Item not found or not approvable");
    }
    return patchPastPaperItem(principal, itemId, Map.of());
  }

  private Map<String, Object> getQuestion(long questionId) {
    Map<String, Object> q = jdbc.query(
        """
        SELECT question_id, question_text, review_status, source_type, source_reference,
               specification_id, topic_id, marks_available, question_type
        FROM question WHERE question_id = ?
        """,
        rs -> rs.next() ? questionRow(rs) : null,
        questionId);
    if (q == null) {
      throw AppException.notFound("Question not found");
    }
    return q;
  }

  private Map<String, Object> questionRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = new HashMap<>();
    m.put("questionId", rs.getLong("question_id"));
    m.put("questionText", rs.getString("question_text"));
    m.put("reviewStatus", rs.getString("review_status"));
    m.put("sourceType", rs.getString("source_type"));
    m.put("sourceReference", rs.getString("source_reference"));
    m.put("specificationId", rs.getLong("specification_id"));
    m.put("topicId", rs.getLong("topic_id"));
    m.put("marksAvailable", rs.getShort("marks_available"));
    m.put("questionType", rs.getString("question_type"));
    return m;
  }

  private Map<String, Object> pastPaperRow(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = new HashMap<>();
    m.put("paperId", rs.getLong("paper_id"));
    m.put("specificationId", rs.getLong("specification_id"));
    m.put("series", rs.getString("series"));
    m.put("examYear", rs.getShort("exam_year"));
    m.put("paperCode", rs.getString("paper_code"));
    m.put("title", rs.getString("title"));
    m.put("licenceStatus", rs.getString("licence_status"));
    m.put("ingestStatus", rs.getString("ingest_status"));
    m.put("sourceUrl", rs.getString("source_url"));
    try {
      m.put("licenceNotes", rs.getString("licence_notes"));
    } catch (Exception ignored) {
      /* optional column in some selects */
    }
    return m;
  }

  private void requireContent(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content admin required");
    }
  }

  private static String required(Map<String, Object> body, String key) {
    if (body.get(key) == null || body.get(key).toString().isBlank()) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, key + " required");
    }
    return body.get(key).toString();
  }
}
