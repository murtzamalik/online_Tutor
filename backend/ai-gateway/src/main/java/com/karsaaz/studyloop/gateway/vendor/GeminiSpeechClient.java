package com.karsaaz.studyloop.gateway.vendor;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Speech-to-text and text-to-speech through the Gemini API (pilot stand-in for Google Cloud Speech,
 * D-05). Audio is passed through and never stored; only sizes and timings are logged.
 */
@Component
public class GeminiSpeechClient {
  private final ObjectMapper mapper;
  private final String apiKey;
  private final String baseUrl;
  private final Duration timeout;
  private final HttpClient http =
      HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();

  public GeminiSpeechClient(
      ObjectMapper mapper,
      @Value("${studyloop.gateway.gemini.api-key:}") String apiKey,
      @Value("${studyloop.gateway.gemini.base-url:https://generativelanguage.googleapis.com/v1beta}") String baseUrl,
      @Value("${studyloop.gateway.vendor-timeout-seconds:45}") int timeoutSeconds) {
    this.mapper = mapper;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replaceAll("/$", "");
    this.timeout = Duration.ofSeconds(timeoutSeconds);
  }

  public record Audio(String base64, String mimeType) {}

  public boolean configured() {
    return apiKey != null && !apiKey.isBlank();
  }

  /** Verbatim transcript of one spoken turn (en-GB). Empty string when nothing was said. */
  public String transcribe(String model, String audioBase64, String mimeType) {
    Map<String, Object> body = Map.of(
        "contents", List.of(Map.of("parts", List.of(
            Map.of("inlineData", Map.of("mimeType", mimeType, "data", audioBase64)),
            Map.of("text", "Transcribe this audio verbatim in British English. Return only the words spoken, "
                + "with no commentary. If nothing intelligible is said, return an empty response.")))),
        "generationConfig", Map.of("temperature", 0));
    JsonNode parts = call(model, body).path("candidates").path(0).path("content").path("parts");
    StringBuilder text = new StringBuilder();
    for (JsonNode p : parts) {
      text.append(p.path("text").asText(""));
    }
    return text.toString().trim();
  }

  /** Spoken reply as a playable audio file (Gemini returns WAV). */
  public Audio synthesize(String model, String voiceName, String text) {
    Map<String, Object> body = Map.of(
        "contents", List.of(Map.of("parts", List.of(Map.of("text", text)))),
        "generationConfig", Map.of(
            "responseModalities", List.of("AUDIO"),
            "speechConfig", Map.of("voiceConfig", Map.of("prebuiltVoiceConfig", Map.of("voiceName", voiceName)))));
    JsonNode inline = call(model, body).path("candidates").path(0).path("content").path("parts").path(0).path("inlineData");
    String data = inline.path("data").asText("");
    if (data.isEmpty()) {
      throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Speech synthesis returned no audio");
    }
    return new Audio(data, inline.path("mimeType").asText("audio/wav"));
  }

  private JsonNode call(String model, Map<String, Object> body) {
    if (!configured()) {
      throw new GatewayException(GatewayException.VENDOR_NOT_CONFIGURED, 503, "GEMINI_API_KEY is not set");
    }
    try {
      HttpRequest req = HttpRequest.newBuilder(URI.create(baseUrl + "/models/" + model + ":generateContent"))
          .timeout(timeout)
          .header("Content-Type", "application/json")
          .header("x-goog-api-key", apiKey)
          .POST(HttpRequest.BodyPublishers.ofByteArray(mapper.writeValueAsBytes(body)))
          .build();
      HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
      if (resp.statusCode() >= 300) {
        throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Gemini speech HTTP " + resp.statusCode());
      }
      return mapper.readTree(resp.body());
    } catch (GatewayException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Gemini speech call interrupted", e);
    } catch (Exception e) {
      throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Gemini speech call failed", e);
    }
  }
}
