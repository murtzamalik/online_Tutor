package com.karsaaz.studyloop.gateway.redact;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RedactionPipelineTest {
  private final RedactionPipeline pipeline = new RedactionPipeline();

  @Test
  void redactsNestedValuesAndRecordsKind() {
    RedactionPipeline.Result r =
        pipeline.redact(
            Map.of(
                "student_message", "email me at kid@example.com",
                "session_context", Map.of("note", "call 07123 456789")));
    assertThat(r.variables().get("student_message")).isEqualTo("email me at [REDACTED_EMAIL]");
    assertThat(r.variables().get("session_context").toString()).contains("[REDACTED_PHONE]");
    assertThat(r.events())
        .extracting(RedactionPipeline.Event::kind)
        .containsExactlyInAnyOrder("EMAIL", "PHONE");
  }

  @Test
  void imagesAreNeverAltered() {
    String b64 = "/9j/4AAQ0712345678901234";
    RedactionPipeline.Result r = pipeline.redact(Map.of("image_base64", b64, "images_base64", List.of(b64)));
    assertThat(r.variables().get("image_base64")).isEqualTo(b64);
    assertThat(r.variables().get("images_base64")).isEqualTo(List.of(b64));
    assertThat(r.events()).isEmpty();
  }

  @Test
  void chemistryIsLeftAlone() {
    RedactionPipeline.Result r = pipeline.redact(Map.of("student_answer", "NH3 + HCl -> NH4Cl, Mr = 53.5"));
    assertThat(r.variables().get("student_answer")).isEqualTo("NH3 + HCl -> NH4Cl, Mr = 53.5");
  }
}
