package com.karsaaz.studyloop.catalog.api;

import com.karsaaz.studyloop.catalog.application.CatalogService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
  private final CatalogService catalogService;

  public CatalogController(CatalogService catalogService) {
    this.catalogService = catalogService;
  }

  @GetMapping("/catalog/qualifications")
  @CatalogueRoles(id = "CAT-01", roles = "PUB")
  public Map<String, Object> qualifications() {
    return Map.of("items", catalogService.qualifications());
  }

  @GetMapping("/catalog/boards")
  @CatalogueRoles(id = "CAT-02", roles = "PUB")
  public Map<String, Object> boards(
      @RequestParam(required = false) Long qualificationId,
      @RequestParam(required = false) Long subjectId) {
    return Map.of("items", catalogService.boards(qualificationId, subjectId));
  }

  @GetMapping("/catalog/subjects")
  @CatalogueRoles(id = "CAT-03", roles = "PUB")
  public Map<String, Object> subjects() {
    return Map.of("items", catalogService.subjects());
  }

  @GetMapping("/catalog/specifications")
  @CatalogueRoles(id = "CAT-04", roles = "PUB")
  public Map<String, Object> specifications(
      @RequestParam(required = false) Long qualificationId,
      @RequestParam(required = false) Long boardId,
      @RequestParam(required = false) Long subjectId) {
    return Map.of("items", catalogService.specifications(qualificationId, boardId, subjectId));
  }

  @GetMapping("/catalog/specifications/{specificationId}/topics")
  @CatalogueRoles(id = "CAT-05", roles = "PUB,PAR,STU")
  public Map<String, Object> topics(@PathVariable long specificationId) {
    return Map.of("topics", catalogService.topicTree(specificationId));
  }

  @GetMapping("/catalog/exam-dates")
  @CatalogueRoles(id = "CAT-06", roles = "PUB")
  public Map<String, Object> examDates(@RequestParam(required = false) String region) {
    return Map.of("items", catalogService.examDates(region));
  }

  @GetMapping("/catalog/pricing")
  @CatalogueRoles(id = "CAT-07", roles = "PUB")
  public Map<String, Object> pricing() {
    return Map.of("items", catalogService.pricing());
  }
}
