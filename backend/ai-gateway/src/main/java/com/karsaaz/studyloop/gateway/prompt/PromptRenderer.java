package com.karsaaz.studyloop.gateway.prompt;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.error.GatewayException;
import com.karsaaz.studyloop.gateway.schema.SchemaValidator;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Builds the system/user messages for one prompt: shared pack rules + the prompt's own fenced
 * templates + the output schema, with {@code {{var}}} placeholders filled from the request.
 *
 * <p>Any placeholder left unfilled (other than name placeholders that code substitutes after the
 * model returns, D-15) fails the call with {@code PROMPT_VARIABLES_MISSING}.
 */
@Component
public class PromptRenderer {
  private static final Pattern FENCE =
      Pattern.compile(
          "##\\s*(System prompt(?: template)?|User prompt(?: template)?)\\s*\\n+```(?:text)?\\n([\\s\\S]*?)```",
          Pattern.CASE_INSENSITIVE);
  private static final Pattern VAR = Pattern.compile("\\{\\{([a-zA-Z_][a-zA-Z0-9_]*)}}");

  /** Filled in by code after the model returns, never sent with real values (D-15). */
  static final Set<String> POST_RETURN_PLACEHOLDERS = Set.of("child_name", "teacher_name");

  /** Prompt-id prefix → shared rules file of that pack. */
  private static final Map<String, String> SHARED_RULES =
      Map.of(
          "P-MK-", "marking/prompts/00_shared_rules.md",
          "P-TU-", "tutor/prompts/00_shared_rules.md",
          "P-QG-", "question_generation/prompts/00_shared_rules.md",
          "P-IN-", "content_ingestion/prompts/00_shared_rules.md",
          "P-SF-", "safety/prompts/00_shared_rules.md",
          "P-RC-", "revision_content/prompts/00_shared_rules.md",
          "P-RP-", "reporting/prompts/00_shared_rules.md");

  private static final String DEFAULT_SYSTEM =
      "You are an education AI for a UK exam-preparation platform. Return valid JSON only.";

  private final PromptLoader promptLoader;
  private final PromptCatalog catalog;
  private final SchemaValidator schemas;
  private final ObjectMapper mapper;

  public PromptRenderer(
      PromptLoader promptLoader, PromptCatalog catalog, SchemaValidator schemas, ObjectMapper mapper) {
    this.promptLoader = promptLoader;
    this.catalog = catalog;
    this.schemas = schemas;
    this.mapper = mapper;
  }

  /**
   * @param promptVersion LIVE {@code prompt_version.version}, or {@code "repo-file"} when the repo
   *     markdown was used
   * @param schemaPath output schema used for validation, or null when the prompt has none
   */
  public record RenderedPrompt(
      String promptId, String system, String user, String taskKey, String promptVersion, Path schemaPath) {}

  public RenderedPrompt render(String promptId, Map<String, Object> variables) {
    PromptCatalog.Entry entry =
        catalog
            .lookup(promptId)
            .orElseThrow(
                () ->
                    new GatewayException(
                        GatewayException.PROMPT_NOT_FOUND, 400, "Unknown prompt id " + promptId));

    String version = "repo-file";
    String body;
    Optional<PromptLoader.LiveBody> live = promptLoader.liveBody(promptId);
    // A LIVE row must hold a real template (V013 seeded a one-line placeholder for P-MK-01).
    if (live.isPresent() && FENCE.matcher(live.get().body()).find()) {
      body = live.get().body();
      version = live.get().version();
    } else {
      body = readRepoFile(catalog.resolveFile(promptId), promptId);
    }

    String system = null;
    String user = null;
    Matcher m = FENCE.matcher(body);
    while (m.find()) {
      String block = m.group(2).trim();
      if (m.group(1).toLowerCase().startsWith("system")) {
        system = block;
      } else {
        user = block;
      }
    }
    if (user == null) {
      user = body;
    }
    if (system == null) {
      system = DEFAULT_SYSTEM;
    }

    String sharedFile = sharedRulesFor(promptId);
    if (sharedFile != null) {
      Path shared = catalog.promptsRoot().resolve(sharedFile);
      if (Files.isRegularFile(shared)) {
        system = systemBlock(readRepoFile(shared, promptId)) + "\n\n" + system;
      }
    }

    // P-VO-01: voice turns get the spoken-style overlay after the tutor system prompt (channel = VOICE).
    if (promptId.startsWith("P-TU-") && "VOICE".equals(String.valueOf(variables.get("channel")))) {
      Path overlay = catalog.promptsRoot().resolve(VOICE_OVERLAY);
      if (Files.isRegularFile(overlay)) {
        system = system + "\n\n" + spokenOverlay(systemBlock(readRepoFile(overlay, "P-VO-01")));
      }
    }

    Path schemaPath = catalog.resolveSchema(promptId);
    if (schemaPath != null && Files.isRegularFile(schemaPath)) {
      system =
          system
              + "\n\nOUTPUT FORMAT\nReturn exactly one JSON object that matches this JSON schema. "
              + "No markdown fences, no prose before or after it.\n<json_schema>\n"
              + schemas.load(schemaPath).rawText().trim()
              + "\n</json_schema>";
    } else {
      schemaPath = null;
    }

    Set<String> missing = new TreeSet<>();
    String renderedSystem = substitute(system, variables, missing);
    String renderedUser = substitute(user, variables, missing);
    if (!missing.isEmpty()) {
      throw new GatewayException(
          GatewayException.PROMPT_VARIABLES_MISSING,
          400,
          promptId + " is missing variables " + missing);
    }
    return new RenderedPrompt(promptId, renderedSystem, renderedUser, entry.taskKey(), version, schemaPath);
  }

  static final String VOICE_OVERLAY = "voice/prompts/01_spoken_style_overlay.md";

  /**
   * The overlay text without its {@code reply_display} instruction: the tutor_turn schema does not
   * allow that field yet, so asking for it would fail validation. Spoken text goes in reply_text.
   */
  static String spokenOverlay(String overlay) {
    StringBuilder out = new StringBuilder();
    for (String line : overlay.split("\n")) {
      int cut = line.indexOf("; also supply the display form");
      out.append(cut >= 0 ? line.substring(0, cut) + "." : line).append("\n");
    }
    return out.toString().trim() + "\nPut the spoken reply in reply_text and keep every other JSON field as the schema defines.";
  }

  static String sharedRulesFor(String promptId) {
    for (Map.Entry<String, String> e : SHARED_RULES.entrySet()) {
      if (promptId.startsWith(e.getKey()) && !promptId.endsWith("-00")) {
        return e.getValue();
      }
    }
    return null;
  }

  /** The fenced system block of a shared-rules file (falls back to the whole file). */
  static String systemBlock(String markdown) {
    Matcher m = FENCE.matcher(markdown);
    while (m.find()) {
      if (m.group(1).toLowerCase().startsWith("system")) {
        return m.group(2).trim();
      }
    }
    return markdown;
  }

  /**
   * Single pass: values are inserted verbatim and never re-scanned, so learner text containing
   * {@code {{...}}} cannot inject into another placeholder.
   */
  String substitute(String template, Map<String, Object> variables, Set<String> missing) {
    if (template == null) {
      return "";
    }
    Matcher m = VAR.matcher(template);
    StringBuilder out = new StringBuilder();
    while (m.find()) {
      String name = m.group(1);
      Object value = lookup(variables, name);
      String replacement;
      if (value != null) {
        replacement = asText(value);
      } else if (variables != null && hasKey(variables, name)) {
        replacement = "";
      } else {
        if (!POST_RETURN_PLACEHOLDERS.contains(name)) {
          missing.add(name);
        }
        replacement = m.group(0);
      }
      m.appendReplacement(out, Matcher.quoteReplacement(replacement));
    }
    m.appendTail(out);
    return out.toString();
  }

  private static boolean hasKey(Map<String, Object> vars, String name) {
    return vars.containsKey(name)
        || vars.containsKey(snakeToCamel(name))
        || vars.containsKey(camelToSnake(name));
  }

  private static Object lookup(Map<String, Object> vars, String name) {
    if (vars == null) {
      return null;
    }
    Object v = vars.get(name);
    if (v == null) {
      v = vars.get(snakeToCamel(name));
    }
    if (v == null) {
      v = vars.get(camelToSnake(name));
    }
    return v;
  }

  private String asText(Object value) {
    if (value instanceof String s) {
      return s;
    }
    if (value instanceof Map<?, ?> || value instanceof Iterable<?>) {
      try {
        return mapper.writeValueAsString(value);
      } catch (JsonProcessingException e) {
        return String.valueOf(value);
      }
    }
    return String.valueOf(value);
  }

  private static String readRepoFile(Path file, String promptId) {
    if (file == null || !Files.isRegularFile(file)) {
      throw new GatewayException(
          GatewayException.PROMPT_NOT_FOUND, 500, "Prompt file missing for " + promptId);
    }
    try {
      return Files.readString(file);
    } catch (IOException e) {
      throw new GatewayException(
          GatewayException.PROMPT_NOT_FOUND, 500, "Prompt file unreadable for " + promptId, e);
    }
  }

  static String camelToSnake(String s) {
    return s.replaceAll("([a-z])([A-Z])", "$1_$2").toLowerCase();
  }

  static String snakeToCamel(String s) {
    StringBuilder b = new StringBuilder();
    boolean up = false;
    for (char c : s.toCharArray()) {
      if (c == '_') {
        up = true;
      } else if (up) {
        b.append(Character.toUpperCase(c));
        up = false;
      } else {
        b.append(c);
      }
    }
    return b.toString();
  }
}
