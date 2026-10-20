package com.karsaaz.studyloop.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.gateway.prompt.PromptCatalog;
import com.karsaaz.studyloop.gateway.prompt.PromptLoader;
import com.karsaaz.studyloop.gateway.prompt.PromptRenderer;
import com.karsaaz.studyloop.gateway.schema.SchemaValidator;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.mockito.Mockito;

/** Wires catalog/renderer/validator against the real repo {@code ai_prompts/} folder. */
public final class TestPrompts {
  public static final ObjectMapper MAPPER = new ObjectMapper();

  private TestPrompts() {}

  public static Path promptsRoot() {
    for (Path p : new Path[] {Path.of("../../ai_prompts"), Path.of("ai_prompts"), Path.of("../ai_prompts")}) {
      if (Files.isRegularFile(p.resolve("PROMPT_INDEX.md"))) {
        return p.toAbsolutePath().normalize();
      }
    }
    throw new IllegalStateException("ai_prompts/ not found from " + Path.of("").toAbsolutePath());
  }

  public static PromptCatalog catalog() {
    return new PromptCatalog(promptsRoot().toString());
  }

  public static SchemaValidator validator() {
    return new SchemaValidator(MAPPER);
  }

  public static PromptRenderer renderer() {
    PromptLoader loader = Mockito.mock(PromptLoader.class);
    Mockito.when(loader.liveBody(Mockito.anyString())).thenReturn(Optional.empty());
    return new PromptRenderer(loader, catalog(), validator(), MAPPER);
  }
}
