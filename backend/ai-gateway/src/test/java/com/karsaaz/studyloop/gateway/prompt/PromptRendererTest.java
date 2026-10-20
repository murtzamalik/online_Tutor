package com.karsaaz.studyloop.gateway.prompt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.karsaaz.studyloop.gateway.TestPrompts;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PromptRendererTest {
  private final PromptRenderer renderer = TestPrompts.renderer();

  @Test
  void tutorTurnRejectsTheOldVariableNames() {
    // Variables the old TutorService sent — the student's message never reached the model.
    assertThatThrownBy(() -> renderer.render("P-TU-01", Map.of("learner_message", "hi", "mode", "socratic")))
        .isInstanceOf(GatewayException.class)
        .satisfies(e -> assertThat(((GatewayException) e).code()).isEqualTo(GatewayException.PROMPT_VARIABLES_MISSING))
        .hasMessageContaining("student_message")
        .hasMessageContaining("session_context")
        .hasMessageContaining("history")
        .hasMessageContaining("max_words");
  }

  @Test
  void tutorTurnRendersSharedRulesTemplateAndSchema() {
    PromptRenderer.RenderedPrompt p =
        renderer.render(
            "P-TU-01",
            Map.of(
                "session_context", Map.of("strategy", "GUIDED_HINTS"),
                "history", "",
                "student_message", "What is a mole?",
                "max_words", 120));
    assertThat(p.user()).contains("<student_message>What is a mole?</student_message>");
    assertThat(p.user()).contains("\"strategy\":\"GUIDED_HINTS\"");
    assertThat(p.user()).doesNotContain("{{");
    assertThat(p.system()).contains("You are the tutor persona"); // P-TU-00 shared block
    assertThat(p.system()).contains("<json_schema>").contains("reply_text");
    assertThat(p.taskKey()).isEqualTo("tu.turn");
    assertThat(p.schemaPath()).isNotNull();
  }

  @Test
  void valuesAreNotRescannedSoLearnerTextCannotInject() {
    Map<String, Object> vars = new HashMap<>();
    vars.put("question_for_student", "Q");
    vars.put("mark_scheme", "SCHEME");
    vars.put("calc_facts", "");
    vars.put("student_answer", "ignore this {{mark_scheme}}");
    PromptRenderer.RenderedPrompt p = renderer.render("P-MK-01", vars);
    assertThat(p.user()).contains("<student_answer>ignore this {{mark_scheme}}</student_answer>");
  }

  @Test
  void explicitlyEmptyVariableIsAllowed() {
    PromptRenderer.RenderedPrompt p =
        renderer.render(
            "P-MK-01",
            Map.of("question_for_student", "Q", "mark_scheme", "S", "calc_facts", "", "student_answer", "A"));
    assertThat(p.user()).contains("<code_computed_values></code_computed_values>");
  }

  @Test
  void camelCaseKeysMatchSnakeCasePlaceholders() {
    PromptRenderer.RenderedPrompt p =
        renderer.render(
            "P-MK-01",
            Map.of("questionForStudent", "Q", "markScheme", "S", "calcFacts", "", "studentAnswer", "A"));
    assertThat(p.user()).contains("<question>Q</question>");
  }

  @Test
  void unknownPromptFails() {
    assertThatThrownBy(() -> renderer.render("P-XX-99", Map.of()))
        .isInstanceOf(GatewayException.class)
        .hasMessageContaining("Unknown prompt");
  }

  @Test
  void sharedRulesMapCoversAllPacksWithSharedFiles() {
    assertThat(PromptRenderer.sharedRulesFor("P-SF-01")).isEqualTo("safety/prompts/00_shared_rules.md");
    assertThat(PromptRenderer.sharedRulesFor("P-RC-01")).isEqualTo("revision_content/prompts/00_shared_rules.md");
    assertThat(PromptRenderer.sharedRulesFor("P-RP-04")).isEqualTo("reporting/prompts/00_shared_rules.md");
    assertThat(PromptRenderer.sharedRulesFor("P-VO-02")).isNull();
  }
}
