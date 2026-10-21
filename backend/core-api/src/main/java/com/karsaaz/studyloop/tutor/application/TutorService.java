package com.karsaaz.studyloop.tutor.application;

import com.karsaaz.studyloop.common.db.Rows;
import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.content.infra.ObjectStorageService;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import com.karsaaz.studyloop.safety.application.SafetyService;
import com.karsaaz.studyloop.safety.domain.SafetyDecision;
import java.io.ByteArrayInputStream;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TutorService {
  private static final Logger log = LoggerFactory.getLogger(TutorService.class);

  static final int HISTORY_TURNS = 8;
  static final int MAX_WORDS = 120;
  static final int MAX_VOICE_WORDS = 60;
  static final int MAX_MESSAGE_CHARS = 2000;
  static final int MAX_PHOTO_BYTES = 3 * 1024 * 1024;
  private static final String STUB_REPLY =
      "Let's think about the next step together. What do you already know about this topic?";

  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final SafetyService safety;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final ObjectStorageService storage;
  private final boolean allowLocalStub;

  public TutorService(
      JdbcTemplate jdbc,
      StudentAccessHelper access,
      SafetyService safety,
      GatewayClient gateway,
      GatewayAiSupport ai,
      ObjectStorageService storage,
      @Value("${studyloop.marking.allow-local-stub:false}") boolean allowLocalStub) {
    this.jdbc = jdbc;
    this.access = access;
    this.safety = safety;
    this.gateway = gateway;
    this.ai = ai;
    this.storage = storage;
    this.allowLocalStub = allowLocalStub;
  }

  @Transactional
  public Map<String, Object> startSession(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    assertChatAllowed(studentId);
    UUID sessionId = UUID.randomUUID();
    short persona = jdbc.query(
        "SELECT visual_tier FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getShort(1) : (short) 2,
        studentId);
    Long topicId = optionalLong(body.get("topicId"));
    Long questionId = optionalLong(body.get("questionId"));
    if (questionId != null && topicId == null) {
      topicId = jdbc.query(
          "SELECT topic_id FROM question WHERE question_id = ?",
          rs -> rs.next() ? rs.getLong(1) : null,
          questionId);
      if (topicId == null) {
        throw AppException.notFound("Question not found");
      }
    }
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status, topic_id, question_id)
        VALUES (?, ?, 'CHAT', ?, ?, 'ACTIVE', ?, ?)
        """,
        sessionId, studentId, body.getOrDefault("mode", "SOCRATIC").toString(), persona, topicId, questionId);
    return Map.of("tutorSessionId", sessionId.toString(), "status", "ACTIVE", "channel", "CHAT");
  }

  @Transactional
  public Map<String, Object> postMessage(AccountPrincipal principal, UUID tutorSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    SessionRow session = loadOwnedSession(studentId, tutorSessionId);
    if ("BLOCKED".equals(session.status())) {
      throw AppException.conflict("SESSION_PAUSED", "This tutor session is paused. Please start a new session.");
    }
    if (!"ACTIVE".equals(session.status())) {
      throw AppException.conflict("SESSION_ENDED", "This tutor session has ended.");
    }
    assertChatAllowed(studentId);
    // "message" is accepted for older web clients.
    String text = String.valueOf(body.getOrDefault("text", body.getOrDefault("message", ""))).trim();
    if (text.isEmpty()) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Message text is required");
    }
    if (text.length() > MAX_MESSAGE_CHARS) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Message is too long");
    }
    String redacted = GatewayAiSupport.redactPii(text);
    List<Map<String, String>> history = recentHistory(tutorSessionId);
    String yearBand = yearBand(studentId);

    Map<String, Object> safetyIn =
        safety.classifyLearnerInput(studentId, tutorSessionId, text, formatHistory(history, 3), yearBand);
    int seq = nextSeq(tutorSessionId);
    Instant expires = Instant.now().plus(90, ChronoUnit.DAYS);
    String inAction = String.valueOf(safetyIn.get("action"));
    boolean inputStopped = !"ALLOW".equals(inAction);
    insertMessage(tutorSessionId, seq, "STUDENT", text, redacted, inputStopped, expires);
    if (inputStopped) {
      return stopTurn(tutorSessionId, seq + 1, inAction, safetyIn, expires);
    }

    Map<String, Object> context = sessionContext(studentId, session);
    boolean liveQuestion = session.questionId() != null;
    String reply;
    String pedagogyMove = null;
    String suggestedNext = null;
    try {
      Map<String, Object> vars = new HashMap<>();
      vars.put("session_context", context);
      vars.put("history", formatHistory(history, HISTORY_TURNS));
      vars.put("student_message", redacted);
      // Voice turns: the gateway adds the P-VO-01 spoken-style overlay; replies stay short to speak.
      boolean voice = "VOICE".equals(jdbc.query(
          "SELECT channel FROM tutor_session WHERE tutor_session_id = ?",
          rs -> rs.next() ? rs.getString(1) : null,
          tutorSessionId));
      vars.put("channel", voice ? "VOICE" : "CHAT");
      vars.put("max_words", voice ? MAX_VOICE_WORDS : MAX_WORDS);
      Map<String, Object> result = ai.requireResult(gateway.run("P-TU-01", vars, null), "P-TU-01");
      if (GatewayAiSupport.cannotComplete(result)) {
        throw new IllegalStateException("P-TU-01 cannot_complete");
      }
      // D-15: names reach the model only as {{child_name}}; code fills them in afterwards.
      reply = ai.asText(result.get("reply_text")).trim().replace("{{child_name}}", displayName(studentId));
      pedagogyMove = ai.asText(result.get("pedagogy_move"));
      suggestedNext = ai.asText(result.get("suggested_next"));
      if (Boolean.TRUE.equals(result.get("needs_safety_review"))) {
        // The tutor model sensed a concern the classifiers missed: scripted pause + DSL flag.
        Map<String, Object> concern = safety.flagTutorConcern(studentId, tutorSessionId, text);
        return stopTurn(tutorSessionId, seq + 1, "SCRIPTED_SUPPORT_AND_ESCALATE", concern, expires);
      }
      if (liveQuestion && Boolean.TRUE.equals(result.get("reveals_final_answer"))) {
        reply = SafetyDecision.script(SafetyDecision.REDIRECT_TEMPLATE);
      }
    } catch (AppException e) {
      throw e;
    } catch (Exception e) {
      if (!allowLocalStub) {
        log.warn("Tutor turn failed for session {}: {}", tutorSessionId, e.getClass().getSimpleName());
        throw new AppException("AI_UNAVAILABLE", 502, "The tutor is unavailable right now. Please try again.");
      }
      reply = STUB_REPLY;
    }

    Map<String, Object> safetyOut =
        safety.classifyTutorOutput(
            studentId, tutorSessionId, redacted, reply, liveQuestion, finalAnswerKnown(session.questionId()));
    String outAction = String.valueOf(safetyOut.get("action"));
    boolean outputStopped = !"ALLOW".equals(outAction);
    if (outputStopped) {
      reply = String.valueOf(safetyOut.get("scriptedText"));
      if ("SCRIPTED_SUPPORT_AND_ESCALATE".equals(outAction)) {
        jdbc.update("UPDATE tutor_session SET status = 'BLOCKED' WHERE tutor_session_id = ?", tutorSessionId);
      }
    }
    UUID tutorMsg = insertMessage(tutorSessionId, seq + 1, "TUTOR", reply, reply, outputStopped, expires);
    jdbc.update("UPDATE tutor_session SET turn_count = turn_count + 1 WHERE tutor_session_id = ?", tutorSessionId);
    Map<String, Object> out = new HashMap<>();
    out.put("messageId", tutorMsg.toString());
    out.put("text", reply);
    out.put("blocked", outputStopped);
    out.put("pedagogyMove", pedagogyMove);
    out.put("suggestedNext", suggestedNext);
    return out;
  }

  public Map<String, Object> getSession(AccountPrincipal principal, UUID tutorSessionId) {
    UUID studentId = jdbc.query(
        "SELECT student_id FROM tutor_session WHERE tutor_session_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        tutorSessionId);
    if (studentId == null) throw AppException.notFound("Session not found");
    access.assertParentOrStudent(principal, studentId);
    Map<String, Object> session = jdbc.query(
        "SELECT tutor_session_id, status, channel, mode, turn_count, started_at FROM tutor_session WHERE tutor_session_id = ?",
        rs -> {
          rs.next();
          Map<String, Object> m = new HashMap<>();
          m.put("tutorSessionId", rs.getObject(1).toString());
          m.put("status", rs.getString(2));
          m.put("channel", rs.getString(3));
          m.put("mode", rs.getString(4));
          m.put("turnCount", rs.getInt(5));
          m.put("startedAt", rs.getTimestamp(6));
          return m;
        },
        tutorSessionId);
    List<Map<String, Object>> messages = jdbc.query(
        """
        SELECT message_id, seq, role, content_text, blocked, created_at
        FROM tutor_message WHERE tutor_session_id = ? ORDER BY seq
        """,
        (rs, i) -> Rows.of(
            "messageId", rs.getObject(1).toString(),
            "seq", rs.getInt(2),
            "role", rs.getString(3),
            "text", rs.getString(4) == null ? "" : rs.getString(4),
            "blocked", rs.getBoolean(5),
            "createdAt", rs.getTimestamp(6).toString()),
        tutorSessionId);
    return Map.of("session", session, "messages", messages);
  }

  @Transactional
  public Map<String, Object> endSession(AccountPrincipal principal, UUID tutorSessionId) {
    access.requireStudent(principal);
    loadOwnedSession(principal.studentId(), tutorSessionId);
    jdbc.update("UPDATE tutor_session SET status = 'ENDED', ended_at = now() WHERE tutor_session_id = ?", tutorSessionId);
    return Map.of("status", "ENDED");
  }

  @Transactional
  public Map<String, Object> reexplain(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    return Map.of(
        "format", body.getOrDefault("format", "WORKED_EXAMPLE"),
        "text", "Here is another way to see it: start from what the question asks, then check units, then compute.");
  }

  @Transactional
  public Map<String, Object> explainBack(AccountPrincipal principal, UUID tutorSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    return postMessage(principal, tutorSessionId, Map.of("text", body.getOrDefault("explanation", "")));
  }

  /** TUT-08 (SYS): engagement service opens a confusion-rescue session. */
  @Transactional
  public Map<String, Object> rescue(AccountPrincipal principal, Map<String, Object> body) {
    if (principal == null || !principal.roles().contains("SYS")) {
      throw AppException.forbidden("System access required");
    }
    Object sid = body.get("studentId");
    if (sid == null) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "studentId required");
    }
    UUID studentId = UUID.fromString(sid.toString());
    UUID sessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'CHAT', 'RESCUE', 2, 'ACTIVE')
        """,
        sessionId, studentId);
    Map<String, Object> out = new HashMap<>();
    out.put("tutorSessionId", sessionId.toString());
    out.put("mode", "RESCUE");
    out.put("nudgeId", body.get("nudgeId") == null ? null : UUID.fromString(body.get("nudgeId").toString()));
    return out;
  }

  /**
   * F-08: photo of a stuck (unattempted) question → guided steps via P-TU-06 (vision). The client
   * masks/crops identity details and confirms it; only the masked image reaches the server.
   */
  @Transactional
  public Map<String, Object> photoWalkthrough(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    assertChatAllowed(studentId);
    Object maskReport = body.get("maskReport");
    if (!(maskReport instanceof Map<?, ?> mask) || !Boolean.TRUE.equals(mask.get("user_confirmed_crop"))) {
      throw AppException.badRequest("MASK_REQUIRED", "Confirm that your name, school and candidate number are covered (PRA-06 rules)");
    }
    byte[] image = decodeImage(body.get("imageBase64"));
    String mediaType = isJpeg(image) ? "image/jpeg" : "image/png";

    UUID photoId = UUID.randomUUID();
    String storageKey = "stuck-photos/" + photoId + (isJpeg(image) ? ".jpg" : ".png");
    storage.putLocal(storageKey, new ByteArrayInputStream(image));
    jdbc.update(
        """
        INSERT INTO answer_photo (photo_id, student_id, storage_key, mask_report_json, purpose, retention_until)
        VALUES (?, ?, ?, ?::jsonb, 'STUCK_QUESTION', ?)
        """,
        photoId,
        studentId,
        storageKey,
        ai.toJson(maskReport),
        Timestamp.from(Instant.now().plus(30, ChronoUnit.DAYS)));

    Map<String, Object> result;
    try {
      Map<String, Object> vars = new HashMap<>();
      vars.put("image_base64", "data:" + mediaType + ";base64," + Base64.getEncoder().encodeToString(image));
      vars.put("session_context", walkthroughContext(studentId));
      result = ai.requireResult(gateway.run("P-TU-06", vars, null), "P-TU-06");
    } catch (Exception e) {
      log.warn("Photo walkthrough failed for photo {}: {}", photoId, e.getClass().getSimpleName());
      throw new AppException("AI_UNAVAILABLE", 502, "We couldn't read that photo right now. Please try again.");
    }
    if (GatewayAiSupport.cannotComplete(result)) {
      throw AppException.badRequest("PHOTO_UNREADABLE", "We couldn't read the question in that photo. Try a clearer, closer photo.");
    }

    List<Map<String, Object>> steps = new ArrayList<>();
    StringBuilder text = new StringBuilder();
    for (Map<String, Object> s : ai.asMapList(result.get("steps"))) {
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("stepNo", ai.asInt(s.get("step_no"), steps.size() + 1));
      step.put("guidance", ai.asText(s.get("guidance")));
      step.put("promptToStudent", ai.asText(s.get("prompt_to_student")));
      steps.add(step);
      text.append("Step ").append(step.get("stepNo")).append(": ").append(step.get("guidance"))
          .append("\n").append(step.get("promptToStudent")).append("\n");
    }
    String understood = ai.asText(result.get("question_understood_as"));

    UUID tutorSessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'CHAT', 'WALKTHROUGH', 2, 'ACTIVE')
        """,
        tutorSessionId, studentId);
    Map<String, Object> safetyOut =
        safety.classifyTutorOutput(studentId, tutorSessionId, understood, text.toString(), true, null);
    boolean stopped = !"ALLOW".equals(String.valueOf(safetyOut.get("action")));
    Instant expires = Instant.now().plus(90, ChronoUnit.DAYS);
    String shown = stopped ? String.valueOf(safetyOut.get("scriptedText")) : text.toString().trim();
    insertMessage(tutorSessionId, 1, "TUTOR", shown, "[WALKTHROUGH]", stopped, expires);

    Map<String, Object> out = new HashMap<>();
    out.put("tutorSessionId", tutorSessionId.toString());
    out.put("photoId", photoId.toString());
    out.put("fullAnswerRevealed", false);
    if (stopped) {
      out.put("blocked", true);
      out.put("walkthrough", shown);
      out.put("steps", List.of());
      return out;
    }
    out.put("blocked", false);
    out.put("questionUnderstoodAs", understood);
    out.put("askStudentToConfirm", Boolean.TRUE.equals(result.get("ask_student_to_confirm")));
    out.put("transcriptionConfidence", ai.asDouble(result.get("transcription_confidence"), 0));
    out.put("steps", steps);
    out.put("walkthrough", shown);
    return out;
  }

  // ---------------------------------------------------------------- helpers

  private record SessionRow(String status, Long topicId, Long questionId, String mode, int turnCount) {}

  private Map<String, Object> stopTurn(
      UUID tutorSessionId, int seq, String action, Map<String, Object> safetyResult, Instant expires) {
    String script = String.valueOf(safetyResult.get("scriptedText"));
    insertMessage(tutorSessionId, seq, "SYSTEM", script, null, true, expires);
    if ("SCRIPTED_SUPPORT_AND_ESCALATE".equals(action)) {
      jdbc.update(
          "UPDATE tutor_session SET status = 'BLOCKED', turn_count = turn_count + 1 WHERE tutor_session_id = ?",
          tutorSessionId);
    } else {
      jdbc.update("UPDATE tutor_session SET turn_count = turn_count + 1 WHERE tutor_session_id = ?", tutorSessionId);
    }
    Map<String, Object> out = new HashMap<>();
    out.put("blocked", true);
    out.put("text", script);
    out.put("scriptedText", script);
    out.put("templateId", safetyResult.get("templateId"));
    out.put("flagRef", safetyResult.get("flagRef"));
    out.put("sessionPaused", "SCRIPTED_SUPPORT_AND_ESCALATE".equals(action));
    // Classifier outage: the child may retry; nothing was escalated.
    out.put("retryable", "BLOCK".equals(action));
    return out;
  }

  private UUID insertMessage(
      UUID sessionId, int seq, String role, String content, String aiVisible, boolean blocked, Instant expires) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO tutor_message (message_id, tutor_session_id, seq, role, channel, content_text, ai_visible_text, blocked, expires_at)
        VALUES (?,?,?,?,(SELECT channel FROM tutor_session WHERE tutor_session_id = ?),?,?,?,?)
        """,
        id, sessionId, seq, role, sessionId, content, aiVisible, blocked, Timestamp.from(expires));
    return id;
  }

  /** Last turns the model may see: redacted text only, blocked turns excluded, oldest first. */
  private List<Map<String, String>> recentHistory(UUID sessionId) {
    List<Map<String, String>> newestFirst = jdbc.query(
        """
        SELECT role, ai_visible_text FROM tutor_message
        WHERE tutor_session_id = ? AND blocked = FALSE AND role IN ('STUDENT','TUTOR')
          AND ai_visible_text IS NOT NULL
        ORDER BY seq DESC LIMIT ?
        """,
        (rs, i) -> Map.of("role", rs.getString(1), "text", rs.getString(2)),
        sessionId,
        HISTORY_TURNS);
    List<Map<String, String>> out = new ArrayList<>(newestFirst);
    java.util.Collections.reverse(out);
    return out;
  }

  static String formatHistory(List<Map<String, String>> history, int maxTurns) {
    int from = Math.max(0, history.size() - maxTurns);
    StringBuilder b = new StringBuilder();
    for (Map<String, String> turn : history.subList(from, history.size())) {
      b.append("STUDENT".equals(turn.get("role")) ? "Student: " : "Tutor: ")
          .append(turn.get("text"))
          .append("\n");
    }
    return b.toString().trim();
  }

  /**
   * Strategy controller (P-TU-01 notes): code picks the teaching move band from mastery. Unknown
   * mastery (no topic yet, or a new learner) starts Socratic with guided hints, not a full explanation.
   */
  static String strategyFor(Double mastery) {
    if (mastery == null) {
      return "GUIDED_HINTS";
    }
    if (mastery < 0.35) {
      return "DIRECT_INSTRUCTION";
    }
    if (mastery < 0.6) {
      return "WORKED_EXAMPLE";
    }
    if (mastery < 0.8) {
      return "GUIDED_HINTS";
    }
    return "FULL_QUESTION";
  }

  static String masteryBand(Double mastery) {
    if (mastery == null) {
      return "UNKNOWN";
    }
    return mastery < 0.35 ? "LOW" : mastery < 0.6 ? "DEVELOPING" : mastery < 0.8 ? "SECURE" : "STRONG";
  }

  /** De-identified context: board/spec/topic/mastery only — no names, no ids (D-15). */
  private Map<String, Object> sessionContext(UUID studentId, SessionRow session) {
    Map<String, Object> ctx = new LinkedHashMap<>();
    jdbc.query(
        """
        SELECT b.code AS board, q.code AS qualification, s.spec_code, s.title, e.tier
        FROM student_enrolment e
        JOIN specification s ON s.specification_id = e.specification_id
        JOIN exam_board b ON b.board_id = s.board_id
        JOIN qualification q ON q.qualification_id = s.qualification_id
        WHERE e.student_id = ? AND e.status = 'ACTIVE'
        ORDER BY e.created_at DESC LIMIT 1
        """,
        rs -> {
          ctx.put("board", rs.getString("board"));
          ctx.put("qualification", rs.getString("qualification"));
          ctx.put("spec_code", rs.getString("spec_code"));
          ctx.put("subject", rs.getString("title"));
          ctx.put("tier", rs.getString("tier"));
        },
        studentId);
    ctx.put("year_band", yearBand(studentId));
    Double mastery = null;
    if (session.topicId() != null) {
      jdbc.query(
          "SELECT topic_number, topic_name FROM spec_topic WHERE topic_id = ?",
          rs -> {
            ctx.put("spec_point_ref", rs.getString(1));
            ctx.put("spec_point_title", rs.getString(2));
          },
          session.topicId());
      mastery = jdbc.query(
          "SELECT mastery_probability FROM mastery_state WHERE student_id = ? AND topic_id = ? AND model_type = 'BKT'",
          rs -> rs.next() ? rs.getDouble(1) : null,
          studentId,
          session.topicId());
    }
    ctx.put("mastery_band", masteryBand(mastery));
    // Rescue sessions explain directly (P-TU-05 intent); every other session follows the strategy band.
    boolean rescue = "RESCUE".equals(session.mode());
    ctx.put("mode", session.mode() == null ? "SOCRATIC" : session.mode());
    ctx.put("strategy", rescue ? "DIRECT_INSTRUCTION" : strategyFor(mastery));
    ctx.put("hint_level_so_far", session.turnCount());
    ctx.put("misconceptions_seen", List.of());
    if (session.questionId() != null) {
      jdbc.query(
          "SELECT question_text, marks_available FROM question WHERE question_id = ?",
          rs -> {
            ctx.put("current_question", rs.getString(1));
            ctx.put("current_question_marks", rs.getInt(2));
          },
          session.questionId());
    } else {
      ctx.put("current_question", null);
    }
    return ctx;
  }

  private Map<String, Object> walkthroughContext(UUID studentId) {
    Map<String, Object> ctx = new LinkedHashMap<>();
    jdbc.query(
        """
        SELECT b.code AS board, s.title, e.tier
        FROM student_enrolment e
        JOIN specification s ON s.specification_id = e.specification_id
        JOIN exam_board b ON b.board_id = s.board_id
        WHERE e.student_id = ? AND e.status = 'ACTIVE'
        ORDER BY e.created_at DESC LIMIT 1
        """,
        rs -> {
          ctx.put("board", rs.getString("board"));
          ctx.put("subject", rs.getString("title"));
          ctx.put("tier", rs.getString("tier"));
        },
        studentId);
    ctx.put("year_band", yearBand(studentId));
    return ctx;
  }

  /** Model answer used by P-SF-02 to catch answer leakage on a live question. */
  private String finalAnswerKnown(Long questionId) {
    if (questionId == null) {
      return null;
    }
    return jdbc.query(
        "SELECT model_answer FROM mark_scheme WHERE question_id = ? LIMIT 1",
        rs -> rs.next() ? rs.getString(1) : null,
        questionId);
  }

  private String displayName(UUID studentId) {
    String name = jdbc.query(
        "SELECT display_name FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        studentId);
    return name == null || name.isBlank() ? "you" : name;
  }

  private String yearBand(UUID studentId) {
    String year = jdbc.query(
        "SELECT year_group FROM student_profile WHERE student_id = ?",
        rs -> rs.next() ? rs.getString(1) : null,
        studentId);
    return year == null ? "UNKNOWN" : year;
  }

  static byte[] decodeImage(Object raw) {
    if (raw == null || raw.toString().isBlank()) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "imageBase64 is required");
    }
    String s = raw.toString();
    int comma = s.indexOf(',');
    if (s.startsWith("data:") && comma > 0) {
      s = s.substring(comma + 1);
    }
    byte[] bytes;
    try {
      bytes = Base64.getDecoder().decode(s.replaceAll("\\s", ""));
    } catch (IllegalArgumentException e) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "imageBase64 is not valid base64");
    }
    if (bytes.length == 0 || bytes.length > MAX_PHOTO_BYTES) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Photo must be under 3 MB");
    }
    if (!isJpeg(bytes) && !isPng(bytes)) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Photo must be a JPEG or PNG image");
    }
    return bytes;
  }

  static boolean isJpeg(byte[] b) {
    return b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
  }

  static boolean isPng(byte[] b) {
    return b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
  }

  private void assertChatAllowed(UUID studentId) {
    Boolean enabled = jdbc.query(
        "SELECT chat_enabled FROM parent_ai_controls WHERE student_id = ?",
        rs -> rs.next() ? rs.getBoolean(1) : true,
        studentId);
    if (Boolean.FALSE.equals(enabled)) {
      throw AppException.forbidden("Parent has disabled chat tutor");
    }
  }

  private SessionRow loadOwnedSession(UUID studentId, UUID sessionId) {
    SessionRow row = jdbc.query(
        """
        SELECT status, topic_id, question_id, mode, turn_count
        FROM tutor_session WHERE tutor_session_id = ? AND student_id = ?
        """,
        rs -> rs.next()
            ? new SessionRow(rs.getString(1), (Long) rs.getObject(2), (Long) rs.getObject(3), rs.getString(4), rs.getInt(5))
            : null,
        sessionId,
        studentId);
    if (row == null) {
      throw AppException.forbidden("Not your tutor session");
    }
    return row;
  }

  private int nextSeq(UUID sessionId) {
    Integer max = jdbc.queryForObject(
        "SELECT COALESCE(MAX(seq),0) FROM tutor_message WHERE tutor_session_id = ?", Integer.class, sessionId);
    return (max == null ? 0 : max) + 1;
  }

  private static Long optionalLong(Object v) {
    if (v == null || v.toString().isBlank()) {
      return null;
    }
    try {
      return Long.parseLong(v.toString().trim());
    } catch (NumberFormatException e) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid id: " + v);
    }
  }
}
