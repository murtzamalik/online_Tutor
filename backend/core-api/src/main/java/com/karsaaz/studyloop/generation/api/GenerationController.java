package com.karsaaz.studyloop.generation.api;

import com.karsaaz.studyloop.generation.application.GenerationService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class GenerationController {
  private final GenerationService generationService;

  public GenerationController(GenerationService generationService) {
    this.generationService = generationService;
  }

  @GetMapping("/internal/generation/coverage")
  @CatalogueRoles(id = "GEN-01", roles = "CNT")
  public Map<String, Object> coverage(@AuthenticationPrincipal AccountPrincipal principal) {
    return generationService.coverageSummary(principal);
  }

  @PostMapping("/internal/generation/plan")
  @CatalogueRoles(id = "GEN-02", roles = "CNT,SYS")
  public Map<String, Object> plan(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return generationService.plan(principal, body == null ? Map.of() : body);
  }

  @PostMapping("/internal/generation/runs")
  @CatalogueRoles(id = "GEN-03", roles = "CNT,SYS")
  public Map<String, Object> createRun(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return generationService.createRun(principal, body == null ? Map.of() : body);
  }

  @GetMapping("/internal/generation/runs/{runId}")
  @CatalogueRoles(id = "GEN-04", roles = "CNT")
  public Map<String, Object> getRun(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID runId) {
    return generationService.getRun(principal, runId);
  }
}
