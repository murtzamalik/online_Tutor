package com.karsaaz.studyloop.style.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.gatewayclient.api.GatewayAiSupport;
import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StyleService {
  private final JdbcTemplate jdbc;
  private final GatewayClient gateway;
  private final GatewayAiSupport ai;

  public StyleService(JdbcTemplate jdbc, GatewayClient gateway, GatewayAiSupport ai) {
    this.jdbc = jdbc;
    this.gateway = gateway;
    this.ai = ai;
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
    List<String> samples =
        jdbc.query(
            """
            SELECT left(ppi.raw_text, 800)
            FROM past_paper_item ppi
            JOIN past_paper pp ON pp.paper_id = ppi.paper_id
            WHERE pp.specification_id = ?
              AND ppi.raw_text IS NOT NULL
              AND length(ppi.raw_text) > 40
            ORDER BY ppi.item_id DESC
            LIMIT 30
            """,
            (rs, i) -> rs.getString(1),
            specificationId);
    if (samples.isEmpty()) {
      throw AppException.badRequest(
          com.karsaaz.studyloop.common.error.ProblemCode.VALIDATION_FAILED,
          "No ingested past-paper items available to derive style for specification " + specificationId);
    }
    Map<?, ?> gw =
        gateway.run(
            "P-IN-05",
            Map.of(
                "sample_items", samples.stream().collect(Collectors.joining("\n---\n")),
                "spec_notation", "Use board conventions from the samples."),
            "schemas/style_profile.schema.json");
    Map<String, Object> result = ai.requireResult(gw, "P-IN-05");
    if ("cannot_complete".equalsIgnoreCase(ai.asText(result.get("status")))) {
      throw AppException.badRequest(
          com.karsaaz.studyloop.common.error.ProblemCode.VALIDATION_FAILED,
          "P-IN-05 cannot_complete: " + result.getOrDefault("reason", "unknown"));
    }
    String wording =
        "Command words: "
            + ai.toJson(result.get("command_word_usage"))
            + "\nContexts: "
            + ai.toJson(result.get("typical_context_types"))
            + "\nFixed phrases: "
            + ai.toJson(result.get("fixed_phrases"));
    String schemeNotes =
        ai.asText(result.get("six_mark_scheme_format"))
            + "\nNotation: "
            + ai.toJson(result.get("notation"));
    String structure = ai.toJson(result.get("paper_types"));
    Boolean stateSymbols = null;
    if (result.get("notation") instanceof Map<?, ?> notation) {
      Object ss = notation.get("state_symbols_required");
      if (ss instanceof Boolean b) {
        stateSymbols = b;
      }
    }
    Map<String, Object> body = new HashMap<>();
    body.put("questionWordingNotes", wording);
    body.put("markSchemeFormatNotes", schemeNotes);
    body.put("typicalPaperStructureNotes", structure);
    if (stateSymbols != null) {
      body.put("stateSymbolsRequired", stateSymbols);
    }
    put(principal, specificationId, body);
    jdbc.update(
        """
        UPDATE board_style_profile
        SET derived_by_prompt_version = 'P-IN-05',
            command_words_json = ?::jsonb,
            fixed_phrases_json = ?::jsonb,
            units_and_notation_json = ?::jsonb
        WHERE specification_id = ?
        """,
        ai.toJson(result.get("command_word_usage")),
        ai.toJson(result.get("fixed_phrases")),
        ai.toJson(result.get("notation")),
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
