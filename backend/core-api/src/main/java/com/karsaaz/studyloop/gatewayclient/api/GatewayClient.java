package com.karsaaz.studyloop.gatewayclient.api;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Sole module allowed to call ai-gateway (D-15).
 *
 * <p>{@link #run} returns the gateway envelope {@code {status, model, usage, result, ...}}; the
 * model's JSON object (already schema-validated by the gateway) is under {@code result}. Failures
 * surface as RestClient exceptions carrying the gateway's problem code.
 */
@Component
public class GatewayClient {
  private final RestClient client;

  public GatewayClient(
      @Value("${studyloop.ai-gateway.base-url}") String baseUrl,
      @Value("${studyloop.ai-gateway.service-token}") String token,
      @Value("${studyloop.ai-gateway.read-timeout-seconds:200}") int readTimeoutSeconds) {
    HttpClient httpClient =
        HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_1_1)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
    // Covers one gateway run: up to two tries on the primary model plus two on the fallback.
    requestFactory.setReadTimeout(Duration.ofSeconds(readTimeoutSeconds));
    this.client =
        RestClient.builder()
            .baseUrl(baseUrl)
            .requestFactory(requestFactory)
            .defaultHeader("X-Service-Token", token)
            .build();
  }

  public Map<?, ?> run(String promptId, Map<String, Object> variables, String schemaRef) {
    return client
        .post()
        .uri("/gateway/v1/run")
        .contentType(MediaType.APPLICATION_JSON)
        .body(
            Map.of(
                "promptId",
                promptId,
                "variables",
                variables,
                "schemaRef",
                schemaRef == null ? "" : schemaRef,
                "requestId",
                java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }

  public Map<?, ?> embed(java.util.List<String> texts) {
    return client
        .post()
        .uri("/gateway/v1/embed")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("texts", texts, "requestId", java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }

  /** Voice STT: {@code {text, model, latencyMs}}. Audio is base64; the gateway does not keep it. */
  public Map<?, ?> transcribe(String audioBase64, String mimeType) {
    return client
        .post()
        .uri("/gateway/v1/speech/transcribe")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of(
            "audioBase64", audioBase64,
            "mimeType", mimeType == null ? "audio/webm" : mimeType,
            "requestId", java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }

  /** Voice TTS: {@code {audioBase64, mimeType, model, latencyMs}}. */
  public Map<?, ?> synthesize(String text) {
    return client
        .post()
        .uri("/gateway/v1/speech/synthesize")
        .contentType(MediaType.APPLICATION_JSON)
        .body(Map.of("text", text, "requestId", java.util.UUID.randomUUID().toString()))
        .retrieve()
        .body(Map.class);
  }

  /** Reachability only — no model call (voice connectivity check must not spend tokens). */
  public boolean isHealthy() {
    try {
      Map<?, ?> health = client.get().uri("/actuator/health").retrieve().body(Map.class);
      return health != null && "UP".equals(String.valueOf(health.get("status")));
    } catch (Exception e) {
      return false;
    }
  }
}
