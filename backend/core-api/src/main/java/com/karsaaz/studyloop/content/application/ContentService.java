package com.karsaaz.studyloop.content.application;

import com.karsaaz.studyloop.common.db.SqlTime;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.content.infra.ObjectStorageService;
import com.karsaaz.studyloop.content.infra.PdfTextExtractor;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
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
  /** Per P-IN-01/02 call; keeps one chunk's JSON output well inside the model's token limit. */
  static final int INGEST_CHUNK_CHARS = 25_000;

  private final JdbcTemplate jdbc;
  private final Clock clock;
  private final ObjectStorageService objectStorage;
  private final PdfTextExtractor pdfText;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final QuestionEmbeddingService embeddings;

  public ContentService(
      JdbcTemplate jdbc,
      Clock clock,
      ObjectStorageService objectStorage,
      PdfTextExtractor pdfText,
      GatewayClient gateway,
      GatewayAiSupport ai,
      QuestionEmbeddingService embeddings) {
    this.jdbc = jdbc;
    this.clock = clock;
    this.objectStorage = objectStorage;
    this.pdfText = pdfText;
    this.gateway = gateway;
    this.ai = ai;
    this.embeddings = embeddings;
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
    // What a reviewer needs to judge the item: options, the expected answer, the mark scheme and names, not ids.
    jdbc.query(
        """
        SELECT q.options_json::text AS options, q.answer_spec_json::text AS answer_spec, q.command_word,
               t.topic_number, t.topic_name, s.title AS spec_title, s.spec_code,
               ms.marking_points_json::text AS points, ms.model_answer, ms.levels_json::text AS levels
        FROM question q
        LEFT JOIN spec_topic t ON t.topic_id = q.topic_id
        LEFT JOIN specification s ON s.specification_id = q.specification_id
        LEFT JOIN mark_scheme ms ON ms.question_id = q.question_id
        WHERE q.question_id = ?
        LIMIT 1
        """,
        rs -> {
          out.put("optionsJson", rs.getString("options"));
          out.put("answerSpecJson", rs.getString("answer_spec"));
          out.put("commandWord", rs.getString("command_word"));
          out.put("topicNumber", rs.getString("topic_number"));
          out.put("topicName", rs.getString("topic_name"));
          out.put("specTitle", rs.getString("spec_title"));
          out.put("specCode", rs.getString("spec_code"));
          out.put("markingPointsJson", rs.getString("points"));
          out.put("modelAnswer", rs.getString("model_answer"));
          out.put("levelsJson", rs.getString("levels"));
        },
        questionId);
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
          SqlTime.ts(clock.instant()),
          questionId);
    }
    if (body.get("reviewStatus") != null) {
      jdbc.update(
          "UPDATE question SET review_status = ?, updated_at = ? WHERE question_id = ?",
          body.get("reviewStatus").toString(),
          SqlTime.ts(clock.instant()),
          questionId);
    }
    return getQuestion(questionId);
  }

  @Transactional
  public Map<String, Object> rerunQc(AccountPrincipal principal, long questionId) {
    requireContent(principal);
    Map<String, Object> q = getQuestion(questionId);
    Map<?, ?> gw = gateway.run("P-QG-04", qcVariables(questionId, q), null);
    Map<String, Object> result = ai.requireResult(gw, "P-QG-04");
    boolean passed = ai.qcPassed(result);
    jdbc.update(
        """
        INSERT INTO qc_check_result (question_id, check_id, prompt_version, passed, issues_json)
        VALUES (?, 'QC1_GROUNDING', ?, ?, ?::jsonb)
        """,
        questionId,
        "P-QG-04@" + ai.asText(gw.get("promptVersion")),
        passed,
        ai.toJson(result));
    // A person's edit is not trusted blindly: pending again on pass (approval stays a human/QC step),
    // QC_FAILED on fail so it never reaches students.
    jdbc.update(
        "UPDATE question SET review_status = ?, updated_at = ? WHERE question_id = ?",
        passed ? "PENDING_QC" : "QC_FAILED",
        SqlTime.ts(clock.instant()),
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
        SqlTime.ts(clock.instant()),
        SqlTime.ts(clock.instant()),
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
        SqlTime.ts(clock.instant()),
        SqlTime.ts(clock.instant()),
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
        SqlTime.ts(clock.instant()),
        SqlTime.ts(clock.instant()),
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
               licence_status, ingest_status, source_url, file_key_paper, file_key_mark_scheme,
               file_key_examiner_report, sha256_paper, tier
        FROM past_paper ORDER BY exam_year DESC, paper_id DESC LIMIT 100
        """,
        (rs, i) -> pastPaperRow(rs));
  }

  public Map<String, Object> getPastPaper(AccountPrincipal principal, long paperId) {
    requireContent(principal);
    Map<String, Object> paper = jdbc.query(
        """
        SELECT paper_id, specification_id, series, exam_year, paper_code, title,
               licence_status, ingest_status, source_url, licence_notes,
               file_key_paper, file_key_mark_scheme, file_key_examiner_report, sha256_paper, tier
        FROM past_paper WHERE paper_id = ?
        """,
        rs -> rs.next() ? pastPaperRow(rs) : null,
        paperId);
    if (paper == null) {
      throw AppException.notFound("Past paper not found");
    }
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT item_id, paper_id, question_id, q_ref, status, proposed_topic_id, tag_confidence, raw_text
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
          m.put("rawText", rs.getString("raw_text"));
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
    String tier = body.get("tier") != null ? body.get("tier").toString() : null;
    String fileKeyPaper = optionalString(body, "fileKeyPaper");
    String fileKeyMs = optionalString(body, "fileKeyMarkScheme");
    String fileKeyEr = optionalString(body, "fileKeyExaminerReport");
    String sha256 = optionalString(body, "sha256Paper");
    if (fileKeyPaper != null) {
      objectStorage.requireExists(fileKeyPaper);
    }
    if (fileKeyMs != null) {
      objectStorage.requireExists(fileKeyMs);
    }
    if (fileKeyEr != null) {
      objectStorage.requireExists(fileKeyEr);
    }
    Long paperId = jdbc.query(
        """
        INSERT INTO past_paper (
          specification_id, series, exam_year, paper_code, title, source_url, tier,
          licence_status, ingest_status, imported_by,
          file_key_paper, file_key_mark_scheme, file_key_examiner_report, sha256_paper
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_BOARD_CONFIRMATION', 'NOT_STARTED', ?, ?, ?, ?, ?)
        RETURNING paper_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        series,
        year,
        paperCode,
        body.getOrDefault("title", paperCode).toString(),
        sourceUrl,
        tier,
        principal.accountId(),
        fileKeyPaper,
        fileKeyMs,
        fileKeyEr,
        sha256);
    return getPastPaper(principal, paperId);
  }

  @Transactional
  public Map<String, Object> attachPastPaperFiles(
      AccountPrincipal principal, long paperId, Map<String, Object> body) {
    requireContent(principal);
    getPastPaper(principal, paperId);
    String fileKeyPaper = optionalString(body, "fileKeyPaper");
    String fileKeyMs = optionalString(body, "fileKeyMarkScheme");
    String fileKeyEr = optionalString(body, "fileKeyExaminerReport");
    String sha256 = optionalString(body, "sha256Paper");
    if (fileKeyPaper != null) {
      objectStorage.requireExists(fileKeyPaper);
    }
    if (fileKeyMs != null) {
      objectStorage.requireExists(fileKeyMs);
    }
    if (fileKeyEr != null) {
      objectStorage.requireExists(fileKeyEr);
    }
    jdbc.update(
        """
        UPDATE past_paper SET
          file_key_paper = COALESCE(?, file_key_paper),
          file_key_mark_scheme = COALESCE(?, file_key_mark_scheme),
          file_key_examiner_report = COALESCE(?, file_key_examiner_report),
          sha256_paper = COALESCE(?, sha256_paper)
        WHERE paper_id = ?
        """,
        fileKeyPaper,
        fileKeyMs,
        fileKeyEr,
        sha256,
        paperId);
    return getPastPaper(principal, paperId);
  }

  @Transactional
  public Map<String, Object> startIngest(AccountPrincipal principal, long paperId) {
    requireContent(principal);
    Map<String, Object> paper = jdbc.query(
        """
        SELECT paper_id, specification_id, series, exam_year, paper_code, title,
               licence_status, ingest_status, source_url, licence_notes,
               file_key_paper, file_key_mark_scheme, file_key_examiner_report, sha256_paper, tier
        FROM past_paper WHERE paper_id = ?
        """,
        rs -> rs.next() ? pastPaperRow(rs) : null,
        paperId);
    if (paper == null) {
      throw AppException.notFound("Past paper not found");
    }
    String fileKeyPaper = paper.get("fileKeyPaper") != null ? paper.get("fileKeyPaper").toString() : null;
    if (fileKeyPaper == null || fileKeyPaper.isBlank()) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "fileKeyPaper required before ingest");
    }
    objectStorage.requireExists(fileKeyPaper);
    String fileKeyMs =
        paper.get("fileKeyMarkScheme") != null ? paper.get("fileKeyMarkScheme").toString() : null;

    Long topicId = jdbc.query(
        """
        SELECT topic_id FROM spec_topic
        WHERE specification_id = ? AND topic_level = 1
        ORDER BY display_order NULLS LAST, topic_id LIMIT 1
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        paper.get("specificationId"));

    UUID jobId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO ingestion_job (job_id, paper_id, stage, status, started_at)
        VALUES (?, ?, 'SEGMENT', 'RUNNING', ?)
        """,
        jobId,
        paperId,
        SqlTime.ts(clock.instant()));
    jdbc.update(
        "UPDATE past_paper SET ingest_status = 'QUEUED' WHERE paper_id = ?", paperId);

    try {
      // Page-aligned chunks: a full paper in one call overflowed the model's output limit.
      List<String> paperChunks =
          pdfText.pageChunks(objectStorage.requireLocalPath(fileKeyPaper), INGEST_CHUNK_CHARS);
      if (paperChunks.isEmpty() || String.join("", paperChunks).isBlank()) {
        throw AppException.badRequest(
            ProblemCode.VALIDATION_FAILED, "Could not extract text from paper PDF");
      }
      String cover = pdfText.firstPages(paperChunks.get(0), 6000);
      Map<?, ?> metaGw = gateway.run("P-IN-03", Map.of("cover_pages", cover), null);
      Map<String, Object> metadata = ai.requireResult(metaGw, "P-IN-03");

      List<Map<String, Object>> itemList = new java.util.ArrayList<>();
      java.util.Set<String> seenRefs = new java.util.HashSet<>();
      for (String chunk : paperChunks) {
        Map<String, Object> segment =
            ai.requireResult(
                gateway.run("P-IN-01", Map.of("paper_pages", chunk, "metadata", ai.toJson(metadata)), null),
                "P-IN-01");
        if (GatewayAiSupport.cannotComplete(segment)) {
          continue;
        }
        for (Map<String, Object> item : ai.asMapList(segment.get("items"))) {
          // A question split across a chunk boundary may be reported twice; keep the first.
          String ref = firstNonBlank(item.get("item_ref"), item.get("question_no"), "");
          if (ref.isBlank() || seenRefs.add(ref)) {
            itemList.add(item);
          }
        }
      }

      Map<String, List<Map<String, Object>>> schemeByRef = new HashMap<>();
      if (fileKeyMs != null && !fileKeyMs.isBlank() && objectStorage.exists(fileKeyMs)) {
        List<Map<String, Object>> itemIndex = new java.util.ArrayList<>();
        for (Map<String, Object> item : itemList) {
          itemIndex.add(
              Map.of(
                  "item_ref", ai.asText(item.get("item_ref")),
                  "question_no", ai.asText(item.get("question_no")),
                  "marks", ai.asInt(item.get("marks"), 0)));
        }
        for (String msChunk :
            pdfText.pageChunks(objectStorage.requireLocalPath(fileKeyMs), INGEST_CHUNK_CHARS)) {
          if (msChunk.isBlank()) {
            continue;
          }
          Map<String, Object> scheme =
              ai.requireResult(
                  gateway.run(
                      "P-IN-02",
                      Map.of(
                          "scheme_pages", msChunk,
                          "metadata", ai.toJson(metadata),
                          "segmented_items", ai.toJson(itemIndex)),
                      null),
                  "P-IN-02");
          // Schema key is "schemes" (one entry per item/part); "items" was never returned.
          for (Map<String, Object> s : ai.asMapList(scheme.get("schemes"))) {
            String ref = ai.asText(s.get("item_ref"));
            if (!ref.isBlank()) {
              schemeByRef.computeIfAbsent(ref, k -> new java.util.ArrayList<>()).add(s);
            }
          }
        }
      }

      if (itemList.isEmpty()) {
        throw new IllegalStateException("P-IN-01 returned no items");
      }
      int count = 0;
      for (Map<String, Object> item : itemList) {
        String qRef =
            firstNonBlank(item.get("question_no"), item.get("item_ref"), String.format("%02d", count + 1));
        StringBuilder raw = new StringBuilder();
        if (item.get("stem_text") != null) {
          raw.append(item.get("stem_text"));
        }
        Object parts = item.get("parts");
        if (parts instanceof List<?> partList) {
          for (Object p : partList) {
            if (p instanceof Map<?, ?> pm) {
              raw.append("\n")
                  .append(pm.get("part_ref") == null ? "" : String.valueOf(pm.get("part_ref")))
                  .append(" ")
                  .append(pm.get("text") == null ? "" : String.valueOf(pm.get("text")));
            }
          }
        }
        List<Map<String, Object>> schemeHit =
            schemeByRef.getOrDefault(ai.asText(item.get("item_ref")), schemeByRef.get(qRef));
        if (schemeHit != null) {
          raw.append("\n\n[mark scheme]\n").append(ai.toJson(schemeHit));
        }
        if (raw.toString().isBlank()) {
          continue;
        }
        jdbc.update(
            """
            INSERT INTO past_paper_item (paper_id, q_ref, raw_text, status, proposed_topic_id)
            VALUES (?, ?, ?, 'NEEDS_REVIEW', ?)
            ON CONFLICT (paper_id, q_ref) DO UPDATE
              SET status = 'NEEDS_REVIEW',
                  raw_text = EXCLUDED.raw_text,
                  proposed_topic_id = COALESCE(EXCLUDED.proposed_topic_id, past_paper_item.proposed_topic_id)
            """,
            paperId,
            qRef,
            raw.toString().trim(),
            topicId);
        count++;
      }
      if (count == 0) {
        throw new IllegalStateException("Ingest produced zero past_paper_item rows");
      }
      jdbc.update(
          """
          UPDATE ingestion_job SET status = 'SUCCEEDED', finished_at = ?, stage = 'REVIEW',
            stats_json = ?::jsonb
          WHERE job_id = ?
          """,
          SqlTime.ts(clock.instant()),
          ai.toJson(
              Map.of(
                  "items",
                  count,
                  "mode",
                  "ai_p_in",
                  "metadata",
                  metadata,
                  "prompts",
                  List.of("P-IN-03", "P-IN-01", "P-IN-02"))),
          jobId);
      jdbc.update(
          "UPDATE past_paper SET ingest_status = 'NEEDS_REVIEW' WHERE paper_id = ?", paperId);
      return Map.of(
          "jobId", jobId,
          "paperId", paperId,
          "status", "NEEDS_REVIEW",
          "itemCount", count,
          "metadata", metadata);
    } catch (RuntimeException e) {
      jdbc.update(
          """
          UPDATE ingestion_job SET status = 'FAILED', finished_at = ?, error = ?, stage = 'SEGMENT'
          WHERE job_id = ?
          """,
          SqlTime.ts(clock.instant()),
          e.getMessage() != null && e.getMessage().length() > 500
              ? e.getMessage().substring(0, 500)
              : e.getMessage(),
          jobId);
      jdbc.update("UPDATE past_paper SET ingest_status = 'FAILED' WHERE paper_id = ?", paperId);
      throw e;
    }
  }

  /** P-QG-04 inputs for an existing bank question (spec point from its topic, scheme from mark_scheme). */
  private Map<String, Object> qcVariables(long questionId, Map<String, Object> question) {
    Map<String, Object> specPoint = new HashMap<>();
    String[] style = {""};
    jdbc.query(
        """
        SELECT t.topic_number, t.topic_name, t.spec_statement, t.higher_tier_only,
               COALESCE(bsp.question_wording_notes,'') || E'\\n' || COALESCE(bsp.mark_scheme_format_notes,'') AS style_notes
        FROM question q
        JOIN spec_topic t ON t.topic_id = q.topic_id
        LEFT JOIN board_style_profile bsp ON bsp.specification_id = q.specification_id
        WHERE q.question_id = ?
        """,
        rs -> {
          specPoint.put("ref", rs.getString("topic_number"));
          specPoint.put("title", rs.getString("topic_name"));
          specPoint.put("statement", rs.getString("spec_statement"));
          specPoint.put("tier_rule", rs.getBoolean("higher_tier_only") ? "HIGHER_ONLY" : "BOTH");
          style[0] = rs.getString("style_notes");
        },
        questionId);
    Map<String, Object> item = new HashMap<>(question);
    // questionRow() has no options/command word; QC must see the item exactly as students would.
    jdbc.query(
        "SELECT command_word, options_json::text, answer_format FROM question WHERE question_id = ?",
        rs -> {
          item.put("command_word", rs.getString(1));
          item.put("options", rs.getString(2));
          item.put("answer_format", rs.getString(3));
        },
        questionId);
    jdbc.query(
        "SELECT scheme_type, marking_points_json::text, model_answer FROM mark_scheme WHERE question_id = ? LIMIT 1",
        rs -> {
          item.put("mark_scheme_type", rs.getString(1));
          item.put("mark_scheme", rs.getString(2));
          item.put("model_answer", rs.getString(3));
        },
        questionId);
    Map<String, Object> vars = new HashMap<>();
    vars.put("style_profile", style[0] == null ? "" : style[0]);
    vars.put("spec_point", specPoint);
    vars.put("objective", Map.of("text", ai.asText(specPoint.get("statement"))));
    vars.put("exemplars_used", "");
    vars.put("item", item);
    return vars;
  }

  private static String firstNonBlank(Object... values) {
    for (Object v : values) {
      if (v != null && !String.valueOf(v).isBlank()) {
        return String.valueOf(v);
      }
    }
    return "";
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
    Map<String, Object> item = jdbc.query(
        """
        SELECT i.item_id, i.paper_id, i.q_ref, i.raw_text, i.status, i.proposed_topic_id, i.question_id,
               p.specification_id, p.series, p.exam_year, p.paper_code, p.tier
        FROM past_paper_item i
        JOIN past_paper p ON p.paper_id = i.paper_id
        WHERE i.item_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("itemId", rs.getLong("item_id"));
          m.put("paperId", rs.getLong("paper_id"));
          m.put("qRef", rs.getString("q_ref"));
          m.put("rawText", rs.getString("raw_text"));
          m.put("status", rs.getString("status"));
          m.put("proposedTopicId", rs.getObject("proposed_topic_id"));
          m.put("questionId", rs.getObject("question_id"));
          m.put("specificationId", rs.getLong("specification_id"));
          m.put("series", rs.getString("series"));
          m.put("examYear", rs.getShort("exam_year"));
          m.put("paperCode", rs.getString("paper_code"));
          m.put("tier", rs.getString("tier"));
          return m;
        },
        itemId);
    if (item == null) {
      throw AppException.notFound("Item not found");
    }
    String status = item.get("status").toString();
    if (!List.of("EXTRACTED", "TAGGED", "NEEDS_REVIEW").contains(status)) {
      throw AppException.notFound("Item not found or not approvable");
    }
    if (item.get("questionId") != null) {
      jdbc.update(
          "UPDATE past_paper_item SET status = 'APPROVED', reviewed_by = ? WHERE item_id = ?",
          principal.accountId(),
          itemId);
      return patchPastPaperItem(principal, itemId, Map.of());
    }

    long specificationId = ((Number) item.get("specificationId")).longValue();
    Long topicId =
        item.get("proposedTopicId") != null
            ? ((Number) item.get("proposedTopicId")).longValue()
            : jdbc.query(
                """
                SELECT topic_id FROM spec_topic
                WHERE specification_id = ? AND topic_level = 1
                ORDER BY display_order NULLS LAST, topic_id LIMIT 1
                """,
                rs -> rs.next() ? rs.getLong(1) : null,
                specificationId);
    if (topicId == null) {
      throw AppException.badRequest(
          ProblemCode.VALIDATION_FAILED, "No topic available to attach approved past-paper item");
    }

    String qRef = item.get("qRef").toString();
    String sourceRef =
        String.format(
            "%s %s %s Q%s",
            item.get("paperCode"),
            item.get("series"),
            item.get("examYear"),
            qRef);
    String questionText =
        item.get("rawText") != null && !item.get("rawText").toString().isBlank()
            ? item.get("rawText").toString()
            : "Past paper item " + sourceRef;
    String tier =
        item.get("tier") != null && !item.get("tier").toString().isBlank()
            ? mapTier(item.get("tier").toString())
            : "HIGHER";
    short marks = 2;

    Long questionId = jdbc.query(
        """
        INSERT INTO question (
          specification_id, topic_id, source_type, source_reference, past_paper_id,
          tier, marks_available, question_type, command_word, question_text,
          answer_format, review_status, licence_status, reviewed_by, reviewed_at
        ) VALUES (
          ?, ?, 'REAL_PAST_PAPER', ?, ?,
          ?, ?, 'SHORT_ANSWER', 'State', ?,
          'TEXT', 'APPROVED', 'PENDING_BOARD_CONFIRMATION', ?, ?
        )
        RETURNING question_id
        """,
        rs -> rs.next() ? rs.getLong(1) : null,
        specificationId,
        topicId,
        sourceRef,
        item.get("paperId"),
        tier,
        marks,
        questionText,
        principal.accountId(),
        SqlTime.ts(clock.instant()));

    jdbc.update(
        """
        INSERT INTO mark_scheme (question_id, scheme_type, total_marks, marking_points_json, model_answer, origin)
        VALUES (?, 'POINTS', ?, '[{"id":"mp1","marks":2,"point":"Accept valid chemistry response"}]'::jsonb,
                ?, 'OFFICIAL')
        """,
        questionId,
        marks,
        "See official mark scheme for " + sourceRef);

    jdbc.update(
        """
        UPDATE past_paper_item
        SET status = 'APPROVED', reviewed_by = ?, question_id = ?
        WHERE item_id = ?
        """,
        principal.accountId(),
        questionId,
        itemId);

    embeddings.upsertForQuestion(questionId, "PAST_PAPER");

    Map<String, Object> out = patchPastPaperItem(principal, itemId, Map.of());
    out.put("questionId", questionId);
    out.put("sourceReference", sourceRef);
    return out;
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
    putIfPresent(rs, m, "licence_notes", "licenceNotes");
    putIfPresent(rs, m, "file_key_paper", "fileKeyPaper");
    putIfPresent(rs, m, "file_key_mark_scheme", "fileKeyMarkScheme");
    putIfPresent(rs, m, "file_key_examiner_report", "fileKeyExaminerReport");
    putIfPresent(rs, m, "sha256_paper", "sha256Paper");
    putIfPresent(rs, m, "tier", "tier");
    return m;
  }

  private static void putIfPresent(
      java.sql.ResultSet rs, Map<String, Object> m, String column, String jsonKey)
      throws java.sql.SQLException {
    try {
      rs.findColumn(column);
      m.put(jsonKey, rs.getString(column));
    } catch (java.sql.SQLException ignored) {
      /* column not in this select */
    }
  }

  private static String mapTier(String tier) {
    return switch (tier.toUpperCase()) {
      case "FOUNDATION", "HIGHER", "CORE", "EXTENDED" -> tier.toUpperCase();
      case "BOTH", "NONE", "UNKNOWN" -> "SINGLE_TIER";
      default -> "HIGHER";
    };
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

  private static String optionalString(Map<String, Object> body, String key) {
    if (body.get(key) == null || body.get(key).toString().isBlank()) {
      return null;
    }
    return body.get(key).toString();
  }
}
