package com.karsaaz.studyloop.marking.api;

import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import com.karsaaz.studyloop.marking.application.MarkingQueryService;
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
public class MarkingController {
  private final MarkingQueryService markingQueryService;

  public MarkingController(MarkingQueryService markingQueryService) {
    this.markingQueryService = markingQueryService;
  }

  @GetMapping("/answers/{responseId}/marking")
  @CatalogueRoles(id = "MRK-01", roles = "STU,PAR")
  public Map<String, Object> marking(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID responseId) {
    return markingQueryService.markingView(principal, responseId);
  }

  @GetMapping("/questions/{questionId}/mark-scheme")
  @CatalogueRoles(id = "MRK-02", roles = "STU")
  public Map<String, Object> scheme(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    return markingQueryService.markScheme(principal, questionId);
  }

  @PostMapping("/answers/{responseId}/dispute")
  @CatalogueRoles(id = "MRK-04", roles = "STU")
  public Map<String, Object> dispute(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable UUID responseId,
      @RequestBody Map<String, String> body) {
    return markingQueryService.dispute(principal, responseId, body);
  }

  @GetMapping("/answers/{responseId}/review-status")
  @CatalogueRoles(id = "MRK-05", roles = "STU")
  public Map<String, Object> reviewStatus(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable UUID responseId) {
    return markingQueryService.reviewStatus(principal, responseId);
  }
}
