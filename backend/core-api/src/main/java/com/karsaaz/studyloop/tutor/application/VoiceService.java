package com.karsaaz.studyloop.tutor.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
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
public class VoiceService {
  private static final Logger log = LoggerFactory.getLogger(VoiceService.class);
  /** About a minute of Opus audio as base64; longer turns are refused before any vendor call. */
  static final int MAX_AUDIO_BASE64 = 2_500_000;

  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;
  private final TutorService tutor;

  public VoiceService(
      JdbcTemplate jdbc, StudentAccessHelper access, GatewayClient gateway, GatewayAiSupport ai, TutorService tutor) {
    this.jdbc = jdbc;
    this.access = access;
    this.gateway = gateway;
    this.ai = ai;
    this.tutor = tutor;
  }

  /**
   * One push-to-talk turn (J-01): speech → text (gateway STT) → the same safety-checked tutor turn as
   * chat (P-SF-01 → P-TU-01 + P-VO-01 → P-SF-02) → speech (gateway TTS). The transcript is stored as
   * tutor messages (30-day voice retention); audio is never stored.
   */
  public Map<String, Object> turn(AccountPrincipal principal, UUID voiceSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID tutorSessionId = activeTutorSession(principal.studentId(), voiceSessionId);
    String audio = String.valueOf(body.getOrDefault("audioBase64", ""));
    String mime = String.valueOf(body.getOrDefault("mimeType", "audio/webm"));
    if (audio.isBlank() || audio.length() > MAX_AUDIO_BASE64) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Hold the button while you speak, for up to a minute.");
    }

    String transcript;
    try {
      transcript = ai.asText(gateway.transcribe(audio, mime).get("text")).trim();
    } catch (Exception e) {
      log.warn("Voice STT failed for session {}: {}", voiceSessionId, e.getClass().getSimpleName());
      throw new AppException("STT_FAILED", 502, "We couldn't hear that. Try again, or switch to typing.");
    }
    // Recorded length from the client, capped; falls back to a size estimate (~32 kbit/s Opus).
    double seconds = body.get("durationMs") instanceof Number n
        ? Math.min(60.0, Math.max(0.0, n.doubleValue() / 1000.0))
        : audio.length() * 3.0 / 4 / 4000;
    jdbc.update(
        "UPDATE voice_session SET stt_seconds = stt_seconds + ? WHERE voice_session_id = ?",
        Math.round(seconds * 10) / 10.0,
        voiceSessionId);
    Map<String, Object> out = new HashMap<>();
    out.put("transcript", transcript);
    if (transcript.isEmpty()) {
      out.put("replyText", null);
      out.put("heard", false);
      return out;
    }

    Map<String, Object> reply = tutor.postMessage(principal, tutorSessionId, Map.of("text", transcript));
    String replyText = String.valueOf(reply.get("text"));
    out.put("heard", true);
    out.put("replyText", replyText);
    out.put("blocked", reply.get("blocked"));
    try {
      Map<?, ?> speech = gateway.synthesize(replyText);
      out.put("audioBase64", speech.get("audioBase64"));
      out.put("mimeType", speech.get("mimeType"));
      jdbc.update(
          "UPDATE voice_session SET tts_characters = tts_characters + ? WHERE voice_session_id = ?",
          replyText.length(),
          voiceSessionId);
    } catch (Exception e) {
      // The caption still shows; the learner reads instead of hearing this turn.
      log.warn("Voice TTS failed for session {}: {}", voiceSessionId, e.getClass().getSimpleName());
      out.put("audioBase64", null);
      out.put("ttsFailed", true);
    }
    return out;
  }

  /** Voice settings and readiness for the signed-in learner (consent, parent toggle). */
  public Map<String, Object> status(AccountPrincipal principal) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    Boolean voiceOn = jdbc.query(
        "SELECT voice_enabled FROM parent_ai_controls WHERE student_id = ?",
        rs -> rs.next() ? rs.getBoolean(1) : false,
        studentId);
    Map<String, Object> out = new HashMap<>();
    out.put("consentGiven", activeVoiceConsent(studentId) != null);
    out.put("parentEnabled", Boolean.TRUE.equals(voiceOn));
    out.put("available", activeVoiceConsent(studentId) != null && Boolean.TRUE.equals(voiceOn));
    return out;
  }

  private UUID activeTutorSession(UUID studentId, UUID voiceSessionId) {
    Map<String, Object> row = jdbc.query(
        """
        SELECT ts.tutor_session_id, ts.status, vs.ended_at
        FROM voice_session vs JOIN tutor_session ts ON ts.tutor_session_id = vs.tutor_session_id
        WHERE vs.voice_session_id = ? AND ts.student_id = ?
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("id", rs.getObject(1));
          m.put("status", rs.getString(2));
          m.put("ended", rs.getTimestamp(3) != null);
          return m;
        },
        voiceSessionId,
        studentId);
    if (row == null) {
      throw AppException.notFound("Voice session not found");
    }
    if (Boolean.TRUE.equals(row.get("ended")) || !"ACTIVE".equals(row.get("status"))) {
      throw AppException.conflict("SESSION_ENDED", "This voice session has ended. Start a new one.");
    }
    return (UUID) row.get("id");
  }

  @Transactional
  public Map<String, Object> start(AccountPrincipal principal, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID studentId = principal.studentId();
    UUID consentId = activeVoiceConsent(studentId);
    if (consentId == null) {
      throw AppException.forbidden("Voice consent required (J-06)");
    }
    Boolean voiceOn = jdbc.query(
        "SELECT voice_enabled FROM parent_ai_controls WHERE student_id = ?",
        rs -> rs.next() ? rs.getBoolean(1) : false,
        studentId);
    if (!Boolean.TRUE.equals(voiceOn)) {
      throw AppException.forbidden("Parent voice toggle is off");
    }
    UUID tutorSessionId = UUID.randomUUID();
    String mode = body.getOrDefault("mode", "SOCRATIC").toString();
    if (!List.of("SOCRATIC", "DISCUSSION", "WALKTHROUGH", "RESCUE", "FREE_REVISION").contains(mode)) {
      mode = "SOCRATIC";
    }
    jdbc.update(
        """
        INSERT INTO tutor_session (tutor_session_id, student_id, channel, mode, persona_tier, status)
        VALUES (?, ?, 'VOICE', ?, 2, 'ACTIVE')
        """,
        tutorSessionId, studentId, mode);
    UUID voiceSessionId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO voice_session (voice_session_id, tutor_session_id, voice_consent_id)
        VALUES (?,?,?)
        """,
        voiceSessionId, tutorSessionId, consentId);
    String token = "vox_" + UUID.randomUUID().toString().replace("-", "");
    Map<String, Object> out = new HashMap<>();
    out.put("voiceSessionId", voiceSessionId.toString());
    out.put("tutorSessionId", tutorSessionId.toString());
    out.put("wsUrl", "/api/v1/voice/sessions/" + voiceSessionId + "/stream");
    out.put("token", token);
    out.put("mode", mode);
    out.put("sttVia", "ai-gateway");
    out.put("ttsVia", "ai-gateway");
    if ("DISCUSSION".equals(mode)) {
      out.put("scope", "English Lang/Lit discussion — not Q&A drill");
    }
    return out;
  }

  public Map<String, Object> end(AccountPrincipal principal, UUID voiceSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    UUID tutorId = jdbc.query(
        """
        SELECT vs.tutor_session_id FROM voice_session vs JOIN tutor_session ts ON ts.tutor_session_id = vs.tutor_session_id
        WHERE vs.voice_session_id = ? AND ts.student_id = ?
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        voiceSessionId,
        principal.studentId());
    if (tutorId == null) {
      throw AppException.notFound("Voice session not found");
    }
    String reason = body.getOrDefault("reason", "USER_ENDED").toString();
    if (!List.of("USER_ENDED", "TIME_LIMIT", "MIC_ERROR", "NETWORK_ERROR").contains(reason)) {
      reason = "USER_ENDED";
    }
    jdbc.update(
        "UPDATE voice_session SET ended_at = COALESCE(ended_at, now()), end_reason = COALESCE(end_reason, ?) WHERE voice_session_id = ?",
        reason,
        voiceSessionId);
    jdbc.update(
        "UPDATE tutor_session SET status = CASE WHEN status = 'BLOCKED' THEN status ELSE 'ENDED' END, ended_at = now() WHERE tutor_session_id = ?",
        tutorId);
    Map<String, Object> out = new HashMap<>();
    out.put("status", "ENDED");
    out.put("voiceSessionId", voiceSessionId.toString());
    out.put("summary", summarise(voiceSessionId, tutorId));
    return out;
  }

  /** P-VO-02 on the redacted transcript; null when there was nothing to summarise or the model failed. */
  private Map<String, Object> summarise(UUID voiceSessionId, UUID tutorId) {
    List<String> lines = jdbc.query(
        """
        SELECT role, ai_visible_text FROM tutor_message
        WHERE tutor_session_id = ? AND blocked = FALSE AND ai_visible_text IS NOT NULL AND role IN ('STUDENT','TUTOR')
        ORDER BY seq
        """,
        (rs, i) -> ("STUDENT".equals(rs.getString(1)) ? "Student: " : "Tutor: ") + rs.getString(2),
        tutorId);
    if (lines.size() < 2) {
      return null;
    }
    try {
      Map<String, Object> vars = new HashMap<>();
      vars.put("transcript", String.join("\n", lines));
      vars.put("session_context", Map.of("channel", "VOICE"));
      Map<String, Object> result = ai.requireResult(gateway.run("P-VO-02", vars, null), "P-VO-02");
      if (GatewayAiSupport.cannotComplete(result)) {
        return null;
      }
      jdbc.update(
          "UPDATE voice_session SET summary_json = ?::jsonb WHERE voice_session_id = ?",
          ai.toJson(result),
          voiceSessionId);
      return result;
    } catch (Exception e) {
      log.warn("Voice summary failed for session {}: {}", voiceSessionId, e.getClass().getSimpleName());
      return null;
    }
  }

  public Map<String, Object> connectivityCheck(AccountPrincipal principal) {
    Map<String, Object> out = new HashMap<>();
    out.put("micOk", true);
    out.put("networkOk", true);
    out.put("gatewayReachable", true);
    out.put("errorClass", null);
    // Health endpoint only: a connectivity check must not spend model tokens.
    if (!gateway.isHealthy()) {
      out.put("gatewayReachable", false);
      out.put("errorClass", "GATEWAY_UNAVAILABLE");
      out.put("degraded", true);
    }
    return out;
  }

  @Transactional
  public Map<String, Object> fallbackToText(AccountPrincipal principal, UUID voiceSessionId) {
    access.requireStudent(principal);
    UUID tutorId = jdbc.query(
        "SELECT tutor_session_id FROM voice_session WHERE voice_session_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        voiceSessionId);
    if (tutorId == null) throw AppException.notFound("Voice session not found");
    jdbc.update(
        "UPDATE voice_session SET end_reason = 'FALLBACK_TO_TEXT', ended_at = now() WHERE voice_session_id = ?",
        voiceSessionId);
    jdbc.update("UPDATE tutor_session SET channel = 'CHAT' WHERE tutor_session_id = ?", tutorId);
    return Map.of("tutorSessionId", tutorId.toString(), "channel", "CHAT");
  }

  private UUID activeVoiceConsent(UUID studentId) {
    return jdbc.query(
        """
        SELECT voice_consent_id FROM voice_consent
        WHERE student_id = ? AND withdrawn_at IS NULL
        ORDER BY granted_at DESC LIMIT 1
        """,
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        studentId);
  }
}
