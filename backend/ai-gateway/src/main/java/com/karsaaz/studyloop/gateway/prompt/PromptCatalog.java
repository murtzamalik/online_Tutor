package com.karsaaz.studyloop.gateway.prompt;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Maps prompt IDs to repo file, task key and output schema via {@code ai_prompts/PROMPT_INDEX.md}.
 * The schema used for validation always comes from this index — never from the caller.
 */
@Component
public class PromptCatalog {
  private static final Logger log = LoggerFactory.getLogger(PromptCatalog.class);

  // | ID | Title | `file` | `task` | Tier | Temp | `schema` | ...
  private static final Pattern ROW =
      Pattern.compile(
          "^\\|\\s*(P-[A-Z]+-\\d+[a-z]?)\\s*\\|[^|]*\\|\\s*`([^`]+)`\\s*\\|\\s*`?([^`|\\s]+)`?\\s*\\|"
              + "[^|]*\\|[^|]*\\|\\s*`?([^`|]*?)`?\\s*\\|");

  private final Path promptsRoot;
  private final Map<String, Entry> byId = new HashMap<>();

  /**
   * @param relativePath prompt markdown file, relative to the prompts root
   * @param schemaPath output schema file relative to the prompts root, or null for shared blocks
   */
  public record Entry(String promptId, String relativePath, String taskKey, String schemaPath) {
    public String pack() {
      int slash = relativePath.indexOf('/');
      return slash > 0 ? relativePath.substring(0, slash) : "";
    }
  }

  public PromptCatalog(@Value("${studyloop.gateway.prompts-path}") String promptsPath) {
    this.promptsRoot = Path.of(promptsPath).toAbsolutePath().normalize();
    loadIndex();
  }

  public Optional<Entry> lookup(String promptId) {
    return Optional.ofNullable(byId.get(promptId));
  }

  public Collection<Entry> entries() {
    return Collections.unmodifiableCollection(byId.values());
  }

  public Path promptsRoot() {
    return promptsRoot;
  }

  public Path resolveFile(String promptId) {
    Entry e = byId.get(promptId);
    return e == null ? null : promptsRoot.resolve(e.relativePath()).normalize();
  }

  public Path resolveSchema(String promptId) {
    Entry e = byId.get(promptId);
    if (e == null || e.schemaPath() == null) {
      return null;
    }
    return promptsRoot.resolve(e.schemaPath()).normalize();
  }

  private void loadIndex() {
    Path index = promptsRoot.resolve("PROMPT_INDEX.md");
    if (!Files.isRegularFile(index)) {
      log.error("PROMPT_INDEX.md not found under {} — every prompt will fail with PROMPT_NOT_FOUND", promptsRoot);
      return;
    }
    try {
      for (String line : Files.readAllLines(index)) {
        Entry e = parseRow(line);
        if (e != null) {
          byId.put(e.promptId(), e);
        }
      }
    } catch (IOException e) {
      log.error("Could not read PROMPT_INDEX.md", e);
    }
  }

  static Entry parseRow(String line) {
    Matcher m = ROW.matcher(line);
    if (!m.find()) {
      return null;
    }
    String file = m.group(2).trim();
    String schemaCol = m.group(4) == null ? "" : m.group(4).trim();
    String schemaPath = null;
    if (schemaCol.startsWith("schemas/")) {
      int slash = file.indexOf('/');
      String pack = slash > 0 ? file.substring(0, slash) : "";
      schemaPath = pack.isEmpty() ? schemaCol : pack + "/" + schemaCol;
    }
    return new Entry(m.group(1), file, m.group(3).trim(), schemaPath);
  }
}
