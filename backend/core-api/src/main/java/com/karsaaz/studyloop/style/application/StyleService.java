package com.karsaaz.studyloop.style.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StyleService {
  private final JdbcTemplate jdbc;

  public StyleService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> list(AccountPrincipal principal) {
    requireContent(principal);
    return jdbc.query(
        """
        SELECT b.style_profile_id, b.specification_id, s.spec_code, s.title,
               b.question_wording_notes, b.mark_scheme_format_notes, b.state_symbols_required, b.updated_at
        FROM board_style_profile b
        JOIN specification s ON s.specification_id = b.specification_id
        ORDER BY s.spec_code
        """,
        (rs, i) -> row(rs));
  }

  public Map<String, Object> get(AccountPrincipal principal, long specificationId) {
    requireContent(principal);
    Map<String, Object> row = jdbc.query(
        """
        SELECT b.style_profile_id, b.specification_id, s.spec_code, s.title,
               b.question_wording_notes, b.mark_scheme_format_notes, b.command_words_json,
               b.typical_paper_structure_notes, b.state_symbols_required, b.updated_at
        FROM board_style_profile b
        JOIN specification s ON s.specification_id = b.specification_id
        WHERE b.specification_id = ?
        """,
        rs -> rs.next() ? detail(rs) : null,
        specificationId);
    if (row == null) {
      throw AppException.notFound("Style profile not found");
    }
    return row;
  }

  @Transactional
  public Map<String, Object> put(
      AccountPrincipal principal, long specificationId, Map<String, Object> body) {
    requireContent(principal);
    Integer exists = jdbc.queryForObject(
        "SELECT COUNT(*) FROM board_style_profile WHERE specification_id = ?",
        Integer.class,
        specificationId);
    if (exists == null || exists == 0) {
      jdbc.update(
          """
          INSERT INTO board_style_profile (
            specification_id, question_wording_notes, mark_scheme_format_notes,
            typical_paper_structure_notes, state_symbols_required, updated_by
          ) VALUES (?, ?, ?, ?, COALESCE(?, TRUE), ?)
          """,
          specificationId,
          body.getOrDefault("questionWordingNotes", "").toString(),
          body.getOrDefault("markSchemeFormatNotes", "").toString(),
          body.getOrDefault("typicalPaperStructureNotes", "").toString(),
          body.get("stateSymbolsRequired") instanceof Boolean b ? b : true,
          principal.accountId() != null ? principal.accountId().toString() : "staff");
    } else {
      jdbc.update(
          """
          UPDATE board_style_profile SET
            question_wording_notes = COALESCE(?, question_wording_notes),
            mark_scheme_format_notes = COALESCE(?, mark_scheme_format_notes),
            typical_paper_structure_notes = COALESCE(?, typical_paper_structure_notes),
            state_symbols_required = COALESCE(?, state_symbols_required),
            updated_by = ?,
            updated_at = now()
          WHERE specification_id = ?
          """,
          body.get("questionWordingNotes") != null ? body.get("questionWordingNotes").toString() : null,
          body.get("markSchemeFormatNotes") != null ? body.get("markSchemeFormatNotes").toString() : null,
          body.get("typicalPaperStructureNotes") != null
              ? body.get("typicalPaperStructureNotes").toString()
              : null,
          body.get("stateSymbolsRequired") instanceof Boolean b ? b : null,
          principal.accountId() != null ? principal.accountId().toString() : "staff",
          specificationId);
    }
    return get(principal, specificationId);
  }

  @Transactional
  public Map<String, Object> derive(AccountPrincipal principal, long specificationId) {
    requireContent(principal);
    put(
        principal,
        specificationId,
        Map.of(
            "questionWordingNotes", "Derived stub (W1) — run STYLE-01 via gateway in later wave",
            "markSchemeFormatNotes", "Derived stub mark-scheme notes",
            "typicalPaperStructureNotes", "Derived stub paper structure"));
    jdbc.update(
        "UPDATE board_style_profile SET derived_by_prompt_version = 'W1-STUB' WHERE specification_id = ?",
        specificationId);
    return get(principal, specificationId);
  }

  private Map<String, Object> row(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = new HashMap<>();
    m.put("styleProfileId", rs.getLong("style_profile_id"));
    m.put("specificationId", rs.getLong("specification_id"));
    m.put("specCode", rs.getString("spec_code"));
    m.put("title", rs.getString("title"));
    m.put("questionWordingNotes", rs.getString("question_wording_notes"));
    m.put("markSchemeFormatNotes", rs.getString("mark_scheme_format_notes"));
    m.put("stateSymbolsRequired", rs.getBoolean("state_symbols_required"));
    m.put("updatedAt", rs.getTimestamp("updated_at"));
    return m;
  }

  private Map<String, Object> detail(java.sql.ResultSet rs) throws java.sql.SQLException {
    Map<String, Object> m = row(rs);
    m.put("commandWordsJson", rs.getString("command_words_json"));
    m.put("typicalPaperStructureNotes", rs.getString("typical_paper_structure_notes"));
    return m;
  }

  private void requireContent(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasContentRole(principal.roles())) {
      throw AppException.forbidden("Content access required");
    }
  }
}
