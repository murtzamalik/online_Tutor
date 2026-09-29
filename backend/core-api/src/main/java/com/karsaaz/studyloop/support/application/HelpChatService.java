package com.karsaaz.studyloop.support.application;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.platform.access.StudentAccessHelper;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** P-01 help centre + P-02 live staff chat (not an invented chatbot). */
@Service
public class HelpChatService {
  private final JdbcTemplate jdbc;

  public HelpChatService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Map<String, Object>> searchArticles(String q) {
    if (q == null || q.isBlank()) {
      return jdbc.query(
          """
          SELECT article_id, slug, title, audience, tags
          FROM help_article WHERE published = TRUE ORDER BY title LIMIT 50
          """,
          (rs, i) -> Map.of(
              "articleId", rs.getLong("article_id"),
              "slug", rs.getString("slug"),
              "title", rs.getString("title"),
              "audience", rs.getString("audience"),
              "tags", rs.getArray("tags") == null ? List.of() : List.of((String[]) rs.getArray("tags").getArray())));
    }
    return jdbc.query(
        """
        SELECT article_id, slug, title, audience, tags,
               ts_rank(search_tsv, plainto_tsquery('english', ?)) AS rank
        FROM help_article
        WHERE published = TRUE AND search_tsv @@ plainto_tsquery('english', ?)
        ORDER BY rank DESC LIMIT 30
        """,
        (rs, i) -> Map.of(
            "articleId", rs.getLong("article_id"),
            "slug", rs.getString("slug"),
            "title", rs.getString("title"),
            "audience", rs.getString("audience"),
            "tags", rs.getArray("tags") == null ? List.of() : List.of((String[]) rs.getArray("tags").getArray())),
        q,
        q);
  }

  public Map<String, Object> article(String slug) {
    Map<String, Object> row = jdbc.query(
        """
        SELECT article_id, slug, title, body_md, audience, helpful_yes, helpful_no
        FROM help_article WHERE slug = ? AND published = TRUE
        """,
        rs -> {
          if (!rs.next()) {
            return null;
          }
          Map<String, Object> m = new HashMap<>();
          m.put("articleId", rs.getLong("article_id"));
          m.put("slug", rs.getString("slug"));
          m.put("title", rs.getString("title"));
          m.put("bodyMd", rs.getString("body_md"));
          m.put("audience", rs.getString("audience"));
          m.put("helpfulYes", rs.getInt("helpful_yes"));
          m.put("helpfulNo", rs.getInt("helpful_no"));
          return m;
        },
        slug);
    if (row == null) {
      throw AppException.notFound("Article not found");
    }
    return row;
  }

  @Transactional
  public Map<String, Object> feedback(long articleId, Map<String, Object> body) {
    boolean helpful = Boolean.TRUE.equals(body.get("helpful")) || "yes".equalsIgnoreCase(String.valueOf(body.get("helpful")));
    if (helpful) {
      jdbc.update("UPDATE help_article SET helpful_yes = helpful_yes + 1 WHERE article_id = ?", articleId);
    } else {
      jdbc.update("UPDATE help_article SET helpful_no = helpful_no + 1 WHERE article_id = ?", articleId);
    }
    return Map.of("articleId", articleId, "recorded", true);
  }

  @Transactional
  public Map<String, Object> startChat(AccountPrincipal principal, Map<String, Object> body) {
    if (!StudentAccessHelper.hasParentRole(principal.roles())) {
      throw AppException.forbidden("Parent access required");
    }
    UUID chatId = UUID.randomUUID();
    String topic = body.getOrDefault("topic", "General").toString();
    jdbc.update(
        """
        INSERT INTO support_chat_session (chat_id, account_id, status, topic)
        VALUES (?, ?, 'WAITING_AGENT', ?)
        """,
        chatId,
        principal.accountId(),
        topic);
    String opener = body.getOrDefault("message", "Hello — I need help with my account.").toString();
    jdbc.update(
        """
        INSERT INTO support_chat_message (message_id, chat_id, sender, body)
        VALUES (?, ?, 'USER', ?)
        """,
        UUID.randomUUID(),
        chatId,
        opener);
    jdbc.update(
        """
        INSERT INTO support_chat_message (message_id, chat_id, sender, body)
        VALUES (?, ?, 'SYSTEM', ?)
        """,
        UUID.randomUUID(),
        chatId,
        "Connected to the support queue. A human agent will reply — this is not an AI chatbot.");
    return Map.of("chatId", chatId, "status", "WAITING_AGENT", "topic", topic);
  }

  @Transactional
  public Map<String, Object> postMessage(
      AccountPrincipal principal, UUID chatId, Map<String, Object> body) {
    String text = body.getOrDefault("body", body.getOrDefault("message", "")).toString();
    if (text.isBlank()) {
      throw AppException.badRequest("VALIDATION_FAILED", "Message required");
    }
    boolean agent = StudentAccessHelper.hasSupportRole(principal.roles());
    Map<String, Object> session = jdbc.query(
        "SELECT account_id, status FROM support_chat_session WHERE chat_id = ?",
        rs -> {
          if (!rs.next()) {
            return null;
          }
          return Map.of("accountId", rs.getObject("account_id"), "status", rs.getString("status"));
        },
        chatId);
    if (session == null) {
      throw AppException.notFound("Chat not found");
    }
    if (!agent && !principal.accountId().equals(session.get("accountId"))) {
      throw AppException.forbidden("Forbidden");
    }
    String sender = agent ? "AGENT" : "USER";
    UUID messageId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO support_chat_message (message_id, chat_id, sender, body) VALUES (?, ?, ?, ?)",
        messageId,
        chatId,
        sender,
        text);
    jdbc.update(
        "UPDATE support_chat_session SET status = ? WHERE chat_id = ?",
        agent ? "WAITING_USER" : "WAITING_AGENT",
        chatId);
    if (agent && body.get("assign") != null) {
      jdbc.update(
          "UPDATE support_chat_session SET assigned_to = ? WHERE chat_id = ?",
          principal.accountId(),
          chatId);
    }
    List<Map<String, Object>> messages = jdbc.query(
        """
        SELECT message_id, sender, body, created_at FROM support_chat_message
        WHERE chat_id = ? ORDER BY created_at
        """,
        (rs, i) -> Map.of(
            "messageId", rs.getObject("message_id"),
            "sender", rs.getString("sender"),
            "body", rs.getString("body"),
            "createdAt", rs.getTimestamp("created_at").toInstant().toString()),
        chatId);
    return Map.of("chatId", chatId, "messageId", messageId, "messages", messages);
  }

  public List<Map<String, Object>> agentInbox(AccountPrincipal principal) {
    if (!StudentAccessHelper.hasSupportRole(principal.roles())) {
      throw AppException.forbidden("Support access required");
    }
    return jdbc.query(
        """
        SELECT chat_id, account_id, status, topic, created_at, assigned_to
        FROM support_chat_session
        WHERE status IN ('OPEN','WAITING_AGENT','WAITING_USER')
        ORDER BY created_at ASC
        """,
        (rs, i) -> {
          Map<String, Object> m = new HashMap<>();
          m.put("chatId", rs.getObject("chat_id"));
          m.put("accountId", rs.getObject("account_id"));
          m.put("status", rs.getString("status"));
          m.put("topic", rs.getString("topic"));
          m.put("createdAt", rs.getTimestamp("created_at").toInstant().toString());
          m.put("assignedTo", rs.getObject("assigned_to"));
          return m;
        });
  }
}
