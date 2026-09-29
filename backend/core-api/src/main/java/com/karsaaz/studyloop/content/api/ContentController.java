package com.karsaaz.studyloop.content.api;

import com.karsaaz.studyloop.content.application.ContentService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ContentController {
  private final ContentService contentService;

  public ContentController(ContentService contentService) {
    this.contentService = contentService;
  }

  @PostMapping("/internal/qc/exceptions/{questionId}/approve")
  @CatalogueRoles(id = "CNT-06", roles = "CNT")
  public void approve(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    contentService.approveQuestion(principal, questionId);
  }
}
