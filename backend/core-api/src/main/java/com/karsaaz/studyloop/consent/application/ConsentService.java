package com.karsaaz.studyloop.consent.application;

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
public class ConsentService {
  private final JdbcTemplate jdbc;
  private final StudentAccessHelper access;
  private final Clock clock;

  public ConsentService(JdbcTemplate jdbc, StudentAccessHelper access, Clock clock) {
    this.jdbc = jdbc;
    this.access = access;
    this.clock = clock;
  }

  @Transactional
  public Map<String, Object> startAgeAssurance(AccountPrincipal principal) {
    access.requireParent(principal);
    UUID recordId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO age_assurance_record (record_id, account_id, method, outcome)
        VALUES (?, ?, 'SELF_DECLARED_PARENTAL', 'PENDING')
        """,
        recordId,
        principal.accountId());
    return Map.of("recordId", recordId, "status", "PENDING");
  }

  @Transactional
  public void completeAgeAssurance(AccountPrincipal principal, UUID recordId, boolean pass) {
    access.requireParent(principal);
    int updated = jdbc.update(
        """
        UPDATE age_assurance_record SET outcome = ?, completed_at = ?
        WHERE record_id = ? AND account_id = ? AND outcome = 'PENDING'
        """,
        pass ? "PASS" : "FAIL",
        clock.instant(),
        recordId,
        principal.accountId());
    if (updated == 0) {
      throw AppException.notFound("Age assurance record not found");
    }
  }

  public Map<String, Object> ageAssuranceStatus(AccountPrincipal principal) {
    access.requireParent(principal);
    return jdbc.query(
        """
        SELECT record_id, outcome, completed_at FROM age_assurance_record
        WHERE account_id = ? ORDER BY created_at DESC LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return Map.<String, Object>of("outcome", "PENDING");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("recordId", rs.getObject("record_id"));
          m.put("outcome", rs.getString("outcome"));
          m.put("completedAt", rs.getTimestamp("completed_at"));
          return m;
        },
        principal.accountId());
  }

  @Transactional
  public void under13Consent(AccountPrincipal principal, UUID studentId, String documentVersion) {
    access.assertParentOwns(principal, studentId);
    jdbc.update(
        """
        INSERT INTO consent_record (consent_id, account_id, student_id, consent_type, document_version, granted, method)
        VALUES (?, ?, ?, 'UNDER13_DATA_PROCESSING', ?, TRUE, 'CHECKBOX')
        """,
        UUID.randomUUID(),
        principal.accountId(),
        studentId,
        documentVersion == null ? "v1" : documentVersion);
  }

  public Map<String, Object> legalDocument(String slug) {
    Map<String, Object> doc = jdbc.query(
        """
        SELECT slug, version, title, body_md, published_at
        FROM legal_document WHERE slug = ? AND is_current = TRUE LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("slug", rs.getString("slug"));
          m.put("version", rs.getString("version"));
          m.put("title", rs.getString("title"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("publishedAt", rs.getTimestamp("published_at"));
          return m;
        },
        slug);
    if (doc == null) {
      throw AppException.notFound("Legal document not found");
    }
    return doc;
  }

  @Transactional
  public Map<String, Object> cookieConsent(UUID visitorId, Map<String, Boolean> categories, String policyVersion) {
    if (visitorId == null) {
      visitorId = UUID.randomUUID();
    }
    UUID id = UUID.randomUUID();
    try {
      String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(categories);
      jdbc.update(
          """
          INSERT INTO cookie_consent (cookie_consent_id, visitor_id, categories_json, policy_version)
          VALUES (?, ?, ?::jsonb, ?)
          """,
          id,
          visitorId,
          json,
          policyVersion == null ? "v1" : policyVersion);
    } catch (Exception e) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Invalid categories");
    }
    return Map.of("cookieConsentId", id, "visitorId", visitorId);
  }


  public Map<String, Object> listConsents(AccountPrincipal principal) {
    access.requireParent(principal);
    var items = jdbc.query(
        """
        SELECT consent_id, student_id, consent_type, granted, document_version, granted_at, withdrawn_at
        FROM consent_record WHERE account_id = ? OR student_id IN (
          SELECT student_id FROM parent_student_link WHERE parent_account_id = ?)
        ORDER BY granted_at DESC NULLS LAST
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("consentId", rs.getObject(1) == null ? null : rs.getObject(1).toString());
          m.put("studentId", rs.getObject(2) == null ? null : rs.getObject(2).toString());
          m.put("consentType", rs.getString(3));
          m.put("granted", rs.getBoolean(4));
          m.put("documentVersion", rs.getString(5));
          m.put("grantedAt", rs.getTimestamp(6));
          m.put("withdrawnAt", rs.getTimestamp(7));
          return m;
        },
        principal.accountId(), principal.accountId());
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> grantVoiceConsent(AccountPrincipal principal, UUID studentId, Map<String, Object> body) {
    access.assertParentOwns(principal, studentId);
    if (!Boolean.TRUE.equals(body.get("googleProcessingAcknowledged"))) {
      throw AppException.badRequest("CONSENT_REQUIRED", "Google speech processing must be acknowledged");
    }
    UUID id = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO voice_consent (voice_consent_id, student_id, parent_account_id, text_version, google_processing_acknowledged)
        VALUES (?,?,?,?, TRUE)
        """,
        id, studentId, principal.accountId(), body.getOrDefault("textVersion", "voice-v1").toString());
    jdbc.update(
        """
        INSERT INTO parent_ai_controls (student_id, voice_enabled, updated_by)
        VALUES (?, TRUE, ?)
        ON CONFLICT (student_id) DO UPDATE SET voice_enabled = TRUE, updated_by = EXCLUDED.updated_by, updated_at = now()
        """,
        studentId, principal.accountId());
    return Map.of("voiceConsentId", id.toString(), "status", "GRANTED");
  }

  @Transactional
  public Map<String, Object> withdrawVoiceConsent(AccountPrincipal principal, UUID studentId) {
    access.assertParentOwns(principal, studentId);
    jdbc.update(
        "UPDATE voice_consent SET withdrawn_at = now() WHERE student_id = ? AND withdrawn_at IS NULL",
        studentId);
    jdbc.update(
        "UPDATE parent_ai_controls SET voice_enabled = FALSE, updated_by = ?, updated_at = now() WHERE student_id = ?",
        principal.accountId(), studentId);
    return Map.of("status", "WITHDRAWN");
  }

  public Map<String, Object> subProcessors() {
    var items = jdbc.query(
        "SELECT name, purpose, data_categories, location, receives_personal_data FROM sub_processor WHERE active = TRUE",
        (rs, i) -> Map.of(
            "name", rs.getString(1),
            "purpose", rs.getString(2),
            "dataCategories", rs.getString(3),
            "location", rs.getString(4),
            "receivesPersonalData", rs.getBoolean(5)));
    return Map.of("items", items);
  }

}
