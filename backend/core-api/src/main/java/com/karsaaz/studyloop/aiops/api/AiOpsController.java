package com.karsaaz.studyloop.aiops.api;

import com.karsaaz.studyloop.aiops.application.AiOpsService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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
}
