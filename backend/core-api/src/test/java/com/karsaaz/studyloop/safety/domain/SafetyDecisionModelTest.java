package com.karsaaz.studyloop.safety.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class SafetyDecisionModelTest {
  private static Map<String, Object> verdict(String category, String severity, String action) {
    return Map.of(
        "status", "ok",
        "category", category,
        "severity", severity,
        "confidence", 0.9,
        "evidence", "",
        "recommended_action", action,
        "rationale", "r");
  }

  @Test
  void allowStaysAllow() {
    var r = SafetyDecision.fromModel(verdict("NONE", "NONE", "ALLOW"));
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.ALLOW);
    assertThat(r.scriptedText()).isNull();
  }

  @Test
  void escalationUsesTheCategoryScriptAndCriticalForImmediate() {
    var r = SafetyDecision.fromModel(verdict("SELF_HARM", "IMMEDIATE", "SCRIPTED_SUPPORT_AND_ESCALATE"));
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.SCRIPTED_SUPPORT_AND_ESCALATE);
    assertThat(r.templateId()).isEqualTo("SG-T-01");
    assertThat(r.severity()).isEqualTo("CRITICAL");
  }

  @Test
  void categoryTemplateMapMatchesSafeguardingTemplates() {
    assertThat(SafetyDecision.templateFor("ABUSE_OR_NEGLECT")).isEqualTo("SG-T-02");
    assertThat(SafetyDecision.templateFor("GROOMING_RISK")).isEqualTo("SG-T-03");
    assertThat(SafetyDecision.templateFor("EATING_DISORDER")).isEqualTo("SG-T-05");
    assertThat(SafetyDecision.templateFor("BULLYING")).isEqualTo("SG-T-06");
    assertThat(SafetyDecision.templateFor("EXTREMISM")).isEqualTo("SG-T-04");
  }

  @Test
  void jailbreakIsRedirectedNotEscalated() {
    var r = SafetyDecision.fromModel(verdict("JAILBREAK", "LOW", "BLOCK_AND_REDIRECT"));
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.REDIRECT);
    assertThat(r.scriptedText()).doesNotContain("Childline");
  }

  @Test
  void unknownOrCannotCompleteFailsClosed() {
    assertThat(SafetyDecision.fromModel(verdict("NONE", "NONE", "SOMETHING_NEW")).action())
        .isEqualTo(SafetyDecision.Action.BLOCK);
    assertThat(SafetyDecision.fromModel(Map.of("status", "cannot_complete", "reason", "x")).action())
        .isEqualTo(SafetyDecision.Action.BLOCK);
    assertThat(SafetyDecision.fromModel(null).action()).isEqualTo(SafetyDecision.Action.BLOCK);
  }

  @Test
  void newKeywordsAreCaught() {
    assertThat(SafetyDecision.classify("sometimes I want to end it all").templateId()).isEqualTo("SG-T-01");
    assertThat(SafetyDecision.classify("I have been starving myself").templateId()).isEqualTo("SG-T-05");
  }
}
