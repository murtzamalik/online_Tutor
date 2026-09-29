package com.karsaaz.studyloop.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.web.bind.annotation.RestController;

class CatalogueRoleMapTest {
  @Test
  void allControllerRolesMatchCatalogue() throws Exception {
    Path catalogue = locateEndpointsJson();
    ObjectMapper mapper = new ObjectMapper();
    JsonNode root = mapper.readTree(catalogue.toFile());
    Map<String, String> expected = new HashMap<>();
    Iterator<JsonNode> it = root.elements();
    while (it.hasNext()) {
      JsonNode n = it.next();
      expected.put(n.get("id").asText(), n.get("roles").asText());
    }
    Set<String> seen = new HashSet<>();
    ClassPathScanningCandidateComponentProvider scanner =
        new ClassPathScanningCandidateComponentProvider(false);
    scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
    for (var bean : scanner.findCandidateComponents("com.karsaaz.studyloop")) {
      Class<?> clazz = Class.forName(bean.getBeanClassName());
      for (Method m : clazz.getDeclaredMethods()) {
        CatalogueRoles ann = m.getAnnotation(CatalogueRoles.class);
        if (ann == null) {
          continue;
        }
        seen.add(ann.id());
        assertThat(expected)
            .as("endpoint %s declared in catalogue", ann.id())
            .containsKey(ann.id());
        assertThat(expected.get(ann.id()))
            .as("roles for %s on %s", ann.id(), clazz.getSimpleName())
            .isEqualTo(ann.roles());
      }
    }
    assertThat(seen).as("at least auth endpoints annotated").isNotEmpty();
  }

  private Path locateEndpointsJson() {
    Path[] candidates = {
        Path.of("api/endpoints.json"),
        Path.of("../api/endpoints.json"),
        Path.of("../../api/endpoints.json"),
        Path.of("../../../api/endpoints.json")
    };
    for (Path p : candidates) {
      if (Files.isRegularFile(p)) {
        return p.toAbsolutePath().normalize();
      }
    }
    throw new IllegalStateException("api/endpoints.json not found");
  }
}
