package com.karsaaz.studyloop.gatewayclient.api;

import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Sole module allowed to call ai-gateway (D-15). */
@Component
public class GatewayClient {
  private final RestClient client;

  public GatewayClient(
      @Value("${studyloop.ai-gateway.base-url}") String baseUrl,
      @Value("${studyloop.ai-gateway.service-token}") String token) {
    this.client = RestClient.builder()
        .baseUrl(baseUrl)
        .defaultHeader("X-Service-Token", token)
        .build();
  }

  public Map<?, ?> run(String promptId, Map<String, Object> variables, String schemaRef) {
    return client.post()
        .uri("/gateway/v1/run")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of(
            "promptId", promptId,
            "variables", variables,
            "schemaRef", schemaRef == null ? "" : schemaRef,
            "requestId", java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }

  public Map<?, ?> embed(java.util.List<String> texts) {
    return client.post()
        .uri("/gateway/v1/embed")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("texts", texts, "requestId", java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }
}
