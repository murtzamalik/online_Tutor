package com.karsaaz.studyloop.tutor.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoiceService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final GatewayClient gateway;

  public VoiceService(JdbcTemplate jdbc, StudentAccessHelper access, GatewayClient gateway) {
    this.jdbc = jdbc;
    this.access = access;
    this.gateway = gateway;
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

  @Transactional
  public Map<String, Object> end(AccountPrincipal principal, UUID voiceSessionId, Map<String, Object> body) {
    access.requireStudent(principal);
    jdbc.update(
        """
        UPDATE voice_session SET ended_at = now(), end_reason = ?
        WHERE voice_session_id = ?
        """,
        body.getOrDefault("reason", "USER_ENDED").toString(), voiceSessionId);
    UUID tutorId = jdbc.query(
        "SELECT tutor_session_id FROM voice_session WHERE voice_session_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null,
        voiceSessionId);
    if (tutorId != null) {
      jdbc.update("UPDATE tutor_session SET status = 'ENDED', ended_at = now() WHERE tutor_session_id = ?", tutorId);
    }
    // No transcript exists yet (STT/TTS not built), so P-VO-02 has nothing to summarise; the old call
    // sent {"event":"session_end"} to a model and paid for a meaningless answer.
    return Map.of("status", "ENDED", "voiceSessionId", voiceSessionId.toString());
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
