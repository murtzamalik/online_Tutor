package com.karsaaz.studyloop.gateway.web;

import com.karsaaz.studyloop.gateway.audit.GatewayAuditLogger;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import com.karsaaz.studyloop.gateway.route.ModelRoutingService;
import com.karsaaz.studyloop.gateway.vendor.GeminiSpeechClient;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Voice tutor speech (J-01, D-20): the one path where a vendor receives learner audio, under separate
 * parent consent checked by core-api. Models come from {@code model_routing} (voice.stt / voice.tts).
 * The audit log records sizes and timings only — never audio or transcript text.
 */
@RestController
@RequestMapping("/gateway/v1/speech")
public class SpeechController {
  /** ~60 s of Opus speech, base64-encoded. */
  static final int MAX_AUDIO_BASE64 = 2_500_000;
  static final int MAX_TTS_CHARS = 1_500;

  private final GeminiSpeechClient gemini;
  private final ModelRoutingService routing;
  private final GatewayAuditLogger audit;

  public SpeechController(GeminiSpeechClient gemini, ModelRoutingService routing, GatewayAuditLogger audit) {
    this.gemini = gemini;
    this.routing = routing;
    this.audit = audit;
  }

  public record TranscribeRequest(String audioBase64, String mimeType, String requestId) {}

  public record SynthesizeRequest(String text, String requestId) {}

  @PostMapping(value = "/transcribe", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> transcribe(@RequestBody TranscribeRequest req) {
    String audio = req.audioBase64() == null ? "" : req.audioBase64();
    if (audio.isEmpty() || audio.length() > MAX_AUDIO_BASE64) {
      throw new GatewayException("AUDIO_INVALID", 400, "Audio is empty or longer than about a minute");
    }
    String mime = req.mimeType() == null || req.mimeType().isBlank() ? "audio/webm" : req.mimeType().split(";")[0];
    ModelRoutingService.Route route = route("voice.stt");
    long started = System.nanoTime();
    try {
      String text = gemini.transcribe(route.modelId(), audio, mime);
      long ms = (System.nanoTime() - started) / 1_000_000;
      log(req.requestId(), route, ms, "OK", null, Map.of("audioChars", audio.length(), "mimeType", mime));
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("text", text);
      out.put("model", route.modelId());
      out.put("latencyMs", ms);
      return out;
    } catch (GatewayException e) {
      log(req.requestId(), route, (System.nanoTime() - started) / 1_000_000, e.logStatus(), e.code(), Map.of());
      throw e;
    }
  }

  @PostMapping(value = "/synthesize", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> synthesize(@RequestBody SynthesizeRequest req) {
    String text = req.text() == null ? "" : req.text().trim();
    if (text.isEmpty()) {
      throw new GatewayException("TEXT_INVALID", 400, "Nothing to say");
    }
    if (text.length() > MAX_TTS_CHARS) {
      text = text.substring(0, MAX_TTS_CHARS);
    }
    ModelRoutingService.Route route = route("voice.tts");
    String voice = routing.param("voice.tts", "voice", "Kore");
    long started = System.nanoTime();
    try {
      GeminiSpeechClient.Audio audio = gemini.synthesize(route.modelId(), voice, text);
      long ms = (System.nanoTime() - started) / 1_000_000;
      log(req.requestId(), route, ms, "OK", null, Map.of("textChars", text.length(), "voice", voice));
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("audioBase64", audio.base64());
      out.put("mimeType", audio.mimeType());
      out.put("model", route.modelId());
      out.put("latencyMs", ms);
      return out;
    } catch (GatewayException e) {
      log(req.requestId(), route, (System.nanoTime() - started) / 1_000_000, e.logStatus(), e.code(), Map.of());
      throw e;
    }
  }

  private ModelRoutingService.Route route(String taskKey) {
    ModelRoutingService.Route route = routing.resolveByTaskKey(taskKey)
        .orElseThrow(() -> new GatewayException(GatewayException.ROUTE_NOT_FOUND, 500, "No model_routing row for " + taskKey));
    if (!"GEMINI".equals(route.vendor())) {
      throw new GatewayException(GatewayException.VENDOR_NOT_CONFIGURED, 503, "Voice vendor " + route.vendor() + " is not wired");
    }
    return route;
  }

  private void log(String requestId, ModelRoutingService.Route route, long ms, String status, String error, Map<String, Object> meta) {
    // request_token is unique per call; one voice turn makes an STT and a TTS call.
    String token = (requestId == null ? UUID.randomUUID().toString() : requestId) + ":" + route.taskKey();
    audit.record(new GatewayAuditLogger.Entry(
        token, route.taskKey(), route.taskKey().toUpperCase(), null, route.vendor(), route.modelId(), false,
        null, null, ms, status, error, meta, List.of(),
        "voice.stt".equals(route.taskKey()) ? "VOICE_STT" : "VOICE_TTS"));
  }
}
