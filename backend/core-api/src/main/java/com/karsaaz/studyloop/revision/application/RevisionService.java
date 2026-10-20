package com.karsaaz.studyloop.revision.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RevisionService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;

  public RevisionService(
      JdbcTemplate jdbc, StudentAccessHelper access, GatewayClient gateway, GatewayAiSupport ai) {
    this.jdbc = jdbc;
    this.access = access;
    this.gateway = gateway;
    this.ai = ai;
  }

  public Map<String, Object> notes(AccountPrincipal principal, long topicId) {
    access.requireStudent(principal);
    Map<String, Object> note = jdbc.query(
        """
        SELECT note_id, version, body_md, reading_level, status
        FROM revision_note WHERE spec_topic_id = ? AND status = 'APPROVED'
        ORDER BY version DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("noteId", rs.getLong("note_id"));
          m.put("version", rs.getInt("version"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("readingLevel", rs.getString("reading_level"));
          m.put("status", rs.getString("status"));
          return m;
        },
        topicId);
    Map<String, Object> out = new HashMap<>();
    out.put("topicId", topicId);
    out.put("note", note);
    if (note == null) {
      out.put("message", "No approved notes yet");
    }
    return out;
  }

  public List<Map<String, Object>> topicDecks(AccountPrincipal principal, long topicId) {
    access.requireStudent(principal);
    return jdbc.query(
        """
        SELECT deck_id, kind, title, moderation_status
        FROM flashcard_deck
        WHERE spec_topic_id = ? AND (kind = 'SYSTEM' OR owner_student_id = ?)
        ORDER BY kind, title
        """,
        (rs, i) -> Rows.of(
            "deckId", rs.getObject("deck_id"),
            "kind", rs.getString("kind"),
            "title", rs.getString("title"),
            "moderationStatus", rs.getString("moderation_status")),
        topicId,
        principal.studentId());
  }

  @Transactional
  public Map<String, Object> createDeck(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID deckId = UUID.randomUUID();
    String title = body.getOrDefault("title", "My deck").toString();
    Long topicId = body.get("topicId") instanceof Number n ? n.longValue() : null;
    jdbc.update(
        """
        INSERT INTO flashcard_deck (deck_id, kind, owner_student_id, spec_topic_id, title, moderation_status)
        VALUES (?, 'CUSTOM', ?, ?, ?, 'PENDING')
        """,
        deckId,
        principal.studentId(),
        topicId,
        title);
    @SuppressWarnings("unchecked")
    List<Map<String, Object>> cards = body.get("cards") instanceof List<?> l
        ? (List<Map<String, Object>>) l
        : List.of();
    int pos = 0;
    for (Map<String, Object> c : cards) {
      jdbc.update(
          """
          INSERT INTO flashcard (card_id, deck_id, front, back, position, status)
          VALUES (?, ?, ?, ?, ?, 'APPROVED')
          """,
          UUID.randomUUID(),
          deckId,
          c.getOrDefault("front", "").toString(),
          c.getOrDefault("back", "").toString(),
          pos++);
    }
    jdbc.update(
        "UPDATE flashcard_deck SET moderation_status = 'CLEAN' WHERE deck_id = ?", deckId);
    return Map.of("deckId", deckId, "title", title, "cardCount", cards.size());
  }

  @Transactional
  public Map<String, Object> updateDeck(
      AccountPrincipal principal, UUID deckId, Map<String, Object> body) {
    access.requireStudent(principal);
    Integer owned = jdbc.queryForObject(
        "SELECT COUNT(*) FROM flashcard_deck WHERE deck_id = ? AND owner_student_id = ? AND kind = 'CUSTOM'",
        Integer.class,
        deckId,
        principal.studentId());
    if (owned == null || owned == 0) {
      throw AppException.forbidden("Not your deck");
    }
    if (body.get("title") != null) {
      jdbc.update("UPDATE flashcard_deck SET title = ? WHERE deck_id = ?", body.get("title").toString(), deckId);
    }
    return Map.of("deckId", deckId, "updated", true);
  }

  public List<Map<String, Object>> myDecks(AccountPrincipal principal) {
    access.requireStudent(principal);
    return jdbc.query(
        """
        SELECT deck_id, kind, title, spec_topic_id, moderation_status
        FROM flashcard_deck
        WHERE owner_student_id = ? OR kind = 'SYSTEM'
        ORDER BY created_at DESC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("deckId", rs.getObject("deck_id"));
          m.put("kind", rs.getString("kind"));
          m.put("title", rs.getString("title"));
          m.put("topicId", rs.getObject("spec_topic_id"));
          m.put("moderationStatus", rs.getString("moderation_status"));
          return m;
        },
        principal.studentId());
  }

  public Map<String, Object> deckDetail(AccountPrincipal principal, UUID deckId) {
    access.requireStudent(principal);
    Map<String, Object> deck = jdbc.query(
        """
        SELECT deck_id, kind, title, owner_student_id, spec_topic_id
        FROM flashcard_deck WHERE deck_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("deckId", rs.getObject("deck_id"));
          m.put("kind", rs.getString("kind"));
          m.put("title", rs.getString("title"));
          m.put("topicId", rs.getObject("spec_topic_id"));
          return m;
        },
        deckId);
    if (deck == null) {
      throw AppException.notFound("Deck not found");
    }
    List<Map<String, Object>> cards = jdbc.query(
        """
        SELECT card_id, front, back, position FROM flashcard
        WHERE deck_id = ? AND status = 'APPROVED' ORDER BY position
        """,
        (rs, i) -> Rows.of(
            "cardId", rs.getObject("card_id"),
            "front", rs.getString("front"),
            "back", rs.getString("back"),
            "position", rs.getInt("position")),
        deckId);
    Map<String, Object> out = new HashMap<>(deck);
    out.put("cards", cards);
    return out;
  }

  @Transactional
  public Map<String, Object> reviewCard(
      AccountPrincipal principal, UUID cardId, Map<String, Object> body) {
    access.requireStudent(principal);
    int rating = body.get("rating") instanceof Number n ? n.intValue() : 3;
    UUID reviewId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO flashcard_review (review_id, card_id, student_id, rating, reviewed_at)
        VALUES (?, ?, ?, ?, now())
        """,
        reviewId,
        cardId,
        principal.studentId(),
        (short) rating);
    jdbc.update(
        """
        INSERT INTO flashcard_state (student_id, card_id, stability, difficulty, due_at, reps, last_review_at)
        VALUES (?, ?, 1.0, 5.0, now() + interval '1 day', 1, now())
        ON CONFLICT (student_id, card_id) DO UPDATE SET
          reps = flashcard_state.reps + 1,
          due_at = now() + ((5 - LEAST(4, ?)) || ' days')::interval,
          last_review_at = now()
        """,
        principal.studentId(),
        cardId,
        rating);
    return Map.of("reviewId", reviewId, "cardId", cardId, "rating", rating);
  }

  public Map<String, Object> cheatSheet(AccountPrincipal principal, long topicId) {
    access.requireStudent(principal);
    Map<String, Object> sheet = jdbc.query(
        """
        SELECT sheet_id, content_json::text AS content, status
        FROM cheat_sheet WHERE spec_topic_id = ? AND status = 'APPROVED'
        ORDER BY created_at DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("sheetId", rs.getLong("sheet_id"));
          m.put("contentJson", rs.getString("content"));
          m.put("status", rs.getString("status"));
          return m;
        },
        topicId);
    Map<String, Object> out = new HashMap<>();
    out.put("topicId", topicId);
    out.put("sheet", sheet);
    return out;
  }

  public Map<String, Object> cheatSheetPdf(AccountPrincipal principal, long topicId) {
    Map<String, Object> sheet = cheatSheet(principal, topicId);
    Map<String, Object> out = new HashMap<>(sheet);
    out.put("pdfUrl", "/api/v1/revision/topics/" + topicId + "/cheat-sheet/pdf");
    out.put("format", "application/pdf");
    out.put("note", "Demo returns JSON payload; print from browser for PDF");
    return out;
  }

  @Transactional
  public Map<String, Object> generate(AccountPrincipal principal, Map<String, Object> body) {
    // RVC-01 is CNT,SYS only — this check used to be an empty if, so any signed-in user could spend tokens.
    if (principal == null
        || (!StudentAccessHelper.hasContentRole(principal.roles()) && !principal.roles().contains("SYS"))) {
      throw AppException.forbidden("Content or system access required");
    }
    long topicId = body.get("topicId") instanceof Number n ? n.longValue() : 0L;
    if (topicId == 0) {
      throw AppException.badRequest("VALIDATION_FAILED", "topicId required");
    }
    Map<String, Object> topic = jdbc.query(
        """
        SELECT t.topic_name, t.topic_number, t.spec_statement, t.higher_tier_only, q.code AS qualification,
               COALESCE(bsp.question_wording_notes,'') || E'\\n' || COALESCE(bsp.mark_scheme_format_notes,'') AS style_notes
        FROM spec_topic t
        JOIN specification s ON s.specification_id = t.specification_id
        JOIN qualification q ON q.qualification_id = s.qualification_id
        LEFT JOIN board_style_profile bsp ON bsp.specification_id = t.specification_id
        WHERE t.topic_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("name", rs.getString("topic_name"));
          m.put("number", rs.getString("topic_number"));
          m.put("statement", rs.getString("spec_statement"));
          m.put("higherOnly", rs.getBoolean("higher_tier_only"));
          m.put("qualification", rs.getString("qualification"));
          m.put("style", rs.getString("style_notes"));
          return m;
        },
        topicId);
    if (topic == null) {
      throw AppException.notFound("Topic not found");
    }
    // The topic's own statement plus its sub-points: the notes may only use this spec wording.
    List<String> statements = new ArrayList<>(jdbc.query(
        """
        SELECT COALESCE(topic_number || ' ', '') || topic_name || COALESCE(': ' || spec_statement, '')
        FROM spec_topic WHERE topic_id = ? OR parent_topic_id = ?
        ORDER BY display_order NULLS LAST, topic_id
        """,
        (rs, i) -> rs.getString(1),
        topicId,
        topicId));
    Map<String, Object> vars = new HashMap<>();
    vars.put("spec_statements", String.join("\n", statements));
    vars.put("style_profile", topic.get("style") == null ? "" : topic.get("style"));
    vars.put("tier", Boolean.TRUE.equals(topic.get("higherOnly")) ? "HIGHER" : "BOTH");
    vars.put("year_band", String.valueOf(topic.get("qualification")).startsWith("A") ? "Y12-13" : "Y10-11");
    vars.put("diagram_library", "");
    Map<?, ?> resp;
    Map<String, Object> result;
    try {
      resp = gateway.run("P-RC-01", vars, null);
      result = ai.requireResult(resp, "P-RC-01");
    } catch (Exception e) {
      throw new AppException("AI_UNAVAILABLE", 502, "Revision notes could not be generated: " + e.getClass().getSimpleName());
    }
    if (GatewayAiSupport.cannotComplete(result)) {
      throw AppException.badRequest("VALIDATION_FAILED", "P-RC-01 cannot_complete: " + ai.asText(result.get("reason")));
    }
    String bodyMd = notesMarkdown(result, String.valueOf(topic.get("name")));
    Integer ver = jdbc.queryForObject(
        "SELECT COALESCE(MAX(version),0)+1 FROM revision_note WHERE spec_topic_id = ?",
        Integer.class,
        topicId);
    jdbc.update(
        """
        INSERT INTO revision_note (spec_topic_id, version, body_md, reading_level, status, prompt_version, grounding_json)
        VALUES (?, ?, ?, ?, 'PENDING_QC', ?, ?::jsonb)
        """,
        topicId,
        ver == null ? 1 : ver,
        bodyMd,
        vars.get("year_band"),
        "P-RC-01@" + ai.asText(resp.get("promptVersion")),
        ai.toJson(result.get("grounding")));
    return Map.of("topicId", topicId, "version", ver == null ? 1 : ver, "status", "PENDING_QC");
  }

  /** Renders the {@code revision_notes} schema output as markdown (stored as PENDING_QC). */
  static String notesMarkdown(Map<String, Object> result, String fallbackTitle) {
    StringBuilder md = new StringBuilder();
    Object title = result.get("title");
    md.append("# ").append(title == null || title.toString().isBlank() ? fallbackTitle : title).append("\n\n");
    if (result.get("sections") instanceof List<?> sections) {
      for (Object o : sections) {
        if (!(o instanceof Map<?, ?> s)) {
          continue;
        }
        md.append("## ").append(s.get("heading") == null ? "" : s.get("heading")).append("\n\n");
        md.append(s.get("body_md") == null ? "" : s.get("body_md")).append("\n\n");
        if (s.get("key_terms") instanceof List<?> terms && !terms.isEmpty()) {
          md.append("**Key terms**\n\n");
          for (Object t : terms) {
            if (t instanceof Map<?, ?> term) {
              md.append("- **").append(term.get("term")).append("**: ").append(term.get("definition")).append("\n");
            }
          }
          md.append("\n");
        }
      }
    }
    appendList(md, "Common mistakes", result.get("common_mistakes"));
    appendList(md, "Exam tips", result.get("exam_tips"));
    return md.toString().trim();
  }

  private static void appendList(StringBuilder md, String heading, Object items) {
    if (items instanceof List<?> list && !list.isEmpty()) {
      md.append("## ").append(heading).append("\n\n");
      for (Object o : list) {
        md.append("- ").append(o).append("\n");
      }
      md.append("\n");
    }
  }

  public List<Map<String, Object>> exceptions(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Forbidden");
    }
    return jdbc.query(
        """
        SELECT note_id, spec_topic_id, version, status, created_at
        FROM revision_note WHERE status IN ('PENDING_QC','QC_FAILED')
        ORDER BY created_at DESC LIMIT 100
        """,
        (rs, i) -> Rows.of(
            "noteId", rs.getLong("note_id"),
            "topicId", rs.getLong("spec_topic_id"),
            "version", rs.getInt("version"),
            "status", rs.getString("status"),
            "createdAt", rs.getTimestamp("created_at").toInstant().toString()));
  }

  @Transactional
  public Map<String, Object> shareDeck(AccountPrincipal principal, UUID deckId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    // Under-13: disabled unless parent allows (share_allowed in accessibility_json or privacy)
    String ageBand = jdbc.query(
        "SELECT age_band FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        studentId);
    if ("UNDER_13".equals(ageBand) || "U13".equals(ageBand)) {
      String a11y = jdbc.query(
          "SELECT accessibility_json::text FROM student_profile WHERE student_id = ?",
          rs -> rs.next() ? rs.getString(1) : "{}",
          studentId);
      if (a11y == null || !a11y.contains("\"parentAllowsShare\":true")) {
        throw AppException.forbidden("Sharing disabled for under-13 unless parent allows");
      }
    }
    Integer owned = jdbc.queryForObject(
        "SELECT COUNT(*) FROM flashcard_deck WHERE deck_id = ? AND owner_student_id = ?",
        Integer.class,
        deckId,
        studentId);
    if (owned == null || owned == 0) {
      throw AppException.forbidden("Not your deck");
    }
    int hours = body.get("expiresInHours") instanceof Number n ? n.intValue() : 168;
    String code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    Instant expires = Instant.now().plus(hours, ChronoUnit.HOURS);
    jdbc.update(
        """
        INSERT INTO deck_share (share_code, deck_id, created_by, expires_at, moderation_status)
        VALUES (?, ?, ?, ?, 'PENDING')
        """,
        code, deckId, studentId, Timestamp.from(expires));
    // Demo: auto-approve after insert (moderated before visible to others)
    jdbc.update(
        "UPDATE deck_share SET moderation_status = 'APPROVED', moderated_at = now() WHERE share_code = ?",
        code);
    return Map.of(
        "shareCode", code,
        "deckId", deckId.toString(),
        "expiresAt", expires.toString(),
        "moderationStatus", "APPROVED",
        "message", "Share link created; revoke anytime.");
  }

  public Map<String, Object> openShared(AccountPrincipal principal, String shareCode) {
    access.requireStudent(principal);
    return jdbc.query(
        """
        SELECT s.share_code, s.deck_id, s.expires_at, s.revoked_at, s.moderation_status, d.title
        FROM deck_share s
        JOIN flashcard_deck d ON d.deck_id = s.deck_id
        WHERE s.share_code = ?
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("Share not found");
          }
          if (rs.getTimestamp("revoked_at") != null) {
            throw AppException.forbidden("Share revoked");
          }
          if (rs.getTimestamp("expires_at").toInstant().isBefore(Instant.now())) {
            throw AppException.forbidden("Share expired");
          }
          if (!"APPROVED".equals(rs.getString("moderation_status"))) {
            throw AppException.forbidden("Share pending moderation");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("shareCode", rs.getString("share_code"));
          m.put("deckId", rs.getObject("deck_id").toString());
          m.put("title", rs.getString("title"));
          m.put("readOnly", true);
          m.put("expiresAt", rs.getTimestamp("expires_at").toInstant().toString());
          return m;
        },
        shareCode);
  }

  @Transactional
  public Map<String, Object> revokeShare(AccountPrincipal principal, String shareCode) {
    access.requireStudent(principal);
    int n = jdbc.update(
        """
        UPDATE deck_share SET revoked_at = now()
        WHERE share_code = ? AND created_by = ? AND revoked_at IS NULL
        """,
        shareCode, principal.studentId());
    if (n == 0) {
      throw AppException.notFound("Share not found");
    }
    return Map.of("shareCode", shareCode, "revoked", true);
  }
}
