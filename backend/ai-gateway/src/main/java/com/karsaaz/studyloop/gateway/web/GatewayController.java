package com.karsaaz.studyloop.gateway.web;

import com.karsaaz.studyloop.gateway.prompt.PromptLoader;
import com.karsaaz.studyloop.gateway.redact.RedactionPipeline;
import com.karsaaz.studyloop.gateway.stub.StubVendorClient;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/gateway/v1")
public class GatewayController {
  private final RedactionPipeline redactionPipeline;
  private final StubVendorClient stubVendorClient;
  private final PromptLoader promptLoader;
  private final JdbcTemplate jdbc;
  private final boolean stub;
  private final RestClient embeddingClient;

  public GatewayController(
      RedactionPipeline redactionPipeline,
      StubVendorClient stubVendorClient,
      PromptLoader promptLoader,
      JdbcTemplate jdbc,
      @Value("${studyloop.gateway.stub:true}") boolean stub,
      @Value("${studyloop.gateway.embedding-url}") String embeddingUrl) {
    this.redactionPipeline = redactionPipeline;
    this.stubVendorClient = stubVendorClient;
    this.promptLoader = promptLoader;
    this.jdbc = jdbc;
    this.stub = stub;
    this.embeddingClient = RestClient.builder().baseUrl(embeddingUrl).build();
  }

  public record RunRequest(
      @NotBlank String promptId,
      Map<String, Object> variables,
      String schemaRef,
      @NotBlank String requestId
  ) {}

  public record EmbedRequest(List<String> texts, String requestId) {}

  @PostMapping(value = "/run", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> run(@RequestBody RunRequest req) {
    var redacted = redactionPipeline.redact(req.variables());
    promptLoader.loadBody(req.promptId());
    Map<String, Object> result = stub
        ? stubVendorClient.run(req.promptId(), redacted.variables())
        : Map.of("error", "live vendor mode not configured in W0");
    UUID logId = UUID.randomUUID();
    try {
      jdbc.update(
          "INSERT INTO ai_gateway_log (log_id, request_token, task_key, prompt_id, vendor, route, status, redaction_count) "
              + "VALUES (?, ?, ?, ?, 'STUB', 'TEXT', 'OK', ?)",
          logId, req.requestId(), req.promptId(), req.promptId(), redacted.events().size());
      String payloadJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(redacted.variables());
      jdbc.update(
          "INSERT INTO ai_gateway_payload (log_id, outbound_json, expires_at) VALUES (?, CAST(? AS jsonb), now() + interval '14 days')",
          logId, payloadJson);
      for (String field : redacted.events()) {
        jdbc.update(
            "INSERT INTO redaction_event (log_id, kind, method, placeholder) VALUES (?, 'EMAIL', 'REGEX', ?)",
            logId, "[REDACTED:" + field + "]");
      }
    } catch (Exception e) {
      // Logging must not break stub responses if schema differs slightly
    }
    return result;
  }

  @PostMapping(value = "/embed", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<?, ?> embed(@RequestBody EmbedRequest req) {
    return embeddingClient.post()
        .uri("/embed")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("texts", req.texts() == null ? List.of() : req.texts()))
        .retrieve()
        .body(Map.class);
  }
}
