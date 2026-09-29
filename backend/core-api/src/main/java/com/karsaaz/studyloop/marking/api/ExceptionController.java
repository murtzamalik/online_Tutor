package com.karsaaz.studyloop.marking.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.marking.application.ExceptionQueueService;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ExceptionController {
  private final ExceptionQueueService exceptionQueueService;

  public ExceptionController(ExceptionQueueService exceptionQueueService) {
    this.exceptionQueueService = exceptionQueueService;
  }

  @GetMapping("/internal/marking/exceptions")
  @CatalogueRoles(id = "EXC-01", roles = "OPS")
  public Map<String, Object> list(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestParam(required = false) String status) {
    return Map.of("items", exceptionQueueService.list(principal, status));
  }

  @GetMapping("/internal/marking/exceptions/{exceptionId}")
  @CatalogueRoles(id = "EXC-02", roles = "OPS")
  public Map<String, Object> detail(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID exceptionId) {
    return exceptionQueueService.detail(principal, exceptionId);
  }

  @PostMapping("/internal/marking/exceptions/{exceptionId}/claim")
  @CatalogueRoles(id = "EXC-03", roles = "OPS")
  public Map<String, Object> claim(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID exceptionId) {
    return exceptionQueueService.claim(principal, exceptionId);
  }

  @PostMapping("/internal/marking/exceptions/{exceptionId}/resolve")
  @CatalogueRoles(id = "EXC-04", roles = "OPS")
  public Map<String, Object> resolve(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID exceptionId,
      @RequestBody Map<String, Object> body) {
    return exceptionQueueService.resolve(principal, exceptionId, body);
  }

  @GetMapping("/internal/marking/systemic-issues")
  @CatalogueRoles(id = "EXC-05", roles = "CNT,OPS,OWN")
  public Map<String, Object> systemic(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", exceptionQueueService.systemicIssues(principal));
  }
}
