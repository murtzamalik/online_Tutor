package com.karsaaz.studyloop.learning.practice.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.learning.practice.application.PracticeService;
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
public class PracticeController {
  private final PracticeService practiceService;

  public PracticeController(PracticeService practiceService) {
    this.practiceService = practiceService;
  }

  @PostMapping("/practice/sessions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "PRA-01", roles = "STU")
  public Map<String, Object> start(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return practiceService.startSession(principal, body);
  }

  @GetMapping("/practice/sessions/{sessionId}")
  @CatalogueRoles(id = "PRA-02", roles = "STU")
  public Map<String, Object> get(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID sessionId) {
    return practiceService.sessionState(principal, sessionId);
  }

  @GetMapping("/practice/sessions/{sessionId}/next")
  @CatalogueRoles(id = "PRA-03", roles = "STU")
  public Map<String, Object> next(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID sessionId) {
    return practiceService.nextQuestion(principal, sessionId);
  }

  @PostMapping("/practice/sessions/{sessionId}/answers")
  @ResponseStatus(HttpStatus.ACCEPTED)
  @CatalogueRoles(id = "PRA-04", roles = "STU")
  public Map<String, Object> answer(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID sessionId,
      @RequestBody Map<String, Object> body) {
    return practiceService.submitAnswer(principal, sessionId, body);
  }

  @GetMapping("/practice/answers/{responseId}/result")
  @CatalogueRoles(id = "PRA-05", roles = "STU")
  public Map<String, Object> result(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID responseId) {
    return practiceService.pollResult(principal, responseId);
  }

  @PostMapping("/practice/sessions/{sessionId}/hint")
  @CatalogueRoles(id = "PRA-07", roles = "STU")
  public Map<String, Object> hint(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID sessionId,
      @RequestBody Map<String, Object> body) {
    return practiceService.hint(principal, sessionId, body);
  }

  @PostMapping("/practice/sessions/{sessionId}/skip")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @CatalogueRoles(id = "PRA-08", roles = "STU")
  public void skip(@AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID sessionId) {
    practiceService.skip(principal, sessionId);
  }

  @PostMapping("/practice/sessions/{sessionId}/end")
  @CatalogueRoles(id = "PRA-09", roles = "STU")
  public Map<String, Object> end(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID sessionId) {
    return practiceService.endSession(principal, sessionId);
  }
}
