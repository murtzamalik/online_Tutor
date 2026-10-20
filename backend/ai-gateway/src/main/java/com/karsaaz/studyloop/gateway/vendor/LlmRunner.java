package com.karsaaz.studyloop.gateway.vendor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import com.karsaaz.studyloop.gateway.prompt.PromptRenderer.RenderedPrompt;
import com.karsaaz.studyloop.gateway.route.ModelRoutingService.Route;
import com.karsaaz.studyloop.gateway.schema.SchemaValidator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Runs one rendered prompt against the routed model: parse JSON, validate against the prompt's
 * schema, retry once on a bad answer, then try {@code fallback_model_id}. Never fabricates output.
 */
@Component
public class LlmRunner {
  private static final Logger log = LoggerFactory.getLogger(LlmRunner.class);

  private final Map<String, ChatTransport> transports = new HashMap<>();
  private final SchemaValidator schemas;
  private final ObjectMapper mapper;

  public LlmRunner(List<ChatTransport> transports, SchemaValidator schemas, ObjectMapper mapper) {
    for (ChatTransport t : transports) {
      this.transports.put(t.vendor(), t);
    }
    this.schemas = schemas;
    this.mapper = mapper;
  }

  /** {@code status} is the {@code ai_gateway_log.status} value: OK or FALLBACK_USED. */
  public record Outcome(
      Map<String, Object> result,
      String vendor,
      String model,
      String status,
      int tokensIn,
      int tokensOut) {}

  public Outcome run(RenderedPrompt prompt, Route route, List<String> images) {
    String vendor = route.vendor() == null ? "" : route.vendor().toUpperCase();
    ChatTransport transport = transports.get(vendor);
    if (transport == null) {
      throw new GatewayException(
          GatewayException.ROUTE_NOT_FOUND, 500, "No transport for vendor " + vendor + " (" + route.taskKey() + ")");
    }
    if (!transport.isConfigured()) {
      throw new GatewayException(
          GatewayException.VENDOR_NOT_CONFIGURED, 503, vendor + " credentials are not set (" + route.taskKey() + ")");
    }

    Usage usage = new Usage();
    List<String> models = new ArrayList<>();
    models.add(route.modelId());
    if (route.fallbackModelId() != null
        && !route.fallbackModelId().isBlank()
        && !route.fallbackModelId().equals(route.modelId())) {
      models.add(route.fallbackModelId());
    }

    String lastProblem = "no attempt";
    boolean lastWasSchema = false;
    for (int i = 0; i < models.size(); i++) {
      String model = models.get(i);
      // Two tries per model on a bad answer; vendor/network failures move straight to the fallback.
      for (int attempt = 1; attempt <= 2; attempt++) {
        ChatTransport.VendorReply reply;
        try {
          reply =
              transport.complete(
                  model, prompt.system(), prompt.user(), images, route.temperature(), route.maxTokens());
        } catch (ChatTransport.VendorCallException e) {
          log.warn("{} {} failed: {}", prompt.promptId(), model, e.getMessage());
          lastProblem = e.getMessage();
          lastWasSchema = false;
          if (!e.fallbackEligible()) {
            throw new GatewayException(GatewayException.VENDOR_ERROR, 502, e.getMessage(), e);
          }
          break;
        }
        usage.add(reply);
        Map<String, Object> parsed = parseObject(reply.text());
        if (parsed == null) {
          lastProblem = "model output is not a JSON object";
          lastWasSchema = true;
          log.warn("{} {} attempt {}: {}", prompt.promptId(), model, attempt, lastProblem);
          continue;
        }
        SchemaValidator.Result check = schemas.validate(prompt.schemaPath(), parsed);
        if (!check.valid()) {
          lastProblem = "schema: " + check.errors();
          lastWasSchema = true;
          log.warn("{} {} attempt {} failed {}", prompt.promptId(), model, attempt, lastProblem);
          continue;
        }
        return new Outcome(parsed, vendor, model, i == 0 ? "OK" : "FALLBACK_USED", usage.in, usage.out);
      }
    }
    if (lastWasSchema) {
      throw new GatewayException(
          GatewayException.SCHEMA_FAIL, 502, prompt.promptId() + " output invalid after retries: " + lastProblem);
    }
    throw new GatewayException(
        GatewayException.VENDOR_ERROR, 502, prompt.promptId() + " vendor failed: " + lastProblem);
  }

  /** Accepts bare JSON, fenced JSON, or JSON wrapped in stray prose. */
  @SuppressWarnings("unchecked")
  Map<String, Object> parseObject(String text) {
    if (text == null) {
      return null;
    }
    String payload = text.trim();
    if (payload.startsWith("```")) {
      int firstNl = payload.indexOf('\n');
      int lastFence = payload.lastIndexOf("```");
      if (firstNl > 0 && lastFence > firstNl) {
        payload = payload.substring(firstNl + 1, lastFence).trim();
      }
    }
    int start = payload.indexOf('{');
    int end = payload.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return null;
    }
    try {
      Object parsed = mapper.readValue(payload.substring(start, end + 1), Object.class);
      return parsed instanceof Map<?, ?> m ? new HashMap<>((Map<String, Object>) m) : null;
    } catch (Exception e) {
      return null;
    }
  }

  private static final class Usage {
    int in;
    int out;

    void add(ChatTransport.VendorReply r) {
      in += r.tokensIn() == null ? 0 : r.tokensIn();
      out += r.tokensOut() == null ? 0 : r.tokensOut();
    }
  }
}
