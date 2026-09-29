package com.karsaaz.studyloop.marketing.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.common.error.ProblemCode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketingService {
  private final JdbcTemplate jdbc;

  public MarketingService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> faq() {
    return jdbc.query(
        """
        SELECT faq_id, category, question, answer_md, sort_order
        FROM faq_item WHERE published = TRUE ORDER BY sort_order, faq_id
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("faqId", rs.getLong("faq_id"));
          m.put("category", rs.getString("category"));
          m.put("question", rs.getString("question"));
          m.put("answerMd", rs.getString("answer_md"));
          m.put("sortOrder", rs.getShort("sort_order"));
          return m;
        });
  }

  public List<Map<String, Object>> resources() {
    return jdbc.query(
        """
        SELECT resource_id, title, kind, email_gated, body_md, file_key, published
        FROM marketing_resource WHERE published = TRUE ORDER BY resource_id
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("resourceId", rs.getLong("resource_id"));
          m.put("title", rs.getString("title"));
          m.put("kind", rs.getString("kind"));
          m.put("emailGated", rs.getBoolean("email_gated"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("fileKey", rs.getString("file_key"));
          m.put("slug", slugify(rs.getString("title")));
          return m;
        });
  }

  public Map<String, Object> resourceBySlug(String slug) {
    return resources().stream()
        .filter(r -> slug.equals(r.get("slug")) || slug.equals(String.valueOf(r.get("resourceId"))))
        .findFirst()
        .orElseThrow(() -> AppException.notFound("Resource not found"));
  }

  public List<Map<String, Object>> caseStudies() {
    return jdbc.query(
        """
        SELECT case_id, title, body_md, before_after_json, published_at
        FROM case_study WHERE approved = TRUE ORDER BY published_at DESC NULLS LAST
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("caseId", rs.getLong("case_id"));
          m.put("title", rs.getString("title"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("publishedAt", rs.getTimestamp("published_at"));
          return m;
        });
  }

  public List<Map<String, Object>> outcomes() {
    return jdbc.query(
        """
        SELECT stat_id, label, value_text, methodology_md, sample_size, as_of
        FROM outcome_stat WHERE published = TRUE ORDER BY as_of DESC, stat_id
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("statId", rs.getLong("stat_id"));
          m.put("label", rs.getString("label"));
          m.put("valueText", rs.getString("value_text"));
          m.put("methodologyMd", rs.getString("methodology_md"));
          m.put("sampleSize", rs.getObject("sample_size"));
          m.put("asOf", rs.getDate("as_of"));
          return m;
        });
  }

  public Map<String, Object> page(String slug) {
    Map<String, Object> page = jdbc.query(
        """
        SELECT slug, title, hero_md, body_md, cta_label, cta_href
        FROM marketing_page WHERE slug = ? AND published = TRUE LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("slug", rs.getString("slug"));
          m.put("title", rs.getString("title"));
          m.put("heroMd", rs.getString("hero_md"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("ctaLabel", rs.getString("cta_label"));
          m.put("ctaHref", rs.getString("cta_href"));
          return m;
        },
        slug);
    if (page == null) {
      throw AppException.notFound("Marketing page not found");
    }
    return page;
  }

  public Map<String, Object> sampleQuestion() {
    return jdbc.query(
        """
        SELECT question_id, question_text, question_type, options_json, marks_available
        FROM question WHERE review_status = 'APPROVED' AND question_type = 'MULTIPLE_CHOICE'
        ORDER BY question_id LIMIT 1
        """,
        rs -> {
          if (!rs.next()) {
            throw AppException.notFound("No sample question");
          }
          Map<String, Object> m = new HashMap<>();
          m.put("questionId", rs.getLong("question_id"));
          m.put("questionText", rs.getString("question_text"));
          m.put("questionType", rs.getString("question_type"));
          m.put("optionsJson", rs.getString("options_json"));
          m.put("marksAvailable", rs.getShort("marks_available"));
          return m;
        });
  }

  public Map<String, Object> answerSample(long questionId, Map<String, Object> body) {
    String answer = body.get("answer") != null ? body.get("answer").toString() : "";
    String correctKey = jdbc.query(
        """
        SELECT answer_spec_json->>'correctKey' FROM question WHERE question_id = ? AND review_status = 'APPROVED'
        """,
        rs -> rs.next() ? rs.getString(1) : null,
        questionId);
    if (correctKey == null) {
      throw AppException.notFound("Sample question not found");
    }
    boolean correct = correctKey.equalsIgnoreCase(answer.trim());
    return Map.of("questionId", questionId, "correct", correct, "correctKey", correctKey);
  }

  @Transactional
  public Map<String, Object> captureLead(Map<String, Object> body) {
    String email = body.get("email") != null ? body.get("email").toString().trim().toLowerCase() : null;
    if (email == null || !email.contains("@")) {
      throw AppException.badRequest(ProblemCode.VALIDATION_FAILED, "Valid email required");
    }
    Long resourceId = body.get("resourceId") != null ? Long.parseLong(body.get("resourceId").toString()) : null;
    String sourcePage = body.get("sourcePage") != null ? body.get("sourcePage").toString() : null;
    boolean consent = Boolean.TRUE.equals(body.get("marketingConsent"));
    UUID leadId = UUID.randomUUID();
    jdbc.update(
        """
        INSERT INTO lead_capture (lead_id, email, resource_id, source_page, marketing_consent)
        VALUES (?, ?, ?, ?, ?)
        """,
        leadId,
        email,
        resourceId,
        sourcePage,
        consent);
    return Map.of("leadId", leadId, "status", "CAPTURED");
  }

  @Transactional
  public Map<String, Object> schoolDemo(Map<String, Object> body) {
    body.put("sourcePage", body.getOrDefault("sourcePage", "school-demo"));
    return captureLead(body);
  }

  public Map<String, Object> planQuiz(Map<String, Object> body) {
    String goal = body.get("goal") != null ? body.get("goal").toString() : "EXAM_PREP";
    String plan = "EXAM_PREP".equalsIgnoreCase(goal) ? "EXAM_PREP" : "ENGLISH_MATHS_SCIENCE";
    return Map.of("recommendedPlan", plan, "goal", goal);
  }

  private static String slugify(String title) {
    return title == null
        ? "resource"
        : title.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
  }
}
