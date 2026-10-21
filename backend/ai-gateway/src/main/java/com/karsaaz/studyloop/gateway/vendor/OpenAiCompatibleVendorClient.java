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

/**
 * OpenAI-compatible chat transport aimed at LiteLLM (Gemini / Groq / Ollama aliases).
 * Used when {@code model_routing.vendor = LITELLM}.
 */
@Component
public class OpenAiCompatibleVendorClient implements ChatTransport {
  private final ObjectMapper mapper;
  private final RestClient client;
  private final String apiKey;

  public OpenAiCompatibleVendorClient(
      ObjectMapper mapper,
      @Value("${studyloop.gateway.litellm.base-url:http://localhost:4000}") String baseUrl,
      @Value("${studyloop.gateway.litellm.api-key:}") String apiKey,
      @Value("${studyloop.gateway.vendor-timeout-seconds:90}") int timeoutSeconds) {
    this.mapper = mapper;
    this.apiKey = apiKey == null ? "" : apiKey.trim();
    JdkClientHttpRequestFactory factory =
        new JdkClientHttpRequestFactory(
            HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
    this.client =
        RestClient.builder().baseUrl(baseUrl.replaceAll("/$", "")).requestFactory(factory).build();
  }

  @Override
  public String vendor() {
    return "LITELLM";
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
    List<Map<String, Object>> messages = new ArrayList<>();
    messages.add(Map.of("role", "system", "content", system));
    messages.add(Map.of("role", "user", "content", userContent(user, imagesBase64)));

    Map<String, Object> body = new HashMap<>();
    body.put("model", model);
    body.put("messages", messages);
    body.put("temperature", temperature);
    body.put("max_tokens", maxTokens);
    body.put("response_format", Map.of("type", "json_object"));

    String raw;
    try {
      raw =
          client
              .post()
              .uri("/v1/chat/completions")
              .contentType(MediaType.APPLICATION_JSON)
              .header("Authorization", "Bearer " + apiKey)
              .body(body)
              .retrieve()
              .body(String.class);
    } catch (RestClientResponseException e) {
      int status = e.getStatusCode().value();
      // Groq rejects JSON-mode output it cannot parse with 400 json_validate_failed (e.g. the token
      // budget ran out mid-document). That is a bad answer, not a bad request: retry/fallback.
      if (status == 400 && e.getResponseBodyAsString().contains("json_validate_failed")) {
        status = 422;
      }
      throw new VendorCallException(status, "LiteLLM HTTP " + status + " for " + model, e);
    } catch (ResourceAccessException e) {
      throw new VendorCallException(0, "LiteLLM unreachable for " + model, e);
    } catch (java.util.concurrent.CancellationException e) {
      // The read timeout cancels the JDK request; treat it like any slow vendor so retry/fallback runs.
      throw new VendorCallException(504, "LiteLLM timed out for " + model, e);
    }
    try {
      JsonNode root = mapper.readTree(raw);
      String text = root.path("choices").path(0).path("message").path("content").asText("");
      JsonNode usage = root.path("usage");
      return new VendorReply(
          text,
          usage.has("prompt_tokens") ? usage.get("prompt_tokens").asInt() : null,
          usage.has("completion_tokens") ? usage.get("completion_tokens").asInt() : null);
    } catch (Exception e) {
      throw new VendorCallException(502, "LiteLLM returned a non-JSON envelope for " + model, e);
    }
  }

  private static Object userContent(String userText, List<String> images) {
    if (images == null || images.isEmpty()) {
      return userText;
    }
    List<Map<String, Object>> parts = new ArrayList<>();
    parts.add(Map.of("type", "text", "text", userText));
    for (String b64 : images) {
      String[] img = ChatTransport.splitImage(b64);
      parts.add(
          Map.of("type", "image_url", "image_url", Map.of("url", "data:" + img[0] + ";base64," + img[1])));
    }
    return parts;
  }
}
