package com.karsaaz.studyloop.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.identity.api.AuthController;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogueRoleMapTest {
  @Test
  void authControllerRolesMatchCatalogue() throws Exception {
    Path catalogue = locateEndpointsJson();
    ObjectMapper mapper = new ObjectMapper();
    JsonNode root = mapper.readTree(catalogue.toFile());
    Map<String, String> expected = new HashMap<>();
    Iterator<JsonNode> it = root.elements();
    while (it.hasNext()) {
      JsonNode n = it.next();
      expected.put(n.get("id").asText(), n.get("roles").asText());
    }
    for (Method m : AuthController.class.getDeclaredMethods()) {
      CatalogueRoles ann = m.getAnnotation(CatalogueRoles.class);
      if (ann == null) continue;
      assertThat(expected)
          .as("endpoint %s declared in catalogue", ann.id())
          .containsKey(ann.id());
      assertThat(expected.get(ann.id()))
          .as("roles for %s", ann.id())
          .isEqualTo(ann.roles());
    }
  }

  private Path locateEndpointsJson() {
    Path[] candidates = {
        Path.of("api/endpoints.json"),
        Path.of("../api/endpoints.json"),
        Path.of("../../api/endpoints.json"),
        Path.of("../../../api/endpoints.json")
    };
    for (Path p : candidates) {
      if (Files.isRegularFile(p)) return p.toAbsolutePath().normalize();
    }
    throw new IllegalStateException("api/endpoints.json not found");
  }
}
