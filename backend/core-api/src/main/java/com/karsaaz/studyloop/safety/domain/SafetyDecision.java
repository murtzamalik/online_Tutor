package com.karsaaz.studyloop.safety.domain;

import java.util.Locale;
import java.util.Set;

/** Fail-closed safety classifier (scripted templates; no model output on escalate). */
public final class SafetyDecision {
  public enum Action { ALLOW, SCRIPTED_SUPPORT_AND_ESCALATE, BLOCK }

  public record Result(Action action, String severity, String category, String templateId, String scriptedText) {}

  private static final Set<String> CRITICAL = Set.of(
      "kill myself", "suicide", "want to die", "self-harm", "self harm", "cutting myself");
  private static final Set<String> ABUSE = Set.of(
      "hits me", "hurts me at home", "unsafe at home", "touched me", "abuse");
  private static final Set<String> GROOMING = Set.of(
      "secret meeting", "send pictures", "don't tell parents", "dont tell parents");

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
    if (t.contains("bully") || t.contains("bullied")) {
      return new Result(Action.SCRIPTED_SUPPORT_AND_ESCALATE, "MEDIUM", "BULLYING", "SG-T-06", script("SG-T-06"));
    }
    return new Result(Action.ALLOW, "NONE", "NONE", null, null);
  }

  public static String script(String id) {
    return switch (id) {
      case "SG-T-01" -> "Thank you for telling me. I'm an AI tutor, so I'm not the right one to help with this, but it's important that you talk to someone who can. Please tell a trusted adult today — a parent, carer, teacher or someone at school. If you feel unsafe right now, call 999. You can also talk to Childline for free on 0800 1111, any time.";
      case "SG-T-02" -> "I'm really glad you told me. What you've said is important, and you deserve to be safe. Please talk to a trusted adult — a teacher or the person in charge of looking after children at your school. You can also call Childline on 0800 1111 for free. If someone is in danger right now, call 999.";
      case "SG-T-03" -> "Thanks for being honest. If someone is asking you to keep secrets, meet up or share pictures, that's not okay, and it is never your fault. Tell a trusted adult today, or call Childline on 0800 1111. If you are in danger, call 999.";
      case "SG-T-04" -> "Let's pause the lesson for a moment. If something is worrying you, please talk to a trusted adult. When you're ready we can carry on with your revision.";
      case "SG-T-05" -> "It sounds like things feel hard around food. I can't help with that, but a doctor, your school nurse or Beat (0808 801 0677) can. Please talk to a trusted adult.";
      case "SG-T-06" -> "I'm sorry that's happening. It's not your fault. Please tell a teacher or a trusted adult so they can help. You can also talk to Childline on 0800 1111.";
      default -> "Please talk to a trusted adult if you need help.";
    };
  }

  /** Fail closed: unknown / gateway error → block + scripted pause. */
  public static Result failClosed() {
    return new Result(Action.BLOCK, "HIGH", "CLASSIFIER_UNAVAILABLE", "SG-T-04", script("SG-T-04"));
  }
}
