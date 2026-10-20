package com.karsaaz.studyloop.gateway.vendor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.karsaaz.studyloop.gateway.TestPrompts;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import com.karsaaz.studyloop.gateway.prompt.PromptRenderer;
import com.karsaaz.studyloop.gateway.route.ModelRoutingService;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LlmRunnerTest {
  private static final String GOOD =
      "{\"status\":\"ok\",\"summary\":\"Focus on weak topics.\",\"item_notes\":[]}";

  private final PromptRenderer.RenderedPrompt prompt =
      TestPrompts.renderer()
          .render("P-RP-04", Map.of("plan_json", "[]", "goal_context", "{}"));

  private final ModelRoutingService.Route route =
      new ModelRoutingService.Route("rp.plan", "LITELLM", "primary", 0.3, "small", "backup", 1024);

  /** Scripted transport: each call pops the next reply (a String) or throws (a VendorCallException). */
  static class ScriptedTransport implements ChatTransport {
    final Deque<Object> script = new ArrayDeque<>();
    final List<String> modelsCalled = new ArrayList<>();

    ScriptedTransport then(Object step) {
      script.add(step);
      return this;
    }

    @Override
    public String vendor() {
      return "LITELLM";
    }

    @Override
    public boolean isConfigured() {
      return true;
    }

    @Override
    public VendorReply complete(
        String model, String system, String user, List<String> images, double temperature, int maxTokens) {
      modelsCalled.add(model);
      Object step = script.pop();
      if (step instanceof VendorCallException e) {
        throw e;
      }
      return new VendorReply((String) step, 100, 20);
    }
  }

  private LlmRunner runner(ScriptedTransport t) {
    return new LlmRunner(List.of(t), TestPrompts.validator(), TestPrompts.MAPPER);
  }

  @Test
  void happyPathReturnsParsedObjectAndUsage() {
    ScriptedTransport t = new ScriptedTransport().then(GOOD);
    LlmRunner.Outcome o = runner(t).run(prompt, route, List.of());
    assertThat(o.result()).containsEntry("summary", "Focus on weak topics.");
    assertThat(o.status()).isEqualTo("OK");
    assertThat(o.model()).isEqualTo("primary");
    assertThat(o.tokensIn()).isEqualTo(100);
  }

  @Test
  void fencedJsonWithProseIsAccepted() {
    ScriptedTransport t = new ScriptedTransport().then("Here you go:\n```json\n" + GOOD + "\n```");
    assertThat(runner(t).run(prompt, route, List.of()).result()).containsKey("summary");
  }

  @Test
  void schemaFailureIsRetriedOnceOnTheSameModel() {
    ScriptedTransport t =
        new ScriptedTransport().then("{\"status\":\"ok\",\"rationale\":\"wrong key\"}").then(GOOD);
    LlmRunner.Outcome o = runner(t).run(prompt, route, List.of());
    assertThat(t.modelsCalled).containsExactly("primary", "primary");
    assertThat(o.status()).isEqualTo("OK");
    assertThat(o.tokensIn()).isEqualTo(200);
  }

  @Test
  void rateLimitMovesToFallbackModel() {
    ScriptedTransport t =
        new ScriptedTransport()
            .then(new ChatTransport.VendorCallException(429, "rate limited", null))
            .then(GOOD);
    LlmRunner.Outcome o = runner(t).run(prompt, route, List.of());
    assertThat(t.modelsCalled).containsExactly("primary", "backup");
    assertThat(o.status()).isEqualTo("FALLBACK_USED");
    assertThat(o.model()).isEqualTo("backup");
  }

  @Test
  void badRequestIsNotRetried() {
    ScriptedTransport t =
        new ScriptedTransport().then(new ChatTransport.VendorCallException(400, "bad request", null));
    assertThatThrownBy(() -> runner(t).run(prompt, route, List.of()))
        .isInstanceOf(GatewayException.class)
        .satisfies(e -> assertThat(((GatewayException) e).code()).isEqualTo(GatewayException.VENDOR_ERROR));
    assertThat(t.modelsCalled).containsExactly("primary");
  }

  @Test
  void persistentlyInvalidOutputFailsWithSchemaFailNeverFabricates() {
    ScriptedTransport t =
        new ScriptedTransport().then("not json").then("{}").then("{\"x\":1}").then("[]");
    assertThatThrownBy(() -> runner(t).run(prompt, route, List.of()))
        .isInstanceOf(GatewayException.class)
        .satisfies(e -> assertThat(((GatewayException) e).code()).isEqualTo(GatewayException.SCHEMA_FAIL));
    assertThat(t.modelsCalled).containsExactly("primary", "primary", "backup", "backup");
  }

  @Test
  void unconfiguredVendorFailsClearly() {
    ChatTransport off =
        new ScriptedTransport() {
          @Override
          public boolean isConfigured() {
            return false;
          }
        };
    LlmRunner r = new LlmRunner(List.of(off), TestPrompts.validator(), TestPrompts.MAPPER);
    assertThatThrownBy(() -> r.run(prompt, route, List.of()))
        .isInstanceOf(GatewayException.class)
        .satisfies(
            e -> assertThat(((GatewayException) e).code()).isEqualTo(GatewayException.VENDOR_NOT_CONFIGURED));
  }
}
