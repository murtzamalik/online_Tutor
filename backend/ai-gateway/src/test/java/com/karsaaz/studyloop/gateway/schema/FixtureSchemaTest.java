package com.karsaaz.studyloop.gateway.schema;

import static org.assertj.core.api.Assertions.assertThat;

import com.karsaaz.studyloop.gateway.TestPrompts;
import com.karsaaz.studyloop.gateway.prompt.PromptCatalog;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;

/** Stub fixtures must look exactly like real model output, or stub-mode QA hides contract bugs. */
class FixtureSchemaTest {
  private final PromptCatalog catalog = TestPrompts.catalog();
  private final SchemaValidator validator = TestPrompts.validator();

  @Test
  @SuppressWarnings("unchecked")
  void everyFixtureMatchesItsPromptSchema() throws Exception {
    Path dir = Path.of("src/main/resources/fixtures");
    List<Path> files;
    try (Stream<Path> s = Files.list(dir)) {
      files = s.filter(p -> p.toString().endsWith(".json")).toList();
    }
    assertThat(files).isNotEmpty();
    for (Path f : files) {
      String promptId = f.getFileName().toString().replace(".json", "");
      Path schema = catalog.resolveSchema(promptId);
      assertThat(schema).as("schema for fixture %s", promptId).isNotNull();
      Map<String, Object> output;
      try (InputStream in = Files.newInputStream(f)) {
        output = TestPrompts.MAPPER.readValue(in, Map.class);
      }
      SchemaValidator.Result r = validator.validate(schema, output);
      assertThat(r.valid()).as("%s: %s", promptId, r.errors()).isTrue();
    }
  }

  @Test
  void schemaFailureIsReported() {
    Path schema = catalog.resolveSchema("P-TU-01");
    SchemaValidator.Result r = validator.validate(schema, Map.of("status", "ok", "content", "hi"));
    assertThat(r.valid()).isFalse();
  }

  @Test
  void extraKeysAreTolerated() {
    Path schema = catalog.resolveSchema("P-RP-04");
    SchemaValidator.Result r =
        validator.validate(
            schema, Map.of("status", "ok", "summary", "s", "item_notes", List.of(), "extra", true));
    assertThat(r.valid()).as(r.errors().toString()).isTrue();
  }

  @Test
  void cannotCompleteShapeIsValid() {
    Path schema = catalog.resolveSchema("P-QG-04");
    SchemaValidator.Result r =
        validator.validate(schema, Map.of("status", "cannot_complete", "reason", "no item"));
    assertThat(r.valid()).as(r.errors().toString()).isTrue();
  }
}
