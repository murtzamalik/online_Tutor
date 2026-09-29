package com.karsaaz.studyloop.learning.practice.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.practice.application.DiagnosticService;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class DiagnosticController {
  private final DiagnosticService diagnosticService;

  public DiagnosticController(DiagnosticService diagnosticService) {
    this.diagnosticService = diagnosticService;
  }

  @PostMapping("/diagnostics")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "DIA-01", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return diagnosticService.start(principal, body);
  }

  @GetMapping("/diagnostics/{diagnosticId}/next")
  @CatalogueRoles(id = "DIA-02", roles = "STU")
  public Map<String, Object> next(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID diagnosticId) {
    return diagnosticService.next(principal, diagnosticId);
  }

  @PostMapping("/diagnostics/{diagnosticId}/answers")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @CatalogueRoles(id = "DIA-03", roles = "STU")
  public Map<String, Object> answer(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID diagnosticId,
      @RequestBody Map<String, Object> body) {
    return diagnosticService.answer(principal, diagnosticId, body);
  }

  @GetMapping("/diagnostics/{diagnosticId}/result")
  @CatalogueRoles(id = "DIA-04", roles = "STU,PAR")
  public Map<String, Object> result(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID diagnosticId) {
    return diagnosticService.result(principal, diagnosticId);
  }
}
