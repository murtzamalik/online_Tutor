package com.karsaaz.studyloop.learning.entrance.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.entrance.application.EntranceTestService;
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
public class EntranceTestController {
  private final EntranceTestService entrance;

  public EntranceTestController(EntranceTestService entrance) {
    this.entrance = entrance;
  }

  @PostMapping("/entrance-tests")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "ENT-01", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return entrance.start(principal, body);
  }

  @GetMapping("/entrance-tests/{runId}/next")
  @CatalogueRoles(id = "ENT-02", roles = "STU")
  public Map<String, Object> next(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID runId) {
    return entrance.next(principal, runId);
  }

  @PostMapping("/entrance-tests/{runId}/answers")
  @CatalogueRoles(id = "ENT-03", roles = "STU")
  public Map<String, Object> answer(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID runId,
      @RequestBody Map<String, Object> body) {
    return entrance.answer(principal, runId, body);
  }

  @GetMapping("/entrance-tests/{runId}/result")
  @CatalogueRoles(id = "ENT-04", roles = "STU,PAR")
  public Map<String, Object> result(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID runId) {
    return entrance.result(principal, runId);
  }
}
