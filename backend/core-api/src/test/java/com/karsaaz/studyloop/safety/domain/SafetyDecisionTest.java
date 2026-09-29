package com.karsaaz.studyloop.safety.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SafetyDecisionTest {
  @Test
  void selfHarmFailsClosedToScriptedEscalate() {
    var r = SafetyDecision.classify("I want to kill myself");
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.SCRIPTED_SUPPORT_AND_ESCALATE);
    assertThat(r.templateId()).isEqualTo("SG-T-01");
    assertThat(r.scriptedText()).contains("Childline");
  }

  @Test
  void emptyInputBlocks() {
    var r = SafetyDecision.classify("  ");
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.BLOCK);
  }

  @Test
  void failClosedHelper() {
    var r = SafetyDecision.failClosed();
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.BLOCK);
    assertThat(r.templateId()).isEqualTo("SG-T-04");
  }

  @Test
  void normalStudyAllowed() {
    var r = SafetyDecision.classify("What is the mole formula for H2O?");
    assertThat(r.action()).isEqualTo(SafetyDecision.Action.ALLOW);
  }
}
