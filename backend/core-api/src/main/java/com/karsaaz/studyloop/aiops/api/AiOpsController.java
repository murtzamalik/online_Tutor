package com.karsaaz.studyloop.aiops.api;

import com.karsaaz.studyloop.aiops.application.AiOpsService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class AiOpsController {
  private final AiOpsService aiOpsService;

  public AiOpsController(AiOpsService aiOpsService) {
    this.aiOpsService = aiOpsService;
  }

  @GetMapping("/internal/ai/eval/summary")
  @CatalogueRoles(id = "AIO-01", roles = "OWN,AIE")
  public Map<String, Object> summary(@AuthenticationPrincipal AccountPrincipal principal) {
    return aiOpsService.evalSummary(principal);
  }

  @GetMapping("/internal/ai/eval/runs")
  @CatalogueRoles(id = "AIO-02", roles = "AIE,OWN")
  public Map<String, Object> evalRuns(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.listEvalRuns(principal));
  }

  @GetMapping("/internal/ai/eval/runs/{evalId}")
  @CatalogueRoles(id = "AIO-03", roles = "AIE,OWN")
  public Map<String, Object> evalDetail(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID evalId) {
    return aiOpsService.evalDetail(principal, evalId);
  }

  @PostMapping("/internal/ai/eval/runs")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "AIO-04", roles = "AIE")
  public Map<String, Object> createEval(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestBody(required = false) Map<String, Object> body) {
    return aiOpsService.createEvalRun(principal, body == null ? Map.of() : body);
  }

  @GetMapping("/internal/ai/gold-set")
  @CatalogueRoles(id = "AIO-06", roles = "AIE,OWN")
  public Map<String, Object> gold(@AuthenticationPrincipal AccountPrincipal principal) {
    List<Map<String, Object>> items = aiOpsService.listGold(principal);
    return Map.of(
        "items", items,
        "total", items.size(),
        "targetSize", 2000);
  }

  @GetMapping("/internal/ai/gateway-log")
  @CatalogueRoles(id = "AIO-10", roles = "CMP,AIE")
  public Map<String, Object> gatewayLog(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.gatewayLog(principal));
  }

  @GetMapping("/internal/ai/gateway-log/{logId}")
  @CatalogueRoles(id = "AIO-11", roles = "CMP")
  public Map<String, Object> gatewayLogDetail(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID logId) {
    return aiOpsService.gatewayLogDetail(principal, logId);
  }

  @GetMapping("/internal/ai/redactions")
  @CatalogueRoles(id = "AIO-12", roles = "CMP")
  public Map<String, Object> redactions(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.redactions(principal));
  }

  @GetMapping("/internal/ai/boundary-attestation")
  @CatalogueRoles(id = "AIO-13", roles = "CMP")
  public Map<String, Object> boundary(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.boundaryAttestations(principal));
  }

  @GetMapping("/internal/ai/prompts")
  @CatalogueRoles(id = "AIO-20", roles = "AIE")
  public Map<String, Object> prompts(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.listPrompts(principal));
  }

  @GetMapping("/internal/ai/prompts/{promptId}/versions")
  @CatalogueRoles(id = "AIO-21", roles = "AIE")
  public Map<String, Object> promptVersions(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable String promptId) {
    return Map.of("items", aiOpsService.promptVersions(principal, promptId));
  }

  @PostMapping("/internal/ai/prompts/{promptId}/versions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "AIO-22", roles = "AIE")
  public Map<String, Object> createPromptVersion(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable String promptId,
      @RequestBody Map<String, Object> body) {
    return aiOpsService.createPromptVersion(principal, promptId, body);
  }

  @PostMapping("/internal/ai/prompt-versions/{id}/evaluate")
  @CatalogueRoles(id = "AIO-23", roles = "AIE")
  public Map<String, Object> evaluatePrompt(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable("id") UUID versionId) {
    return aiOpsService.evaluatePromptVersion(principal, versionId);
  }

  @PostMapping("/internal/ai/prompt-versions/{id}/promote")
  @CatalogueRoles(id = "AIO-24", roles = "AIE")
  public Map<String, Object> promotePrompt(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable("id") UUID versionId) {
    return aiOpsService.promotePromptVersion(principal, versionId);
  }

  @PostMapping("/internal/ai/prompt-versions/{id}/rollback")
  @CatalogueRoles(id = "AIO-25", roles = "AIE")
  public Map<String, Object> rollbackPrompt(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable("id") UUID versionId) {
    return aiOpsService.rollbackPromptVersion(principal, versionId);
  }

  @GetMapping("/internal/ai/model-routing")
  @CatalogueRoles(id = "AIO-26", roles = "AIE")
  public Map<String, Object> routing(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", aiOpsService.modelRouting(principal));
  }

  @PutMapping("/internal/ai/model-routing/{taskKey}")
  @CatalogueRoles(id = "AIO-27", roles = "AIE")
  public Map<String, Object> putRouting(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable String taskKey,
      @RequestBody Map<String, Object> body) {
    return aiOpsService.putModelRouting(principal, taskKey, body);
  }
}
