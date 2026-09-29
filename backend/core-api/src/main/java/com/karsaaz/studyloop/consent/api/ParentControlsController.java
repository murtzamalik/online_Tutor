package com.karsaaz.studyloop.consent.api;

import com.karsaaz.studyloop.consent.application.ParentControlsService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ParentControlsController {
  private final ParentControlsService service;

  public ParentControlsController(ParentControlsService service) {
    this.service = service;
  }

  @GetMapping("/students/{studentId}/ai-controls")
  @CatalogueRoles(id = "PCT-01", roles = "PAR")
  public Map<String, Object> getControls(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return service.getAiControls(principal, studentId);
  }

  @PutMapping("/students/{studentId}/ai-controls")
  @CatalogueRoles(id = "PCT-02", roles = "PAR")
  public Map<String, Object> putControls(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return service.putAiControls(principal, studentId, body);
  }

  @GetMapping("/students/{studentId}/ai-usage")
  @CatalogueRoles(id = "PCT-03", roles = "PAR")
  public Map<String, Object> usage(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return service.aiUsage(principal, studentId);
  }

  @GetMapping("/students/{studentId}/privacy")
  @CatalogueRoles(id = "PRV-01", roles = "PAR,STU")
  public Map<String, Object> getPrivacy(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID studentId) {
    return service.getPrivacy(principal, studentId);
  }

  @PutMapping("/students/{studentId}/privacy")
  @CatalogueRoles(id = "PRV-02", roles = "PAR")
  public Map<String, Object> putPrivacy(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID studentId,
      @RequestBody Map<String, Object> body) {
    return service.putPrivacy(principal, studentId, body);
  }
}
