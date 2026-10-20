package com.karsaaz.studyloop.content.application;

import com.karsaaz.studyloop.gatewayclient.api.GatewayClient;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Persists gateway embeddings into {@code question_embedding} (pgvector 768). */
@Service
public class QuestionEmbeddingService {
  private static final Logger log = LoggerFactory.getLogger(QuestionEmbeddingService.class);

  private final JdbcTemplate jdbc;
  private final GatewayClient gateway;
  private final boolean requireSuccess;

  public QuestionEmbeddingService(
      JdbcTemplate jdbc,
      GatewayClient gateway,
      @Value("${studyloop.embeddings.require-success:false}") boolean requireSuccess) {
    this.jdbc = jdbc;
    this.gateway = gateway;
    this.requireSuccess = requireSuccess;
  }

  public void upsertForQuestion(long questionId, String sourceKind) {
    String kind = "PAST_PAPER".equals(sourceKind) ? "PAST_PAPER" : "BANK";
    String text =
        jdbc.query(
            "SELECT question_text FROM question WHERE question_id = ?",
            rs -> rs.next() ? rs.getString(1) : null,
            questionId);
    if (text == null || text.isBlank()) {
      return;
    }
    try {
      Map<?, ?> resp = gateway.embed(List.of(text));
      Object vectors = resp.get("vectors");
      if (!(vectors instanceof List<?> list) || list.isEmpty()) {
        throw new IllegalStateException("embed response missing vectors");
      }
      Object first = list.get(0);
      if (!(first instanceof List<?> dims) || dims.isEmpty()) {
        throw new IllegalStateException("embed vector empty");
      }
      String literal =
          "[" + dims.stream().map(String::valueOf).collect(Collectors.joining(",")) + "]";
      // Stub vectors are SHA-256 noise; label them so nobody mistakes them for bge embeddings.
      String model = Boolean.TRUE.equals(resp.get("stub"))
          ? "stub-sha256"
          : resp.get("model") != null ? resp.get("model").toString() : "bge-base-en-v1.5";
      jdbc.update(
          """
          INSERT INTO question_embedding (question_id, embedding, embedding_model, source_kind)
          VALUES (?, ?::vector, ?, ?)
          ON CONFLICT (question_id) DO UPDATE
            SET embedding = EXCLUDED.embedding,
                embedding_model = EXCLUDED.embedding_model,
                source_kind = EXCLUDED.source_kind,
                created_at = now()
          """,
          questionId,
          literal,
          model,
          kind);
    } catch (Exception e) {
      log.warn("Embedding upsert failed for question {}: {}", questionId, e.toString());
      if (requireSuccess) {
        throw new IllegalStateException(
            "Embedding failed for question " + questionId + ": " + e.getMessage(), e);
      }
    }
  }
}
