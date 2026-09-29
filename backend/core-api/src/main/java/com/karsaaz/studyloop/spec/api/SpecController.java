package com.karsaaz.studyloop.spec.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.spec.application.SpecService;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class SpecController {
  private final SpecService specService;

  public SpecController(SpecService specService) {
    this.specService = specService;
  }

  @GetMapping("/internal/specs")
  @CatalogueRoles(id = "SPC-01", roles = "CNT")
  public Map<String, Object> list(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", specService.listSpecs(principal));
  }

  @PostMapping("/internal/specs")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "SPC-02", roles = "CNT")
  public Map<String, Object> create(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return specService.createSpec(principal, body);
  }

  @GetMapping("/internal/specs/{specificationId}/tree")
  @CatalogueRoles(id = "SPC-03", roles = "CNT")
  public Map<String, Object> tree(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long specificationId) {
    return specService.tree(principal, specificationId);
  }

  @PostMapping("/internal/specs/{specificationId}/topics")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "SPC-04", roles = "CNT")
  public Map<String, Object> addTopic(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long specificationId,
      @RequestBody Map<String, Object> body) {
    return specService.addTopic(principal, specificationId, body);
  }

  @PatchMapping("/internal/topics/{topicId}")
  @CatalogueRoles(id = "SPC-05", roles = "CNT")
  public Map<String, Object> patchTopic(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long topicId,
      @RequestBody Map<String, Object> body) {
    return specService.patchTopic(principal, topicId, body);
  }

  @PostMapping("/internal/specs/{specificationId}/import-document")
  @CatalogueRoles(id = "SPC-06", roles = "CNT")
  public Map<String, Object> importDoc(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long specificationId,
      @RequestBody(required = false) Map<String, Object> body) {
    return specService.importDocument(principal, specificationId, body == null ? Map.of() : body);
  }

  @PostMapping("/internal/topics/{topicId}/decompose")
  @CatalogueRoles(id = "SPC-07", roles = "CNT")
  public Map<String, Object> decompose(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long topicId) {
    return specService.decompose(principal, topicId);
  }

  @GetMapping("/internal/specs/tagging-progress")
  @CatalogueRoles(id = "SPC-08", roles = "CNT")
  public Map<String, Object> tagging(@AuthenticationPrincipal AccountPrincipal principal) {
    return specService.taggingProgress(principal);
  }
}
