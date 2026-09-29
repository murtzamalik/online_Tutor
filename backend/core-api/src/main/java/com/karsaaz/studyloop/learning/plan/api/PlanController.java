package com.karsaaz.studyloop.learning.plan.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.plan.application.PlanService;
import java.util.Map;
import java.util.UUID;
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
public class PlanController {
  private final PlanService planService;

  public PlanController(PlanService planService) {
    this.planService = planService;
  }

  @PostMapping("/students/{studentId}/weekly-plan/generate")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "PLN-01", roles = "STU,PAR")
  public Map<String, Object> generate(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody(required = false) Map<String, Object> body) {
    return planService.generate(principal, studentId, body == null ? Map.of() : body);
  }

  @GetMapping("/students/{studentId}/weekly-plan")
  @CatalogueRoles(id = "PLN-02", roles = "STU,PAR")
  public Map<String, Object> current(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return planService.current(principal, studentId);
  }

  @PatchMapping("/weekly-plan-items/{itemId}")
  @CatalogueRoles(id = "PLN-03", roles = "STU")
  public Map<String, Object> patchItem(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID itemId,
      @RequestBody Map<String, Object> body) {
    return planService.patchItem(principal, itemId, body);
  }
}
