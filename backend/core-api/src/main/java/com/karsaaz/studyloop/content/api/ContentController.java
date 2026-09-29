package com.karsaaz.studyloop.content.api;

import com.karsaaz.studyloop.content.application.ContentService;
import com.karsaaz.studyloop.identity.api.CatalogueRoles;
import com.karsaaz.studyloop.identity.domain.AccountPrincipal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class ContentController {
  private final ContentService contentService;

  public ContentController(ContentService contentService) {
    this.contentService = contentService;
  }

  @GetMapping("/internal/qc/exceptions")
  @CatalogueRoles(id = "CNT-01", roles = "CNT")
  public Map<String, Object> listQc(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", contentService.listQcExceptions(principal));
  }

  @GetMapping("/internal/qc/exceptions/{questionId}")
  @CatalogueRoles(id = "CNT-02", roles = "CNT")
  public Map<String, Object> qcDetail(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    return contentService.qcExceptionDetail(principal, questionId);
  }

  @PutMapping("/internal/questions/{questionId}")
  @CatalogueRoles(id = "CNT-03", roles = "CNT")
  public Map<String, Object> updateQuestion(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long questionId,
      @RequestBody Map<String, Object> body) {
    return contentService.updateQuestion(principal, questionId, body);
  }

  @PostMapping("/internal/qc/exceptions/{questionId}/rerun")
  @CatalogueRoles(id = "CNT-04", roles = "CNT")
  public Map<String, Object> rerun(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    return contentService.rerunQc(principal, questionId);
  }

  @PostMapping("/internal/qc/exceptions/{questionId}/reject")
  @CatalogueRoles(id = "CNT-05", roles = "CNT")
  public void reject(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    contentService.rejectQuestion(principal, questionId);
  }

  @PostMapping("/internal/qc/exceptions/{questionId}/approve")
  @CatalogueRoles(id = "CNT-06", roles = "CNT")
  public void approve(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    contentService.approveQuestion(principal, questionId);
  }

  @PostMapping("/internal/questions")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "CNT-10", roles = "CNT")
  public Map<String, Object> createQuestion(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return contentService.createQuestion(principal, body);
  }

  @GetMapping("/internal/questions")
  @CatalogueRoles(id = "CNT-11", roles = "CNT")
  public Map<String, Object> listQuestions(
      @AuthenticationPrincipal AccountPrincipal principal,
      @RequestParam(required = false) String status) {
    return Map.of("items", contentService.listQuestions(principal, status));
  }

  @PostMapping("/internal/past-papers")
  @ResponseStatus(HttpStatus.CREATED)
  @CatalogueRoles(id = "CNT-12", roles = "CNT")
  public Map<String, Object> registerPaper(
      @AuthenticationPrincipal AccountPrincipal principal, @RequestBody Map<String, Object> body) {
    return contentService.registerPastPaper(principal, body);
  }

  @GetMapping("/internal/past-papers")
  @CatalogueRoles(id = "CNT-13", roles = "CNT")
  public Map<String, Object> listPapers(@AuthenticationPrincipal AccountPrincipal principal) {
    return Map.of("items", contentService.listPastPapers(principal));
  }

  @GetMapping("/internal/past-papers/{paperId}")
  @CatalogueRoles(id = "CNT-14", roles = "CNT")
  public Map<String, Object> getPaper(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long paperId) {
    return contentService.getPastPaper(principal, paperId);
  }

  @PostMapping("/internal/past-papers/{paperId}/ingest")
  @CatalogueRoles(id = "CNT-15", roles = "CNT")
  public Map<String, Object> ingest(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long paperId) {
    return contentService.startIngest(principal, paperId);
  }

  @GetMapping("/internal/past-papers/{paperId}/ingest-status")
  @CatalogueRoles(id = "CNT-16", roles = "CNT")
  public Map<String, Object> ingestStatus(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long paperId) {
    return contentService.ingestStatus(principal, paperId);
  }

  @PatchMapping("/internal/past-papers/{paperId}/licence")
  @CatalogueRoles(id = "CNT-17", roles = "CNT")
  public Map<String, Object> licence(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long paperId,
      @RequestBody Map<String, Object> body) {
    return contentService.patchLicence(principal, paperId, body);
  }

  @PatchMapping("/internal/past-paper-items/{itemId}")
  @CatalogueRoles(id = "CNT-18", roles = "CNT")
  public Map<String, Object> patchItem(
      @AuthenticationPrincipal AccountPrincipal principal,
      @PathVariable long itemId,
      @RequestBody Map<String, Object> body) {
    return contentService.patchPastPaperItem(principal, itemId, body);
  }

  @PostMapping("/internal/past-paper-items/{itemId}/approve")
  @CatalogueRoles(id = "CNT-19", roles = "CNT")
  public Map<String, Object> approveItem(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long itemId) {
    return contentService.approvePastPaperItem(principal, itemId);
  }

  @PostMapping("/internal/questions/{questionId}/retire")
  @CatalogueRoles(id = "CNT-20", roles = "CNT")
  public void retire(
      @AuthenticationPrincipal AccountPrincipal principal, @PathVariable long questionId) {
    contentService.retireQuestion(principal, questionId);
  }
}
