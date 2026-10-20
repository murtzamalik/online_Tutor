package com.karsaaz.studyloop.gateway.prompt;

import static org.assertj.core.api.Assertions.assertThat;

import com.karsaaz.studyloop.gateway.TestPrompts;
import java.nio.file.Files;
import org.junit.jupiter.api.Test;

class PromptCatalogTest {

  @Test
  void parsesEveryIndexedPrompt() {
    PromptCatalog catalog = TestPrompts.catalog();
    assertThat(catalog.entries()).hasSize(57);
    assertThat(catalog.lookup("P-TU-01")).get().satisfies(e -> {
      assertThat(e.taskKey()).isEqualTo("tu.turn");
      assertThat(e.relativePath()).isEqualTo("tutor/prompts/01_dialogue_turn.md");
      assertThat(e.schemaPath()).isEqualTo("tutor/schemas/tutor_turn.schema.json");
    });
    assertThat(catalog.lookup("P-MK-00")).get().satisfies(e -> assertThat(e.schemaPath()).isNull());
  }

  @Test
  void everyPromptFileAndSchemaExists() {
    PromptCatalog catalog = TestPrompts.catalog();
    for (PromptCatalog.Entry e : catalog.entries()) {
      assertThat(Files.isRegularFile(catalog.resolveFile(e.promptId())))
          .as("prompt file for %s", e.promptId())
          .isTrue();
      if (e.schemaPath() != null) {
        assertThat(Files.isRegularFile(catalog.resolveSchema(e.promptId())))
            .as("schema for %s", e.promptId())
            .isTrue();
      }
    }
  }

  @Test
  void schemaColumnIsResolvedInsideThePack() {
    PromptCatalog.Entry e =
        PromptCatalog.parseRow(
            "| P-MK-01 | GCSE/iGCSE points marker — Pass A | `marking/prompts/01_points_marker_pass_a.md` | `mk.pass_a` | large | 0 | `schemas/marking_result.schema.json` | US-044 | D-01 | W1 |");
    assertThat(e).isNotNull();
    assertThat(e.schemaPath()).isEqualTo("marking/schemas/marking_result.schema.json");
    assertThat(e.pack()).isEqualTo("marking");
  }
}
