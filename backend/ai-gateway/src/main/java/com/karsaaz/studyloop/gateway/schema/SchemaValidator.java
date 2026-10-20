package com.karsaaz.studyloop.gateway.schema;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Validates model output against the prompt's JSON schema (ai_prompts/&lt;pack&gt;/schemas).
 *
 * <p>{@code additionalProperties:false} is relaxed so harmless extra keys from a model do not fail
 * the call; {@code required}, {@code type}, {@code enum} and {@code const} stay enforced.
 */
@Component
public class SchemaValidator {
  private final ObjectMapper mapper;
  private final JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
  private final Map<Path, Loaded> cache = new ConcurrentHashMap<>();

  public SchemaValidator(ObjectMapper mapper) {
    this.mapper = mapper;
  }

  /** Raw schema text (as written in the repo) and the compiled, relaxed validator. */
  public record Loaded(String rawText, JsonSchema schema) {}

  public record Result(boolean valid, List<String> errors) {
    public static Result ok() {
      return new Result(true, List.of());
    }
  }

  public Loaded load(Path schemaFile) {
    return cache.computeIfAbsent(schemaFile.normalize(), this::compile);
  }

  public Result validate(Path schemaFile, Object output) {
    if (schemaFile == null) {
      return Result.ok();
    }
    JsonNode node = mapper.valueToTree(output);
    Set<ValidationMessage> messages = load(schemaFile).schema().validate(node);
    if (messages.isEmpty()) {
      return Result.ok();
    }
    return new Result(false, messages.stream().map(ValidationMessage::getMessage).limit(10).toList());
  }

  private Loaded compile(Path file) {
    try {
      String raw = Files.readString(file);
      JsonNode node = mapper.readTree(raw);
      if (node instanceof ObjectNode root) {
        // Relative "$id" values like "tutor_turn" are not resolvable URIs without a base.
        root.remove("$id");
        root.remove("$schema");
      }
      relax(node);
      return new Loaded(raw, factory.getSchema(node));
    } catch (IOException e) {
      throw new IllegalStateException("Cannot load schema " + file.getFileName() + ": " + e.getMessage(), e);
    }
  }

  static void relax(JsonNode node) {
    if (node instanceof ObjectNode obj) {
      JsonNode ap = obj.get("additionalProperties");
      if (ap != null && ap.isBoolean() && !ap.booleanValue()) {
        obj.remove("additionalProperties");
      }
      Iterator<JsonNode> children = obj.elements();
      while (children.hasNext()) {
        relax(children.next());
      }
    } else if (node instanceof ArrayNode arr) {
      for (JsonNode child : arr) {
        relax(child);
      }
    }
  }
}
