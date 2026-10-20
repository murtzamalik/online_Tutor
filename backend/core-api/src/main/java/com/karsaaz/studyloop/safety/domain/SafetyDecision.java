package com.karsaaz.studyloop.safety.domain;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Fail-closed safety decisions. Keywords are a fast first pass; P-SF-01/02 model verdicts are mapped
 * by {@link #fromModel}. Text shown to the child is always scripted (safeguarding_templates.md), never
 * model output.
 */
public final class SafetyDecision {
  /**
   * ALLOW — continue. REDIRECT — not a welfare concern, but this turn is not answered (fixed redirect
   * text). SCRIPTED_SUPPORT_AND_ESCALATE — safeguarding script + DSL flag. BLOCK — pause (fail closed).
   */
  public enum Action { ALLOW, REDIRECT, SCRIPTED_SUPPORT_AND_ESCALATE, BLOCK }

  public record Result(Action action, String severity, String category, String templateId, String scriptedText) {}

  public static final String REDIRECT_TEMPLATE = "SG-R-01";

  private static final Set<String> CRITICAL = Set.of(
      "kill myself", "suicide", "want to die", "self-harm", "self harm", "cutting myself",
      "end my life", "end it all", "hurt myself", "don't want to be alive", "dont want to be alive",
      "better off dead");
  private static final Set<String> ABUSE = Set.of(
      "hits me", "hurts me at home", "unsafe at home", "not safe at home", "touched me", "abuse");
  private static final Set<String> GROOMING = Set.of(
      "secret meeting", "send pictures", "don't tell parents", "dont tell parents",
      "don't tell my parents", "dont tell my parents");
  private static final Set<String> EATING = Set.of(
      "starving myself", "make myself sick", "making myself sick", "stopped eating");

  private SafetyDecision() {}

  public static Result classify(String text) {
    if (text == null || text.isBlank()) {
      return new Result(Action.BLOCK, "HIGH", "EMPTY", "SG-T-04", script("SG-T-04"));
    }
    String t = text.toLowerCase(Locale.ROOT);
    for (String k : CRITICAL) {
      if (t.contains(k)) {
        return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "CRITICAL", "SELF_HARM", "SG-T-01", script("SG-T-01"));
      }
    }
    for (String k : ABUSE) {
      if (t.contains(k)) {
        return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "HIGH", "ABUSE", "SG-T-02", script("SG-T-02"));
      }
    }
    for (String k : GROOMING) {
      if (t.contains(k)) {
        return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "HIGH", "GROOMING", "SG-T-03", script("SG-T-03"));
      }
    }
    for (String k : EATING) {
      if (t.contains(k)) {
        return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "HIGH", "EATING_DISORDER", "SG-T-05", script("SG-T-05"));
      }
    }
    if (t.contains("bully") || t.contains("bullied")) {
      return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "MEDIUM", "BULLYING", "SG-T-06", script("SG-T-06"));
    }
    return new Result(Action.ALLOW, "NONE", "NONE", null, null);
  }

  /**
   * Maps a schema-validated {@code safety_result} (P-SF-01/02) to a decision. Unknown or malformed
   * verdicts fail closed.
   */
  public static Result fromModel(Map<String, Object> result) {
    if (result == null || "cannot_complete".equalsIgnoreCase(String.valueOf(result.get("status")))) {
      return failClosed();
    }
    String category = String.valueOf(result.getOrDefault("category", "OTHER_CONCERN"));
    String severity = severity(String.valueOf(result.getOrDefault("severity", "HIGH")));
    String recommended = String.valueOf(result.getOrDefault("recommended_action", ""));
    return switch (recommended) {
      case "ALLOW", "ALLOW_AND_LOG" -> new Result(Action.ALLOW, severity, category, null, null);
      case "BLOCK_AND_REDIRECT", "BLOCK_OUTPUT_REGENERATE" ->
          new Result(Action.REDIRECT, severity, category, REDIRECT_TEMPLATE, script(REDIRECT_TEMPLATE));
      case "SCRIPTED_SUPPORT_AND_ESCALATE" -> {
        String template = templateFor(category);
        yield new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, severity, category, template, script(template));
      }
      default -> failClosed();
    };
  }

  /** Category → scripted template, per ai_prompts/safety/safeguarding_templates.md. */
  public static String templateFor(String category) {
    return switch (category) {
      case "SELF_HARM" -> "SG-T-01";
      case "ABUSE_OR_NEGLECT" -> "SG-T-02";
      case "GROOMING_RISK", "SEXUAL_CONTENT" -> "SG-T-03";
      case "EATING_DISORDER" -> "SG-T-05";
      case "BULLYING" -> "SG-T-06";
      default -> "SG-T-04";
    };
  }

  /** Model severity → {@code safety_classification.severity} (IMMEDIATE is stored as CRITICAL). */
  static String severity(String modelSeverity) {
    return switch (modelSeverity) {
      case "IMMEDIATE" -> "CRITICAL";
      case "NONE", "LOW", "MEDIUM", "HIGH" -> modelSeverity;
      default -> "HIGH";
    };
  }

  public static String script(String id) {
    return switch (id) {
      case "SG-T-01" -> "Thank you for telling me. I'm an AI tutor, so I'm not the right one to help with this, but it's important that you talk to someone who can. Please tell a trusted adult today — a parent, carer, teacher or someone at school. If you feel unsafe right now, call 999. You can also talk to Childline for free on 0800 1111, any time.";
      case "SG-T-02" -> "I'm really glad you told me. What you've said is important, and you deserve to be safe. Please talk to a trusted adult — a teacher or the person in charge of looking after children at your school. You can also call Childline on 0800 1111 for free. If someone is in danger right now, call 999.";
      case "SG-T-03" -> "Thanks for being honest. If someone is asking you to keep secrets, meet up or share pictures, that's not okay, and it is never your fault. Tell a trusted adult today, or call Childline on 0800 1111. If you are in danger, call 999.";
      case "SG-T-04" -> "Let's pause the lesson for a moment. If something is worrying you, please talk to a trusted adult. When you're ready we can carry on with your revision.";
      case "SG-T-05" -> "It sounds like things feel hard around food. I can't help with that, but a doctor, your school nurse or Beat (0808 801 0677) can. Please talk to a trusted adult.";
      case "SG-T-06" -> "I'm sorry that's happening. It's not your fault. Please tell a teacher or a trusted adult so they can help. You can also talk to Childline on 0800 1111.";
      // Not a safeguarding script: shown when a turn is off-limits (jailbreak, personal data, unsafe topic).
      case REDIRECT_TEMPLATE -> "I can't help with that here. Let's get back to your revision — which part of the topic would you like to work on?";
      default -> "Please talk to a trusted adult if you need help.";
    };
  }

  /** Fail closed: unknown / gateway error → block + scripted pause. */
  public static Result failClosed() {
    return new Result(Action.BLOCK, "HIGH", "CLASSIFIER_UNAVAILABLE", "SG-T-04", script("SG-T-04"));
  }
}
