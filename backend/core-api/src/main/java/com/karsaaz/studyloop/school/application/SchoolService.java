package com.karsaaz.studyloop.school.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SchoolService {
  public static final UUID PILOT_SCHOOL = UUID.fromString("a1000000-0000-4000-8000-000000000001");
  private final JdbcTemplate jdbc;

  public SchoolService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  private void requireSchoolRole(AccountPrincipal p, UUID schoolId) {
    if (StudentAccessHelper.hasOpsRole(p.roles()) || StudentAccessHelper.hasOwnerRole(p.roles())) return;
    Integer n = jdbc.queryForObject(
        "SELECT COUNT(*) FROM school_member WHERE school_id = ? AND account_id = ?",
        Integer.class, schoolId, p.accountId());
    if (n == null || n == 0) {
      // also allow account.school_id match
      UUID sid = jdbc.query("SELECT school_id FROM account WHERE account_id = ?",
          rs -> rs.next() ? (UUID) rs.getObject(1) : null, p.accountId());
      if (sid == null || !sid.equals(schoolId)) throw AppException.forbidden("School access required");
    }
  }

  public Map<String, Object> getSchool(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    return jdbc.query(
        """
        SELECT s.school_id, s.name, s.urn, s.status, s.seats_purchased, d.status AS dpa_status
        FROM school s LEFT JOIN school_dpa_status d ON d.school_id = s.school_id
        WHERE s.school_id = ?
        """,
        rs -> {
          if (!rs.next()) throw AppException.notFound("School not found");
          Map<String, Object> m = new HashMap<>();
          m.put("schoolId", rs.getObject(1).toString());
          m.put("name", rs.getString(2));
          m.put("urn", rs.getString(3));
          m.put("status", rs.getString(4));
          m.put("seatsPurchased", rs.getInt(5));
          m.put("dpaStatus", rs.getString(6));
          return m;
        }, schoolId);
  }

  public Map<String, Object> listClasses(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    List<Map<String, Object>> items = jdbc.query(
        "SELECT class_id, name, year_group, academic_year, archived_at FROM school_class WHERE school_id = ? AND archived_at IS NULL",
        (rs, i) -> Map.of(
            "classId", rs.getObject(1).toString(),
            "name", rs.getString(2),
            "yearGroup", rs.getString(3) == null ? "" : rs.getString(3),
            "academicYear", rs.getString(4)),
        schoolId);
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> createClass(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    UUID classId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO school_class (class_id, school_id, name, year_group, academic_year, source)
        VALUES (?,?,?,?,?, 'MANUAL')
        """,
        classId, schoolId,
        body.getOrDefault("name", "Class").toString(),
        body.get("yearGroup") == null ? null : body.get("yearGroup").toString(),
        body.getOrDefault("academicYear", "2026/27").toString());
    jdbc.update("INSERT INTO class_teacher (class_id, account_id, is_owner) VALUES (?,?, TRUE)",
        classId, p.accountId());
    return Map.of("classId", classId.toString());
  }

  @Transactional
  public Map<String, Object> patchClass(AccountPrincipal p, UUID classId, Map<String, Object> body) {
    UUID schoolId = schoolOfClass(classId);
    requireSchoolRole(p, schoolId);
    if (body.get("name") != null) {
      jdbc.update("UPDATE school_class SET name = ? WHERE class_id = ?", body.get("name").toString(), classId);
    }
    if (Boolean.TRUE.equals(body.get("archive"))) {
      jdbc.update("UPDATE school_class SET archived_at = now() WHERE class_id = ?", classId);
    }
    return Map.of("classId", classId.toString(), "updated", true);
  }

  public Map<String, Object> listPupils(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT cp.student_id, sp.display_name, sp.year_group FROM class_pupil cp
        JOIN student_profile sp ON sp.student_id = cp.student_id
        WHERE cp.class_id = ? AND cp.left_at IS NULL
        """,
        (rs, i) -> Map.of(
            "studentId", rs.getObject(1).toString(),
            "displayName", rs.getString(2),
            "yearGroup", rs.getString(3) == null ? "" : rs.getString(3)),
        classId);
    return Map.of("items", items);
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public Map<String, Object> addPupils(AccountPrincipal p, UUID classId, Map<String, Object> body) {
    requireSchoolRole(p, schoolOfClass(classId));
    List<String> ids = (List<String>) body.getOrDefault("studentIds", List.of());
    int n = 0;
    for (String id : ids) {
      jdbc.update(
          "INSERT INTO class_pupil (class_id, student_id) VALUES (?,?) ON CONFLICT DO NOTHING",
          classId, UUID.fromString(id));
      n++;
    }
    return Map.of("added", n);
  }

  @Transactional
  public Map<String, Object> removePupil(AccountPrincipal p, UUID classId, UUID studentId) {
    requireSchoolRole(p, schoolOfClass(classId));
    jdbc.update("UPDATE class_pupil SET left_at = now() WHERE class_id = ? AND student_id = ?", classId, studentId);
    return Map.of("removed", true);
  }

  @Transactional
  public Map<String, Object> createAssignment(AccountPrincipal p, UUID classId, Map<String, Object> body) {
    requireSchoolRole(p, schoolOfClass(classId));
    UUID id = UUID.randomUUID();
    String topicArr = "{1}";
    if (body.get("topicIds") instanceof List<?> list && !list.isEmpty()) {
      topicArr = "{" + list.stream().map(Object::toString).reduce((a, b) -> a + "," + b).orElse("1") + "}";
    }
    jdbc.update(
        """
        INSERT INTO assignment (assignment_id, class_id, created_by, title, kind, topic_ids, question_count, due_at, status)
        VALUES (?,?,?,?,'ADAPTIVE_PRACTICE',?::bigint[],?::smallint,?::timestamptz,'DRAFT')
        """,
        id, classId, p.accountId(),
        body.getOrDefault("title", "Homework").toString(),
        topicArr,
        body.get("questionCount") == null ? 10 : ((Number) body.get("questionCount")).intValue(),
        body.getOrDefault("dueAt", LocalDate.now().plusDays(7).toString() + "T17:00:00Z").toString());
    // target all pupils
    jdbc.update(
        """
        INSERT INTO assignment_target (assignment_id, student_id)
        SELECT ?, student_id FROM class_pupil WHERE class_id = ? AND left_at IS NULL
        """, id, classId);
    return Map.of("assignmentId", id.toString(), "status", "DRAFT");
  }

  public Map<String, Object> listAssignments(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    List<Map<String, Object>> items = jdbc.query(
        "SELECT assignment_id, title, status, due_at, question_count FROM assignment WHERE class_id = ? ORDER BY due_at DESC",
        (rs, i) -> Map.of(
            "assignmentId", rs.getObject(1).toString(),
            "title", rs.getString(2),
            "status", rs.getString(3),
            "dueAt", rs.getTimestamp(4) == null ? null : rs.getTimestamp(4).toString(),
            "questionCount", rs.getShort(5)),
        classId);
    return Map.of("items", items);
  }

  public Map<String, Object> getAssignment(AccountPrincipal p, UUID assignmentId) {
    Map<String, Object> a = jdbc.query(
        "SELECT assignment_id, class_id, title, status, due_at FROM assignment WHERE assignment_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Assignment not found");
          return Map.<String, Object>of(
              "assignmentId", rs.getObject(1).toString(),
              "classId", rs.getObject(2).toString(),
              "title", rs.getString(3),
              "status", rs.getString(4),
              "dueAt", rs.getTimestamp(5) == null ? null : rs.getTimestamp(5).toString());
        }, assignmentId);
    requireSchoolRole(p, schoolOfClass(UUID.fromString(a.get("classId").toString())));
    List<Map<String, Object>> targets = jdbc.query(
        "SELECT student_id, status, score_pct FROM assignment_target WHERE assignment_id = ?",
        (rs, i) -> Map.of(
            "studentId", rs.getObject(1).toString(),
            "status", rs.getString(2),
            "scorePct", rs.getObject(3)),
        assignmentId);
    Map<String, Object> out = new HashMap<>(a);
    out.put("targets", targets);
    return out;
  }

  @Transactional
  public Map<String, Object> patchAssignment(AccountPrincipal p, UUID assignmentId, Map<String, Object> body) {
    getAssignment(p, assignmentId);
    if (body.get("status") != null) {
      jdbc.update("UPDATE assignment SET status = ? WHERE assignment_id = ?", body.get("status").toString(), assignmentId);
    }
    return getAssignment(p, assignmentId);
  }

  @Transactional
  public Map<String, Object> publishAssignment(AccountPrincipal p, UUID assignmentId) {
    getAssignment(p, assignmentId);
    jdbc.update("UPDATE assignment SET status = 'PUBLISHED', assigned_at = now() WHERE assignment_id = ?", assignmentId);
    return Map.of("assignmentId", assignmentId.toString(), "status", "PUBLISHED");
  }

  public Map<String, Object> studentAssignments(AccountPrincipal p, UUID studentId) {
    accessStudent(p, studentId);
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT a.assignment_id, a.title, a.due_at, t.status FROM assignment a
        JOIN assignment_target t ON t.assignment_id = a.assignment_id
        WHERE t.student_id = ? AND a.status = 'PUBLISHED'
        """,
        (rs, i) -> Map.of(
            "assignmentId", rs.getObject(1).toString(),
            "title", rs.getString(2),
            "dueAt", rs.getTimestamp(3) == null ? null : rs.getTimestamp(3).toString(),
            "status", rs.getString(4)),
        studentId);
    return Map.of("items", items);
  }

  public Map<String, Object> classMastery(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    List<Map<String, Object>> cells = jdbc.query(
        """
        SELECT m.topic_id, AVG(m.mastery_probability) AS avg_p, COUNT(*) AS n
        FROM mastery_state m
        JOIN class_pupil cp ON cp.student_id = m.student_id AND cp.class_id = ? AND cp.left_at IS NULL
        GROUP BY m.topic_id ORDER BY avg_p ASC LIMIT 50
        """,
        (rs, i) -> Map.of("topicId", rs.getLong(1), "avgMastery", rs.getBigDecimal(2), "pupils", rs.getLong(3)),
        classId);
    return Map.of("heatmap", cells);
  }

  public Map<String, Object> classEngagement(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    List<Map<String, Object>> items = jdbc.query(
        """
        SELECT e.student_id, SUM(e.minutes_active) AS minutes, SUM(e.questions_answered) AS answered
        FROM engagement_daily e
        JOIN class_pupil cp ON cp.student_id = e.student_id AND cp.class_id = ?
        WHERE e.day >= CURRENT_DATE - 14
        GROUP BY e.student_id
        """,
        (rs, i) -> Map.of(
            "studentId", rs.getObject(1).toString(),
            "minutes", rs.getBigDecimal(2),
            "answered", rs.getLong(3)),
        classId);
    return Map.of("items", items);
  }

  public Map<String, Object> pupilDrilldown(AccountPrincipal p, UUID classId, UUID studentId) {
    requireSchoolRole(p, schoolOfClass(classId));
    Boolean visible = jdbc.query(
        "SELECT teacher_visibility FROM privacy_settings WHERE student_id = ?",
        rs -> rs.next() ? rs.getBoolean(1) : true, studentId);
    if (Boolean.FALSE.equals(visible)) {
      return Map.of("studentId", studentId.toString(), "visible", false, "message", "Parent privacy settings hide detail");
    }
    List<Map<String, Object>> mastery = jdbc.query(
        "SELECT topic_id, mastery_probability, mastery_level FROM mastery_state WHERE student_id = ? ORDER BY mastery_probability ASC LIMIT 20",
        (rs, i) -> Map.of("topicId", rs.getLong(1), "p", rs.getBigDecimal(2), "level", rs.getShort(3)),
        studentId);
    return Map.of("studentId", studentId.toString(), "visible", true, "mastery", mastery);
  }

  public Map<String, Object> dashboard(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    Long classes = jdbc.queryForObject("SELECT COUNT(*) FROM school_class WHERE school_id = ? AND archived_at IS NULL", Long.class, schoolId);
    Long pupils = jdbc.queryForObject(
        """
        SELECT COUNT(DISTINCT cp.student_id) FROM class_pupil cp
        JOIN school_class c ON c.class_id = cp.class_id WHERE c.school_id = ? AND cp.left_at IS NULL
        """, Long.class, schoolId);
    return Map.of("schoolId", schoolId.toString(), "classCount", classes, "pupilCount", pupils);
  }

  public Map<String, Object> misconceptions(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    return Map.of("items", List.of(), "note", "Heatmap uses mastery + wrong answers; misconception tags populate as practice grows");
  }

  public Map<String, Object> insightSummary(AccountPrincipal p, UUID classId) {
    requireSchoolRole(p, schoolOfClass(classId));
    return Map.of("classId", classId.toString(), "summary", "Pilot insights: focus on lowest-mastery topics first.");
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public Map<String, Object> rosterImport(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    UUID importId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO roster_import (import_id, school_id, source, status, stats_json, created_by)
        VALUES (?,?,'CSV','UPLOADED', '{}'::jsonb, ?)
        """, importId, schoolId, p.accountId());
    List<Map<String, Object>> rows = body.get("rows") instanceof List<?> l ? (List<Map<String, Object>>) l : List.of();
    int valid = 0, err = 0;
    for (int i = 0; i < rows.size(); i++) {
      Map<String, Object> row = rows.get(i);
      String name = row.getOrDefault("displayName", "").toString();
      String status = name.isBlank() ? "ERROR" : "VALID";
      if ("VALID".equals(status)) valid++; else err++;
      jdbc.update(
          """
          INSERT INTO roster_import_row (row_id, import_id, row_no, raw_json, status, message)
          VALUES (?,?,?,?::jsonb,?,?)
          """,
          UUID.randomUUID(), importId, i + 1,
          "{\\\"displayName\\\":\\\"" + name.replace("\"", "") + "\\\"}",
          status, "ERROR".equals(status) ? "displayName required" : null);
    }
    jdbc.update(
        "UPDATE roster_import SET status = 'VALIDATED', stats_json = ?::jsonb WHERE import_id = ?",
        "{\\\"rows\\\":" + rows.size() + ",\\\"valid\\\":" + valid + ",\\\"errors\\\":" + err + "}",
        importId);
    return Map.of("importId", importId.toString(), "valid", valid, "errors", err);
  }

  public Map<String, Object> getRosterImport(AccountPrincipal p, UUID schoolId, UUID importId) {
    requireSchoolRole(p, schoolId);
    return jdbc.query(
        "SELECT import_id, status, stats_json FROM roster_import WHERE import_id = ? AND school_id = ?",
        rs -> {
          if (!rs.next()) throw AppException.notFound("Import not found");
          return Map.<String, Object>of(
              "importId", rs.getObject(1).toString(),
              "status", rs.getString(2),
              "stats", rs.getString(3));
        }, importId, schoolId);
  }

  @Transactional
  public Map<String, Object> commitRoster(AccountPrincipal p, UUID schoolId, UUID importId) {
    requireSchoolRole(p, schoolId);
    List<Map<String, Object>> rows = jdbc.query(
        "SELECT row_id, raw_json FROM roster_import_row WHERE import_id = ? AND status = 'VALID'",
        (rs, i) -> Map.of("rowId", rs.getObject(1), "raw", rs.getString(2)),
        importId);
    int created = 0;
    for (var row : rows) {
      UUID studentId = UUID.randomUUID();
      String name = "Pupil";
      String raw = String.valueOf(row.get("raw"));
      int idx = raw.indexOf("displayName");
      if (idx >= 0) {
        name = raw.replaceAll("(?s).*displayName\\\"?\\s*[:=]\\s*\\\"?([^\\\"},]+).*", "$1");
      }
      jdbc.update(
          "INSERT INTO student_profile (student_id, display_name, school_id, age_band, status) VALUES (?,?,?,'13_15','ACTIVE')",
          studentId, name, schoolId);
      jdbc.update("UPDATE roster_import_row SET student_id = ? WHERE row_id = ?", studentId, row.get("rowId"));
      created++;
    }
    jdbc.update("UPDATE roster_import SET status = 'COMMITTED', committed_at = now() WHERE import_id = ?", importId);
    return Map.of("committed", created);
  }

  public Map<String, Object> getSso(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    List<Map<String, Object>> items = jdbc.query(
        "SELECT sso_id, provider, domain, enabled, audience FROM sso_connection WHERE school_id = ?",
        (rs, i) -> Map.of(
            "ssoId", rs.getObject(1).toString(),
            "provider", rs.getString(2),
            "domain", rs.getString(3),
            "enabled", rs.getBoolean(4),
            "audience", rs.getString(5)),
        schoolId);
    return Map.of("items", items, "callbackStatus", "FEATURE_DISABLED");
  }

  @Transactional
  public Map<String, Object> putSso(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    // Stub only — SSO full flow W3+/FEATURE_DISABLED for live login
    UUID id = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO sso_connection (sso_id, school_id, provider, domain, enabled, audience)
        VALUES (?,?,?,?, FALSE, 'BOTH')
        ON CONFLICT (provider, domain) DO UPDATE SET school_id = EXCLUDED.school_id
        """,
        id, schoolId,
        body.getOrDefault("provider", "GOOGLE").toString(),
        body.getOrDefault("domain", "pilot.sch.uk").toString());
    return Map.of("status", "STORED", "login", "FEATURE_DISABLED");
  }

  public Map<String, Object> misConnect(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    throw AppException.featureDisabled("Wonde MIS is flag-off (wonde_mis)");
  }

  public Map<String, Object> getDpa(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    return jdbc.query(
        "SELECT status, template_version, sent_at, signed_at FROM school_dpa_status WHERE school_id = ?",
        rs -> {
          if (!rs.next()) return Map.<String, Object>of("status", "NOT_SENT");
          Map<String, Object> m = new HashMap<>();
          m.put("status", rs.getString(1));
          m.put("templateVersion", rs.getString(2));
          m.put("sentAt", rs.getTimestamp(3));
          m.put("signedAt", rs.getTimestamp(4));
          return m;
        }, schoolId);
  }

  @Transactional
  public Map<String, Object> signDpa(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    String version = body.getOrDefault("templateVersion", "dpa-v1").toString();
    jdbc.update(
        """
        INSERT INTO school_dpa_signature (signature_id, school_id, signer_account_id, signer_name, signer_role, template_version, pdf_key)
        VALUES (?,?,?,?,?,?,?)
        """,
        UUID.randomUUID(), schoolId, p.accountId(),
        body.getOrDefault("signerName", "School Admin").toString(),
        body.getOrDefault("signerRole", "SADM").toString(),
        version, "dpa/" + schoolId + "/" + version + ".pdf");
    jdbc.update(
        "UPDATE school_dpa_status SET status = 'SIGNED', signed_at = now(), template_version = ? WHERE school_id = ?",
        version, schoolId);
    return Map.of("status", "SIGNED");
  }

  public Map<String, Object> dpaPdf(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    return Map.of("url", "/api/v1/schools/" + schoolId + "/dpa/pdf", "note", "Pilot placeholder countersigned PDF");
  }

  public Map<String, Object> schoolBilling(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    return getSchool(p, schoolId);
  }

  @Transactional
  public Map<String, Object> createPo(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    UUID poId = UUID.randomUUID();
    int seats = body.get("seats") == null ? 30 : ((Number) body.get("seats")).intValue();
    long amount = seats * 3999L;
    LocalDate from = LocalDate.now().withDayOfMonth(1);
    LocalDate to = from.plusMonths(12).minusDays(1);
    jdbc.update(
        """
        INSERT INTO purchase_order (po_id, school_id, po_number, seats, amount_pence, valid_from, valid_to, status, created_by)
        VALUES (?,?,?,?,?,?,?,'SUBMITTED',?)
        """,
        poId, schoolId, body.getOrDefault("poNumber", "PO-" + poId.toString().substring(0, 8)).toString(),
        seats, amount, Date.valueOf(from), Date.valueOf(to), p.accountId());
    return Map.of("poId", poId.toString(), "seats", seats, "amountPence", amount);
  }

  public Map<String, Object> schoolInvoices(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    List<Map<String, Object>> items = jdbc.query(
        "SELECT school_invoice_id, number, status, total_pence, pupil_count, period_start, period_end FROM school_invoice WHERE school_id = ?",
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("invoiceId", rs.getObject(1).toString());
          m.put("number", rs.getString(2));
          m.put("status", rs.getString(3));
          m.put("totalPence", rs.getLong(4));
          m.put("pupilCount", rs.getInt(5));
          m.put("periodStart", rs.getDate(6).toString());
          m.put("periodEnd", rs.getDate(7).toString());
          return m;
        }, schoolId);
    if (items.isEmpty()) {
      // seed a draft invoice for pilot demo
      UUID inv = UUID.randomUUID();
      jdbc.update(
          """
          INSERT INTO school_invoice (school_invoice_id, school_id, number, period_start, period_end, pupil_count, unit_price_pence, subtotal_pence, vat_pence, total_pence, status, issued_at)
          VALUES (?,?,?,?,?,30,3999,119970,23994,143964,'SENT', now())
          """,
          inv, schoolId, "SCH-INV-PILOT", Date.valueOf(LocalDate.now().withDayOfMonth(1)),
          Date.valueOf(LocalDate.now().withDayOfMonth(1).plusMonths(1).minusDays(1)));
      return schoolInvoices(p, schoolId);
    }
    return Map.of("items", items);
  }

  public Map<String, Object> schoolInvoicePdf(AccountPrincipal p, UUID schoolId, UUID invoiceId) {
    requireSchoolRole(p, schoolId);
    return Map.of("invoiceId", invoiceId.toString(), "url", "/api/v1/schools/" + schoolId + "/invoices/" + invoiceId + "/pdf");
  }

  public Map<String, Object> kcsiePack(AccountPrincipal p, UUID schoolId) {
    requireSchoolRole(p, schoolId);
    return Map.of(
        "packVersion", "kcsie-2026-v1",
        "sections", List.of("Filtering", "Monitoring", "DSL contacts", "Reporting pathway"),
        "note", "Confirm pack text with client legal before production.");
  }

  @Transactional
  public Map<String, Object> kcsieConfirm(AccountPrincipal p, UUID schoolId, Map<String, Object> body) {
    requireSchoolRole(p, schoolId);
    UUID id = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO kcsie_confirmation (confirmation_id, school_id, pack_version, answers_json, confirmed_by)
        VALUES (?,?,?,?::jsonb,?)
        """,
        id, schoolId, body.getOrDefault("packVersion", "kcsie-2026-v1").toString(),
        body.get("answers") == null ? "{}" : body.get("answers").toString(),
        p.accountId());
    return Map.of("confirmationId", id.toString(), "status", "CONFIRMED");
  }

  public Map<String, Object> listInternalSchools(AccountPrincipal p) {
    if (!(StudentAccessHelper.hasOwnerRole(p.roles()) || StudentAccessHelper.hasOpsRole(p.roles())
        || StudentAccessHelper.hasComplianceRole(p.roles()) || p.roles().contains("SUP") || p.roles().contains("SUPPORT"))) {
      throw AppException.forbidden("Internal access required");
    }
    List<Map<String, Object>> items = jdbc.query(
        "SELECT school_id, name, status, seats_purchased FROM school ORDER BY name",
        (rs, i) -> Map.of(
            "schoolId", rs.getObject(1).toString(),
            "name", rs.getString(2),
            "status", rs.getString(3),
            "seatsPurchased", rs.getInt(4)));
    return Map.of("items", items);
  }

  @Transactional
  public Map<String, Object> createInternalSchool(AccountPrincipal p, Map<String, Object> body) {
    UUID id = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO school (school_id, name, urn, status, seats_purchased) VALUES (?,?,?,'PROSPECT',0)",
        id, body.getOrDefault("name", "New School").toString(), body.get("urn") == null ? null : body.get("urn").toString());
    jdbc.update("INSERT INTO school_dpa_status (school_id, status) VALUES (?, 'NOT_SENT')", id);
    return Map.of("schoolId", id.toString());
  }

  private UUID schoolOfClass(UUID classId) {
    UUID sid = jdbc.query("SELECT school_id FROM school_class WHERE class_id = ?",
        rs -> rs.next() ? (UUID) rs.getObject(1) : null, classId);
    if (sid == null) throw AppException.notFound("Class not found");
    return sid;
  }

  private void accessStudent(AccountPrincipal p, UUID studentId) {
    if (StudentAccessHelper.hasStudentRole(p.roles()) && studentId.equals(p.studentId())) return;
    throw AppException.forbidden("Student access required");
  }
}
