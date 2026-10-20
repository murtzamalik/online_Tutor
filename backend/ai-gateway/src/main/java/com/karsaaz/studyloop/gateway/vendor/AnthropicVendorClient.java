package com.karsaaz.studyloop.gateway.vendor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

/** Anthropic Messages API transport (D-01 / D-28). Used when {@code model_routing.vendor = ANTHROPIC}. */
@Component
public class AnthropicVendorClient implements ChatTransport {
  private final ObjectMapper mapper;
  private final RestClient client;
  private final String apiKey;
  private final String modelOverride;
  private final String workspaceId;
  private final Map<String, String> modelAliases;

  public AnthropicVendorClient(
      ObjectMapper mapper,
      @Value("${studyloop.gateway.anthropic.api-key:}") String apiKey,
      @Value("${studyloop.gateway.anthropic.base-url:https://api.anthropic.com}") String baseUrl,
      @Value("${studyloop.gateway.anthropic.model-override:}") String modelOverride,
      @Value("${studyloop.gateway.anthropic.workspace-id:}") String workspaceId,
      @Value("${studyloop.gateway.vendor-timeout-seconds:90}") int timeoutSeconds) {
    this.mapper = mapper;
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    this.modelOverride = modelOverride == null ? "" : modelOverride.trim();
    this.workspaceId = workspaceId == null ? "" : workspaceId.trim();
    JdkClientHttpRequestFactory factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
    this.client =
        RestClient.builder().baseUrl(baseUrl.replaceAll("/$", "")).requestFactory(factory).build();
    this.modelAliases =
        Map.of(
            "claude-sonnet-5-5", "claude-sonnet-4-5-20250929",
            "claude-opus-5-5", "claude-opus-4-5-20251101");
  }

  @Override
  public String vendor() {
    return "ANTHROPIC";
  }

  @Override
  public boolean isConfigured() {
    return !apiKey.isBlank();
  }

  @Override
  public VendorReply complete(
      String model,
      String system,
      String user,
      List<String> imagesBase64,
      double temperature,
      int maxTokens) {
    String resolved = !modelOverride.isBlank() ? modelOverride : modelAliases.getOrDefault(model, model);
    Map<String, Object> body = new HashMap<>();
    body.put("model", resolved);
    body.put("max_tokens", maxTokens);
    body.put("temperature", temperature);
    body.put("system", system);
    body.put("messages", List.of(Map.of("role", "user", "content", userContent(user, imagesBase64))));

    String raw;
    try {
      var req =
          client
              .post()
              .uri("/v1/messages")
              .contentType(MediaType.APPLICATION_JSON)
              .header("x-api-key", apiKey)
              .header("anthropic-version", "2023-06-01");
      if (!workspaceId.isBlank()) {
        req = req.header("anthropic-workspace-id", workspaceId);
      }
      raw = req.body(body).retrieve().body(String.class);
    } catch (RestClientResponseException e) {
      throw new VendorCallException(
          e.getStatusCode().value(), "Anthropic HTTP " + e.getStatusCode().value() + " for " + resolved, e);
    } catch (ResourceAccessException e) {
      throw new VendorCallException(0, "Anthropic unreachable for " + resolved, e);
    }
    try {
      JsonNode root = mapper.readTree(raw);
      StringBuilder text = new StringBuilder();
      for (JsonNode block : root.path("content")) {
        if ("text".equals(block.path("type").asText())) {
          text.append(block.path("text").asText());
        }
      }
      JsonNode usage = root.path("usage");
      return new VendorReply(
          text.toString(),
          usage.has("input_tokens") ? usage.get("input_tokens").asInt() : null,
          usage.has("output_tokens") ? usage.get("output_tokens").asInt() : null);
    } catch (Exception e) {
      throw new VendorCallException(502, "Anthropic returned a non-JSON envelope for " + resolved, e);
    }
  }

  private static Object userContent(String userText, List<String> images) {
    if (images == null || images.isEmpty()) {
      return userText;
    }
    List<Map<String, Object>> blocks = new ArrayList<>();
    blocks.add(Map.of("type", "text", "text", userText));
    for (String b64 : images) {
      String[] img = ChatTransport.splitImage(b64);
      blocks.add(
          Map.of(
              "type", "image",
              "source", Map.of("type", "base64", "media_type", img[0], "data", img[1])));
    }
    return blocks;
  }
}
