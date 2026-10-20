package com.karsaaz.studyloop.safety.api;

import com.karsaaz.studyloop.common.error.AppException;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.safety.application.SafetyService;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class SafetyController {
  private final SafetyService safety;

  public SafetyController(SafetyService safety) {
    this.safety = safety;
  }

  @PostMapping("/internal-svc/safety/classify")
  @CatalogueRoles(id = "SAF-01", roles = "SYS")
  public Map<String, Object> classify(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    // SAF-01 is SYS-only; @CatalogueRoles is documentation, not enforcement.
    if (principal == null || !principal.roles().contains("SYS")) {
      throw AppException.forbidden("System access required");
    }
    return safety.classifyInternal(body);
  }

  @GetMapping("/internal/safety/flags")
  @CatalogueRoles(id = "SAF-02", roles = "DSL,CMP")
  public Map<String, Object> flags(@AuthenticationPrincipal AccountPrincipal principal) {
    return safety.listFlags(principal);
  }

  @GetMapping("/internal/safety/flags/{flagId}")
  @CatalogueRoles(id = "SAF-03", roles = "DSL")
  public Map<String, Object> flag(@AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID flagId) {
    return safety.getFlag(principal, flagId);
  }

  @PostMapping("/internal/safety/flags/{flagId}/triage")
  @CatalogueRoles(id = "SAF-04", roles = "DSL")
  public Map<String, Object> triage(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID flagId,
      @RequestBody Map<String, Object> body) {
    return safety.triage(principal, flagId, body);
  }

  @PostMapping("/internal/safety/flags/{flagId}/escalate")
  @CatalogueRoles(id = "SAF-05", roles = "DSL")
  public Map<String, Object> escalate(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID flagId,
      @RequestBody(required = false) Map<String, Object> body) {
    return safety.escalate(principal, flagId, body == null ? Map.of() : body);
  }

  @GetMapping("/internal/safeguarding/disclosures")
  @CatalogueRoles(id = "SAF-06", roles = "DSL")
  public Map<String, Object> disclosures(@AuthenticationPrincipal AccountPrincipal principal) {
    return safety.listDisclosures(principal);
  }

  @GetMapping("/internal/safeguarding/disclosures/{disclosureId}")
  @CatalogueRoles(id = "SAF-07", roles = "DSL")
  public Map<String, Object> disclosure(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID disclosureId) {
    return safety.getDisclosure(principal, disclosureId);
  }

  @PostMapping("/internal/safeguarding/disclosures/{disclosureId}/actions")
  @CatalogueRoles(id = "SAF-08", roles = "DSL")
  public Map<String, Object> action(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID disclosureId,
      @RequestBody Map<String, Object> body) {
    return safety.addAction(principal, disclosureId, body);
  }

  @PostMapping("/internal/safeguarding/disclosures/{disclosureId}/close")
  @CatalogueRoles(id = "SAF-09", roles = "DSL")
  public Map<String, Object> close(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID disclosureId,
      @RequestBody(required = false) Map<String, Object> body) {
    return safety.closeDisclosure(principal, disclosureId, body == null ? Map.of() : body);
  }

  @GetMapping("/internal/safeguarding/metrics")
  @CatalogueRoles(id = "SAF-10", roles = "DSL,CMP")
  public Map<String, Object> metrics(@AuthenticationPrincipal AccountPrincipal principal) {
    return safety.metrics(principal);
  }
}
