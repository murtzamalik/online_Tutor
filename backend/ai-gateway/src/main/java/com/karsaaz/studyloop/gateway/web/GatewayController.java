package com.karsaaz.studyloop.gateway.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.audit.GatewayAuditLogger;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import com.karsaaz.studyloop.gateway.prompt.PromptCatalog;
import com.karsaaz.studyloop.gateway.prompt.PromptRenderer;
import com.karsaaz.studyloop.gateway.redact.RedactionPipeline;
import com.karsaaz.studyloop.gateway.route.ModelRoutingService;
import com.karsaaz.studyloop.gateway.stub.StubVendorClient;
import com.karsaaz.studyloop.gateway.vendor.LlmRunner;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Single AI entry point (D-15). Response envelope:
 * {@code {status, promptId, promptVersion, vendor, model, taskKey, fallbackUsed, usage, result}} where
 * {@code result} is the model's JSON object exactly as validated against the prompt schema.
 */
@RestController
@RequestMapping("/gateway/v1")
public class GatewayController {
  private final RedactionPipeline redactionPipeline;
  private final StubVendorClient stubVendorClient;
  private final LlmRunner llmRunner;
  private final PromptRenderer promptRenderer;
  private final PromptCatalog promptCatalog;
  private final ModelRoutingService routing;
  private final GatewayAuditLogger audit;
  private final ObjectMapper objectMapper;
  private final boolean stub;
  private final String embeddingUrl;
  private final HttpClient http =
      HttpClient.newBuilder()
          .version(HttpClient.Version.HTTP_1_1)
          .connectTimeout(Duration.ofSeconds(5))
          .build();

  public GatewayController(
      RedactionPipeline redactionPipeline,
      StubVendorClient stubVendorClient,
      LlmRunner llmRunner,
      PromptRenderer promptRenderer,
      PromptCatalog promptCatalog,
      ModelRoutingService routing,
      GatewayAuditLogger audit,
      ObjectMapper objectMapper,
      @Value("${studyloop.gateway.stub:true}") boolean stub,
      @Value("${studyloop.gateway.embedding-url}") String embeddingUrl) {
    this.redactionPipeline = redactionPipeline;
    this.stubVendorClient = stubVendorClient;
    this.llmRunner = llmRunner;
    this.promptRenderer = promptRenderer;
    this.promptCatalog = promptCatalog;
    this.routing = routing;
    this.audit = audit;
    this.objectMapper = objectMapper;
    this.stub = stub;
    this.embeddingUrl = embeddingUrl.replaceAll("/$", "");
  }

  /** {@code schemaRef} is accepted for compatibility but ignored: the schema comes from PROMPT_INDEX. */
  public record RunRequest(
      @NotBlank String promptId,
      Map<String, Object> variables,
      String schemaRef,
      @NotBlank String requestId) {}

  public record EmbedRequest(List<String> texts, String requestId) {}

  @PostMapping(value = "/run", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<String, Object> run(@Valid @RequestBody RunRequest req) {
    long started = System.nanoTime();
    var redacted = redactionPipeline.redact(req.variables() == null ? Map.of() : req.variables());
    List<String> images = images(redacted.variables());
    String taskKey =
        promptCatalog.lookup(req.promptId()).map(PromptCatalog.Entry::taskKey).orElse(req.promptId());
    String promptVersion = null;
    String vendor = stub ? "STUB" : null;
    String model = null;
    try {
      PromptRenderer.RenderedPrompt prompt = promptRenderer.render(req.promptId(), redacted.variables());
      promptVersion = prompt.promptVersion();
      Map<String, Object> result;
      String status = "OK";
      int tokensIn = 0;
      int tokensOut = 0;
      if (stub) {
        result = stubVendorClient.run(req.promptId(), redacted.variables());
        model = "stub-fixture";
      } else {
        ModelRoutingService.Route route =
            routing
                .resolveByTaskKey(prompt.taskKey())
                .orElseThrow(
                    () ->
                        new GatewayException(
                            GatewayException.ROUTE_NOT_FOUND,
                            500,
                            "No model_routing row for task " + prompt.taskKey()));
        vendor = route.vendor();
        LlmRunner.Outcome outcome = llmRunner.run(prompt, route, images);
        result = outcome.result();
        vendor = outcome.vendor();
        model = outcome.model();
        status = outcome.status();
        tokensIn = outcome.tokensIn();
        tokensOut = outcome.tokensOut();
      }
      long latencyMs = (System.nanoTime() - started) / 1_000_000;
      audit.record(
          new GatewayAuditLogger.Entry(
              req.requestId(), taskKey, req.promptId(), promptVersion, vendor, model, !images.isEmpty(),
              tokensIn, tokensOut, latencyMs, status, null, redacted.variables(), redacted.events()));

      Map<String, Object> envelope = new LinkedHashMap<>();
      envelope.put("status", "ok");
      envelope.put("promptId", req.promptId());
      envelope.put("promptVersion", promptVersion);
      envelope.put("vendor", vendor);
      envelope.put("model", model);
      envelope.put("taskKey", taskKey);
      envelope.put("fallbackUsed", "FALLBACK_USED".equals(status));
      envelope.put(
          "usage", Map.of("tokensIn", tokensIn, "tokensOut", tokensOut, "latencyMs", latencyMs));
      envelope.put("result", result);
      return envelope;
    } catch (GatewayException e) {
      audit.record(
          new GatewayAuditLogger.Entry(
              req.requestId(), taskKey, req.promptId(), promptVersion, vendor, model, !images.isEmpty(),
              null, null, (System.nanoTime() - started) / 1_000_000, e.logStatus(), e.code(),
              redacted.variables(), redacted.events()));
      throw e;
    }
  }

  @PostMapping(value = "/embed", consumes = MediaType.APPLICATION_JSON_VALUE)
  public Map<?, ?> embed(@RequestBody EmbedRequest req) {
    try {
      Map<String, Object> payload = new HashMap<>();
      payload.put("texts", req.texts() == null ? List.of() : req.texts());
      HttpRequest httpReq =
          HttpRequest.newBuilder(URI.create(embeddingUrl + "/embed"))
              .timeout(Duration.ofSeconds(60))
              .header("Content-Type", MediaType.APPLICATION_JSON_VALUE)
              .POST(HttpRequest.BodyPublishers.ofByteArray(objectMapper.writeValueAsBytes(payload)))
              .build();
      HttpResponse<String> resp = http.send(httpReq, HttpResponse.BodyHandlers.ofString());
      if (resp.statusCode() >= 300) {
        throw new GatewayException(
            GatewayException.VENDOR_ERROR, 502, "Embedding service HTTP " + resp.statusCode());
      }
      return objectMapper.readValue(resp.body(), Map.class);
    } catch (GatewayException e) {
      throw e;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Embedding call interrupted", e);
    } catch (Exception e) {
      throw new GatewayException(GatewayException.VENDOR_ERROR, 502, "Embedding service unreachable", e);
    }
  }

  private static List<String> images(Map<String, Object> vars) {
    List<String> out = new ArrayList<>();
    Object multi = vars.get("images_base64");
    if (multi instanceof List<?> list) {
      for (Object o : list) {
        if (o != null && !String.valueOf(o).isBlank()) {
          out.add(String.valueOf(o));
        }
      }
    }
    Object single = vars.get("image_base64");
    if (single != null && !String.valueOf(single).isBlank()) {
      out.add(String.valueOf(single));
    }
    return out;
  }
}
